import os, sys
os.environ["ADMIN_API_KEY"]="s3cret-key"
os.environ.pop("ALLOW_INSECURE_DEV",None)
import pathlib; ROOT=pathlib.Path(__file__).resolve().parent.parent; os.chdir(ROOT); sys.path.insert(0,str(ROOT))
import mongomock
import backend.database as database
mc=mongomock.MongoClient(); database.client=mc; database.db=mc["t"]
import backend.main as m
import backend.knowledge_base as kb
from fastapi.testclient import TestClient
c=TestClient(m.app)
H={"X-API-Key":"s3cret-key"}
ok=0; bad=0
def check(name,cond,extra=""):
    global ok,bad
    if cond: ok+=1; print("PASS",name)
    else: bad+=1; print("FAIL",name,extra)

# --- legacy docs (as inserted by the OLD code: no approved flag) -----------
db=database.db
db["knowledge_articles"].insert_one({"article_id":"KB-1007","title":"Payroll Application Troubleshooting","content":"x"*30,"tags":["payroll"]})
db["knowledge_articles"].insert_one({"article_id":"SOP-NET-014-VPN-Client-Resolution","title":"dup","content":"x"*30,"approved":True,"category":"Network & VPN"})
n=kb.seed_sample_articles()
approved={d["article_id"] for d in db["knowledge_articles"].find({"approved":True})}
check("all 15 sample articles approved (incl. repaired legacy KB-1007)", {f"KB-10{i:02d}" for i in range(1,16)}<=approved, sorted({f'KB-10{i:02d}' for i in range(1,16)}-approved))
check("KB-1007 now has a category", db["knowledge_articles"].find_one({"article_id":"KB-1007"}).get("category")=="Software")

# --- seed_knowledge dedupe -------------------------------------------------
import backend.seed_knowledge as sk
sk.connect_to_mongodb=lambda: db
sk.close_mongodb=lambda: None
sk.ensure_indexes=lambda: None
sk.main()
ids=[d["article_id"] for d in db["knowledge_articles"].find({})]
check("no duplicate by filename after seeding", not any(i.startswith("SOP-") for i in ids), [i for i in ids if i.startswith("SOP-")])
check("KB-1001 content replaced from SOP file", "Category:" in db["knowledge_articles"].find_one({"article_id":"KB-1001"})["content"])

# --- retrieval of the 4 formerly invisible articles ------------------------
for q,expect in [("printer not responding","KB-1009"),("payroll application crashing","KB-1007"),("laptop screen flickering horizontal lines","KB-1008"),("mfa push notification authenticator","KB-1010")]:
    r=c.get("/api/knowledge/search",params={"q":q}).json()
    got=[i["article_id"] for i in r["items"]]
    check(f"search '{q}' finds {expect}", expect in got, got)
check("search total matches items", r["total"]==len(r["items"]))

# --- category normalisation -------------------------------------------------
r=c.get("/api/knowledge/articles",params={"category":"Network and VPN"}).json()
check("category 'Network and VPN' matches 'Network & VPN'+'Network & Connectivity' articles", {"KB-1001","KB-1004"}<={i["article_id"] for i in r["items"]}, [i["article_id"] for i in r["items"]])

# --- auth -------------------------------------------------------------------
art={"title":"Test Article","content":"c"*40,"approved":True,"article_id":"KB-9001"}
check("ingest without key -> 401", c.post("/api/knowledge/ingest",json=art).status_code==401)
check("ingest wrong key -> 401", c.post("/api/knowledge/ingest",json=art,headers={"X-API-Key":"nope"}).status_code==401)
check("ingest right key -> 201", c.post("/api/knowledge/ingest",json=art,headers=H).status_code==201)
check("rebuild without key -> 401", c.post("/api/knowledge/rebuild").status_code==401)
check("rebuild with key -> 200", c.post("/api/knowledge/rebuild",headers=H).status_code==200)
check("PATCH incident without key -> 401", c.patch("/api/incidents/INC-X",json={"status":"Closed"}).status_code==401)
check("audit POST without key -> 401", c.post("/api/audit-logs",json={"automatedAction":"x"}).status_code==401)
check("public incident create still open", c.post("/api/incidents",json={"title":"VPN down","description":"cannot connect"}).status_code==201)
check("public GET still open", c.get("/api/incidents").status_code==200)
os.environ.pop("ADMIN_API_KEY")
check("no ADMIN_API_KEY configured -> 503 (secure default)", c.post("/api/knowledge/rebuild",headers=H).status_code==503)
os.environ["ALLOW_INSECURE_DEV"]="true"
check("ALLOW_INSECURE_DEV=true -> allowed", c.post("/api/knowledge/rebuild").status_code==200)
os.environ.pop("ALLOW_INSECURE_DEV"); os.environ["ADMIN_API_KEY"]="s3cret-key"

# --- validation caps --------------------------------------------------------
check("article id with spaces -> 422", c.post("/api/knowledge/ingest",json={**art,"article_id":"bad id!"},headers=H).status_code==422)
check("100 tags -> 422", c.post("/api/knowledge/ingest",json={**art,"tags":["t"]*100},headers=H).status_code==422)
check("huge clarification dict -> 422", c.post("/api/triage",json={"text":"vpn down","clarification_answers":{str(i):"a" for i in range(50)}}).status_code==422)
check("bad email -> 422", c.post("/api/incidents",json={"title":"abc","description":"abcdef","requester_email":"not-an-email"}).status_code==422)

# --- audit log forging -------------------------------------------------------
r=c.post("/api/audit-logs",json={"automatedAction":"Fake","isSimulated":False,"timestamp":"1999-01-01"},headers=H).json()["log"]
check("audit: client timestamp ignored", r["timestamp"].startswith("20"), r["timestamp"])
check("audit: isSimulated forced True", r["isSimulated"] is True)

# --- simulate: server decides ------------------------------------------------
def sim(**kw):
    base={"ticketId":"INC-T1"}; base.update(kw); return c.post("/api/auto-resolution/simulate",json=base).json()
wifi=sim(scenarioName="Wi-Fi Connectivity Issue",issue="Employee cannot connect to the office Wi-Fi network (CORP-SECURE) on laptop workstation.",matchedKnowledgeArticleId="KB-1004",isEligibleForAutoRemediation=True,riskLevel="Low")
check("safe Wi-Fi scenario still completes", wifi["executionStatus"]=="Success" and not wifi["escalated"], wifi.get("escalationReason"))
vpn=sim(scenarioName="VPN Connection Issue",issue="Employee cannot connect to the company VPN (GlobalProtect tunnel drops with TLS handshake timeout).",matchedKnowledgeArticleId="KB-1001",isEligibleForAutoRemediation=True,riskLevel="Low")
check("safe VPN scenario still completes", vpn["executionStatus"]=="Success", vpn.get("escalationReason"))
out=sim(scenarioName="Critical Infrastructure Outage",issue="Production database is down, major outage.",matchedKnowledgeArticleId="KB-1006",isEligibleForAutoRemediation=True,riskLevel="Low",retrievalSimilarityPercent=99)
check("SPOOFED eligible+Low+99% on an outage is still blocked", out["escalated"] and out["executionStatus"]=="Failed", out)
pw=sim(scenarioName="Expired Password",issue="password expired and account locked out",matchedKnowledgeArticleId="KB-1002",isEligibleForAutoRemediation=True,riskLevel="Low")
check("SPOOFED eligible password-reset is blocked", pw["escalated"])
fake=sim(scenarioName="Wi-Fi",issue="wifi connectivity cannot connect",matchedKnowledgeArticleId="KB-DOES-NOT-EXIST",retrievalSimilarityPercent=99,isEligibleForAutoRemediation=True)
check("nonexistent article + fake 99% score is blocked", fake["escalated"])
tight=sim(scenarioName="Wi-Fi Connectivity Issue",issue="Employee cannot connect to the office Wi-Fi network (CORP-SECURE)",matchedKnowledgeArticleId="KB-1004",isEligibleForAutoRemediation=False)
check("client can still tighten (eligible=false blocks)", tight["escalated"])
# stored P1 ticket blocks even when the client text looks harmless
inc=c.post("/api/incidents",json={"title":"Wifi flaky","description":"wifi cannot connect","priority":"P1 - Critical"}).json()["incident"]["incident_id"]
p1=sim(ticketId=inc,scenarioName="Wi-Fi",issue="Employee cannot connect to the office Wi-Fi network",matchedKnowledgeArticleId="KB-1004",isEligibleForAutoRemediation=True)
check("stored P1 ticket blocks auto-resolution", p1["escalated"])

# --- approve requires a prior simulation ---------------------------------------
check("approve with no prior simulation -> 409", c.post("/api/auto-resolution/approve",json={"ticketId":"INC-NEVER","approverName":"Bob"},headers=H).status_code==409)
check("approve after simulation -> 200", c.post("/api/auto-resolution/approve",json={"ticketId":"INC-T1","approverName":"Bob"},headers=H).status_code==200)
check("approve without key -> 401", c.post("/api/auto-resolution/approve",json={"ticketId":"INC-T1","approverName":"Bob"}).status_code==401)

# --- triage helpers + dead code ---------------------------------------------
check("'lesson' no longer matches sso", not m._has_any_word("the lesson plan",["sso"]))
check("'sso' alone still matches", m._has_any_word("login via sso fails",["sso"]))
check("'happen' no longer matches app", not m._has_any_word("what will happen",["app"]))
check("negated scope: 'not everyone'", not m.mentions_company_wide("vpn fails for me but not everyone is affected"))
check("negated scope: 'only me, not all users'", not m.mentions_company_wide("only me, not all users"))
check("real company-wide still detected", m.mentions_company_wide("outlook is down for everyone"))
t=c.post("/api/triage",json={"text":"My VPN is not connecting, but not everyone is affected","clarification_answers":{"affected_users":"Only me"}}).json()
check("triage: negated 'everyone' is not P1", t["suggestedPriority"]!="P1 - Critical", t["suggestedPriority"])
t2=c.post("/api/triage",json={"text":"Outlook is down for everyone in the entire company"}).json()
check("triage: real company-wide email outage is P1", t2["suggestedPriority"]=="P1 - Critical", t2["suggestedPriority"])
check("triage: fallback confidence labelled as heuristic", t2["confidenceType"]=="rule_based_heuristic_not_a_model_score" and t2["confidenceIsHeuristic"] is True)
t3=c.post("/api/triage",json={"text":"Printer on floor 2 is not printing"}).json()
check("triage: printer issue now finds KB-1009 runbook", "KB-1009" in t3["matchedRunbook"], t3["matchedRunbook"])
src=open("backend/main.py").read()
check("dead classify_request_intent removed", "def classify_request_intent" not in src)
check("no second unreachable try block", src.count("answer_question(")<=3, src.count("answer_question("))

# --- service requests / metrics ---------------------------------------------
c.post("/api/service-requests",json={"requestedSoftware":"VS Code"})
db["service_requests"].insert_one({"requestedSoftware":"string","created_at":"2026"})
db["service_requests"].insert_one({"requestedSoftware":"  ","created_at":"2026"})
sr=c.get("/api/service-requests").json()
check("placeholder/blank requests filtered in query", [i["requestedSoftware"] for i in sr["items"]]==["VS Code"], sr["items"])
mt=c.get("/api/metrics").json()
check("metrics count only valid service requests", mt["serviceRequests"]["total"]==1 and mt["serviceRequests"]["pending"]==1, mt["serviceRequests"])
check("metrics: escalatedRuns counts simulation failures only", mt["automation"]["escalatedRuns"]>=1)

# --- health + error leakage ---------------------------------------------------
h=c.get("/api/health").json()
check("health reports triage model status", "triage_model" in h["ai_engine"], h)
orig=m.rebuild_index
def boom(): raise Exception("secret internal path /srv/app/.env")
m.rebuild_index=boom
r=c.post("/api/knowledge/rebuild",headers=H)
check("rebuild error does not leak internals", r.status_code==500 and "secret" not in r.text and "/srv" not in r.text, r.text)
m.rebuild_index=orig

# --- vector retry cool-down ---------------------------------------------------
import time
t0=time.perf_counter(); [kb.vector_status() for _ in range(20)]; dt=time.perf_counter()-t0
check("20 health vector checks are fast (cool-down works)", dt<1.0, f"{dt:.2f}s")

print(f"\n{ok} passed, {bad} failed")
sys.exit(1 if bad else 0)
