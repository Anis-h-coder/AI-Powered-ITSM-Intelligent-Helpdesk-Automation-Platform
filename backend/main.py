from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from uuid import uuid4
import os
import re

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pymongo.errors import PyMongoError

from backend.database import connect_to_mongodb, get_database, close_mongodb
from backend.knowledge_base import (
    SAMPLE_ARTICLES, answer_question, rebuild_index, search_knowledge,
    seed_sample_articles, vector_status,
)

NOW = lambda: datetime.now(timezone.utc).isoformat()

class IncidentCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=5, max_length=10000)
    category: str = "Other"
    priority: str = "Medium"
    requester_email: str | None = None
    requester: str | None = None
    department: str = "General"

class IncidentStatusUpdate(BaseModel):
    status: str = Field(min_length=1, max_length=50)
    resolvedByAi: bool | None = None

class ServiceRequestCreate(BaseModel):
    requestedSoftware: str = Field(min_length=1, max_length=200)
    requester: str = "Employee"
    department: str = "General"
    businessPurpose: str | None = None
    status: str = "Submitted"

class ServiceRequestStatusUpdate(BaseModel):
    status: str = Field(min_length=1, max_length=50)

class AuditLogCreate(BaseModel):
    automatedAction: str = Field(min_length=1, max_length=300)
    relatedItem: str = ""
    executionStatus: str = "Success"
    result: str = ""
    remediationDetails: dict | None = None
    timestamp: str | None = None
    isSimulated: bool = True

class TriageRequest(BaseModel):
    text: str = Field(min_length=3, max_length=10000)
    department: str = "General"

class KnowledgeAsk(BaseModel):
    question: str = Field(min_length=3, max_length=10000)
    category: str = "ALL"

class KnowledgeArticleCreate(BaseModel):
    article_id: str | None = None
    id: str | None = None
    title: str = Field(min_length=3, max_length=250)
    category: str = "General"
    source_document: str | None = None
    sourceDocument: str | None = None
    content: str = Field(min_length=20, max_length=100000)
    approved: bool = False
    troubleshooting_instructions: list[str] = Field(default_factory=list)
    troubleshootingInstructions: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)

class ResolutionSimulationRequest(BaseModel):
    scenarioId: str | None = None
    ticketId: str = Field(min_length=1, max_length=100)
    runbookId: str | None = None
    scenarioName: str | None = None
    issue: str | None = None
    category: str | None = None
    riskLevel: str | None = None
    isEligibleForAutoRemediation: bool | None = None
    matchedKnowledgeArticleId: str | None = None

class ResolutionApprovalRequest(BaseModel):
    ticketId: str = Field(min_length=1, max_length=100)
    approverName: str = Field(min_length=2, max_length=120)
    approvalNotes: str = Field(default="", max_length=2000)

class ServiceNowSyncRequest(BaseModel):
    incident_id: str = Field(min_length=1, max_length=100)


def serialize(document):
    if document is None:
        return None
    if "_id" in document:
        document["_id"] = str(document["_id"])
    return document


def is_valid_service_request(document: dict) -> bool:
    """Hide empty/template software requests from live API results and metrics."""
    name = str(document.get("requestedSoftware") or "").strip()
    return bool(name) and name.lower() != "string"


def write_audit(db, action: str, related_item: str, status: str, result: str, details: dict | None = None):
    doc = {
        "log_id": f"LOG-{uuid4().hex[:10].upper()}",
        "automatedAction": action,
        "relatedItem": related_item,
        "executionStatus": status,
        "result": result,
        "remediationDetails": details or {},
        "timestamp": NOW(),
        "isSimulated": True,
    }
    inserted = db["audit_logs"].insert_one(doc)
    doc["_id"] = str(inserted.inserted_id)
    return doc

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        connect_to_mongodb()
        app.state.database_status = "connected"
        try:
            seeded = seed_sample_articles()
            indexed = rebuild_index()
            print(f"Knowledge base ready: seeded={seeded}, index={indexed}")
        except Exception as exc:
            print(f"Knowledge startup warning: {type(exc).__name__}: {exc}")
    except Exception as exc:
        app.state.database_status = "disconnected"
        print(f"MongoDB startup connection failed: {type(exc).__name__}: {exc}")
    yield
    close_mongodb()

app = FastAPI(title="ITSM AI Platform API", description="Assessment backend: FastAPI, MongoDB, grounded knowledge retrieval and clearly labelled mock integrations", version="1.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/")
def root():
    return {"message": "ITSM AI Platform API is running", "docs": "/docs"}

@app.get("/api/health")
def health_check():
    db_status = getattr(app.state, "database_status", "unknown")
    try:
        db_name = get_database().name if db_status == "connected" else None
    except Exception:
        db_name = None
    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "service": "ITSM AI Platform API",
        "database": {"name": db_name, "status": db_status},
        "ai_engine": {"status": "configured" if os.getenv("HF_TEXT_MODEL") else "retrieval_only", "provider": "Hugging Face local model" if os.getenv("HF_TEXT_MODEL") else "grounded retrieval; no generation model configured"},
        "knowledge_retrieval": vector_status(),
        "service_now": {"mode": "MOCK", "status": "available_mock_adapter", "note": "No live ServiceNow instance is connected."},
    }

@app.get("/api/health/database")
def database_health():
    try:
        db = get_database(); db.client.admin.command("ping")
        return {"status": "connected", "database": db.name, "ping": "successful"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database connection check failed. Check backend logs and .env configuration.") from exc

@app.post("/api/incidents", status_code=201)
def create_incident(payload: IncidentCreate):
    try:
        db = get_database(); doc = payload.model_dump()
        doc.update({"incident_id": f"INC-{uuid4().hex[:10].upper()}", "status": "New", "created_at": NOW()})
        result = db["incidents"].insert_one(doc); doc["_id"] = str(result.inserted_id)
        return {"success": True, "incident": doc}
    except (PyMongoError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail="Incident could not be saved to the database.") from exc

@app.get("/api/incidents")
def get_incidents(category: str | None = None, priority: str | None = None, status: str | None = None):
    try:
        db = get_database(); query = {}
        if category: query["category"] = category
        if priority: query["priority"] = priority
        if status: query["status"] = status
        items = [serialize(x) for x in db["incidents"].find(query).sort("created_at", -1).limit(200)]
        return {"items": items, "total": len(items)}
    except (PyMongoError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail="Incidents could not be retrieved.") from exc

@app.patch("/api/incidents/{incident_id}")
def update_incident(incident_id: str, payload: IncidentStatusUpdate):
    try:
        db = get_database(); fields = {"status": payload.status.strip(), "updated_at": NOW()}
        if payload.resolvedByAi is not None: fields["resolvedByAi"] = payload.resolvedByAi
        result = db["incidents"].update_one({"incident_id": incident_id}, {"$set": fields})
        if not result.matched_count: raise HTTPException(status_code=404, detail="Incident not found.")
        return {"success": True, "incident": serialize(db["incidents"].find_one({"incident_id": incident_id}))}
    except HTTPException: raise
    except (PyMongoError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail="Incident status could not be updated.") from exc

@app.get("/api/service-requests")
def get_service_requests():
    try:
        db = get_database()
        raw_items = list(db["service_requests"].find({}).sort("created_at", -1).limit(500))
        items = [serialize(x) for x in raw_items if is_valid_service_request(x)]
        return {"items": items, "total": len(items)}
    except (PyMongoError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail="Service requests could not be retrieved.") from exc

@app.post("/api/service-requests", status_code=201)
def create_service_request(payload: ServiceRequestCreate):
    try:
        requested_software = payload.requestedSoftware.strip()
        if not requested_software or requested_software.lower() == "string":
            raise HTTPException(status_code=422, detail="Enter a valid software name; template placeholders are not accepted.")
        db = get_database(); doc = payload.model_dump()
        doc["requestedSoftware"] = requested_software
        doc.update({"request_id": f"REQ-{uuid4().hex[:10].upper()}", "created_at": NOW(), "provisioning_mode": "MOCK", "provisioning_note": "Request recorded only; this assessment environment does not install software on devices."})
        result = db["service_requests"].insert_one(doc); doc["_id"] = str(result.inserted_id)
        write_audit(db, "Software service request submitted", doc["request_id"], "Success", "Request persisted. Provisioning remains pending approval and is mock-only.", {"mode": "MOCK"})
        return {"success": True, "request": doc}
    except (PyMongoError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail="Service request could not be saved.") from exc

@app.patch("/api/service-requests/{request_id}")
def update_service_request(request_id: str, payload: ServiceRequestStatusUpdate):
    try:
        db = get_database(); result = db["service_requests"].update_one({"request_id": request_id}, {"$set": {"status": payload.status, "updated_at": NOW()}})
        if not result.matched_count: raise HTTPException(status_code=404, detail="Service request not found.")
        return {"success": True, "request": serialize(db["service_requests"].find_one({"request_id": request_id}))}
    except HTTPException: raise
    except (PyMongoError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail="Service request status could not be updated.") from exc

@app.get("/api/audit-logs")
def get_audit_logs():
    try:
        db = get_database(); items = [serialize(x) for x in db["audit_logs"].find({}).sort("_id", -1).limit(300)]
        return {"items": items, "total": len(items)}
    except (PyMongoError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail="Audit logs could not be retrieved.") from exc

@app.post("/api/audit-logs", status_code=201)
def create_audit_log(payload: AuditLogCreate):
    try:
        db = get_database(); doc = payload.model_dump(exclude_none=True)
        doc.setdefault("timestamp", NOW()); doc["log_id"] = f"LOG-{uuid4().hex[:10].upper()}"
        result = db["audit_logs"].insert_one(doc); doc["_id"] = str(result.inserted_id)
        return {"success": True, "log": doc}
    except (PyMongoError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail="Audit log could not be saved.") from exc

def classify_request_intent(text: str) -> str:
    """Classify the employee's actual issue, not instructional words in UI-added context."""
    reported_issue = re.search(
        r'user reported issue\s*:\s*["“](.+?)["”]',
        text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    issue_text = reported_issue.group(1) if reported_issue else text
    issue = re.sub(r"\s+", " ", issue_text).strip().lower()

    # An explicit failure report takes precedence over words like "steps" elsewhere
    # in a combined ticket description.
    incident_patterns = (
        r"\bnot connecting\b", r"\bnot working\b", r"\bunable to\b",
        r"\bcannot\b", r"\bcan't\b", r"\bfail(?:s|ed|ing)?\b",
        r"\berror\b", r"\bproblem\b", r"\bissue\b", r"\boutage\b",
        r"\bdisconnected\b", r"\bexpired\b", r"\blocked\b",
        r"\bdoesn't work\b", r"\bwon't\b",
    )
    if any(re.search(pattern, issue) for pattern in incident_patterns):
        return "Incident"

    question_patterns = (
        r"^(how do i|how can i|how to|what is|what are|where can i|"
        r"why does|why is|can you explain|explain|show me the steps)\b",
    )
    if issue.endswith("?") or any(re.search(pattern, issue) for pattern in question_patterns):
        return "Knowledge Question"

    return "Incident"


@app.post("/api/triage")
def run_triage(payload: TriageRequest):
    try:
        db = get_database(); result = answer_question(payload.text)
        sources = result.get("sources", [])
        source_categories = []
        for source in sources:
            article = db["knowledge_articles"].find_one({"article_id": source["article_id"]})
            if article and article.get("category") not in source_categories: source_categories.append(article.get("category"))
        lower = payload.text.lower()
        if result.get("escalated") or not sources:
            category, priority, group = "Unknown / Unclassified", "Needs Assessment", "ServiceDesk Tier-2 Queue"
            intent = "Unsupported / Human Review"
        else:
            category = source_categories[0] if source_categories else "Other"
            if any(term in lower for term in ("outage", "all users", "production down", "service unavailable", "database down")):
                priority, group = "P1 - Critical", "Incident Management / SRE"
            elif any(term in lower for term in ("cannot login", "can't login", "password expired", "vpn", "blocked")):
                priority, group = "P2 - High", "IT Support"
            else:
                priority, group = "P3 - Medium", "IT Support"
            intent = classify_request_intent(payload.text)
        confidence = round(float(result.get("confidence", 0.0)) * 100, 1)
        return {
            "success": True, "predictedCategory": category, "intent": intent,
            "triageMethod": "Rule-based routing with approved-knowledge retrieval",
            "confidence": confidence, "confidenceScore": confidence, "suggestedPriority": priority,
            "priorityReasoning": "Priority is a preliminary rule-based routing suggestion; confirm business impact with the service desk.",
            "sentiment": "Requires Human Review" if result.get("escalated") else "Requires agent confirmation",
            "sentimentScore": "Not evaluated by a sentiment model", "recommendedGroup": group,
            "matchedRunbook": ", ".join(s["article_id"] + ": " + s["title"] for s in sources) if sources else "No approved runbook matched",
            "deflectionFeasibility": "Escalate to human support" if result.get("escalated") else "Knowledge-supported; agent confirmation recommended",
            "safetyAssessment": "No supported source found; do not invent a fix. Escalate." if result.get("escalated") else "Recommendations are grounded in approved articles. No production change was performed.",
            "selectionReason": "Approved knowledge retrieval result; confidence is retrieval similarity, not a calibrated probability.",
            "answer": result.get("answer"), "sources": sources, "escalated": result.get("escalated"),
            "retrievalMode": result.get("retrieval_mode"), "answerMode": result.get("answer_mode"),
        }
    except (PyMongoError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail="Triage unavailable because the knowledge database is unavailable.") from exc

@app.get("/api/knowledge/articles")
def get_articles(category: str = "ALL"):
    try:
        db = get_database(); query = {"approved": True}
        if category != "ALL": query["category"] = category
        items = [serialize(x) for x in db["knowledge_articles"].find(query).sort("title", 1).limit(500)]
        return {"items": items, "total": len(items)}
    except (PyMongoError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail="Knowledge articles could not be retrieved.") from exc

@app.get("/api/knowledge/search")
def knowledge_search(q: str = Query(min_length=1, max_length=10000), category: str = "ALL"):
    try:
        return {"items": search_knowledge(q, category, limit=10), "total": len(search_knowledge(q, category, limit=10)), "retrieval": vector_status()}
    except (PyMongoError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail="Knowledge search is unavailable.") from exc

@app.post("/api/knowledge/ask")
def knowledge_ask(payload: KnowledgeAsk):
    try:
        return answer_question(payload.question, payload.category)
    except (PyMongoError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail="Knowledge answer is unavailable.") from exc

@app.post("/api/knowledge/ingest", status_code=201)
def ingest_article(payload: KnowledgeArticleCreate):
    try:
        db = get_database(); article_id = (payload.article_id or payload.id or f"KB-{uuid4().hex[:8].upper()}").strip()
        doc = {"article_id": article_id, "title": payload.title, "category": payload.category, "source_document": payload.source_document or payload.sourceDocument or f"{article_id}.md", "content": payload.content, "approved": payload.approved, "troubleshooting_instructions": payload.troubleshooting_instructions or payload.troubleshootingInstructions, "tags": payload.tags, "updated_at": NOW()}
        db["knowledge_articles"].update_one({"article_id": article_id}, {"$set": doc}, upsert=True)
        index_status = rebuild_index() if doc["approved"] else {"mode": "not_indexed", "detail": "Article requires approval before it is searchable."}
        return {"success": True, "article": doc, "index": index_status}
    except (PyMongoError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail="Knowledge article could not be ingested.") from exc

@app.post("/api/auto-resolution/simulate")
def simulate_resolution(payload: ResolutionSimulationRequest):
    try:
        db = get_database()
        issue = payload.issue or payload.scenarioName or payload.ticketId
        triage = answer_question(issue)
        sources = triage.get("sources", [])
        matched = next((s for s in sources if not payload.matchedKnowledgeArticleId or s["article_id"] == payload.matchedKnowledgeArticleId), None)
        eligible = payload.isEligibleForAutoRemediation is True
        high_risk = (payload.riskLevel or "").lower() in {"critical", "high", "high risk"}
        safe = bool(matched) and not triage.get("escalated") and eligible and not high_risk
        if safe:
            status, execution_status = "Completed (Simulated)", "Success"
            result_text = "Assessment-only remediation simulation completed. No endpoint, account, network, or production configuration was changed."
            steps = ["Approved knowledge source matched", "Eligibility flag accepted", "Simulation recorded; no real remediation executed"]
        else:
            status, execution_status = "Escalated to Human Tier 3", "Failed"
            reasons = []
            if not matched: reasons.append("no sufficiently relevant approved knowledge source")
            if not eligible: reasons.append("scenario is not marked eligible for automatic remediation")
            if high_risk: reasons.append("high-risk action requires human approval")
            if triage.get("escalated"): reasons.append("knowledge retrieval confidence is below the safety threshold")
            result_text = "Simulation blocked and escalated: " + "; ".join(reasons or ["safety policy requires human review"]) + ". No change was made."
            steps = ["Safety policy evaluated", "Execution blocked", "Human support escalation recorded"]
        audit = write_audit(db, "Self-heal assessment simulation", payload.ticketId, execution_status, result_text, {"scenarioId": payload.scenarioId, "runbookId": payload.runbookId, "scenarioName": payload.scenarioName, "matchedKnowledgeArticleId": matched["article_id"] if matched else None, "confidence": triage.get("confidence"), "status": status, "steps": steps, "simulationOnly": True})
        # A simulation must not mark the real incident resolved. Only the audit
        # event is persisted; an authorized operator must verify a real fix.
        return {"success": True, "ticketId": payload.ticketId, "status": status, "executionStatus": execution_status, "result": result_text, "steps": steps, "isSimulated": True, "confidence": triage.get("confidence", 0), "sources": triage.get("sources", []), "escalated": not safe, "auditLog": audit}
    except (PyMongoError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail="Simulation could not be recorded. No resolution status was changed.") from exc

@app.post("/api/auto-resolution/approve")
def approve_resolution(payload: ResolutionApprovalRequest):
    try:
        db = get_database()
        audit = write_audit(db, "Human-approved assessment simulation", payload.ticketId, "Success", "Approval was recorded for the assessment simulation only. No real remediation or production change was performed.", {"approverName": payload.approverName, "approvalNotes": payload.approvalNotes, "simulationOnly": True})
        return {"success": True, "status": "Human Approved (Simulated)", "isSimulated": True, "auditLog": audit, "message": "Approval recorded for simulation only; no real change was made."}
    except (PyMongoError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail="Approval could not be recorded.") from exc

@app.get("/api/metrics")
def get_metrics():
    try:
        db = get_database()
        incidents = db["incidents"]; requests = db["service_requests"]; logs = db["audit_logs"]
        valid_requests = [item for item in requests.find({}) if is_valid_service_request(item)]
        request_statuses = [str(item.get("status") or "Submitted") for item in valid_requests]
        return {
            "incidents": {
                "total": incidents.count_documents({}),
                "open": incidents.count_documents({"status": {"$nin": ["Resolved", "Closed"]}}),
                "resolved": incidents.count_documents({"status": {"$in": ["Resolved", "Closed"]}}),
                "escalated": incidents.count_documents({"status": "Escalated"}),
            },
            "serviceRequests": {
                "total": len(valid_requests),
                "pending": sum(status not in {"Completed", "Rejected"} for status in request_statuses),
                "completed": sum(status == "Completed" for status in request_statuses),
            },
            "automation": {
                "totalRuns": logs.count_documents({"automatedAction": {"$regex": "simulation", "$options": "i"}}),
                "successfulRuns": logs.count_documents({"automatedAction": {"$regex": "simulation", "$options": "i"}, "executionStatus": "Success"}),
                "escalatedRuns": logs.count_documents({"executionStatus": "Failed"}),
            },
        }
    except (PyMongoError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail="Metrics could not be calculated from the database.") from exc

@app.get("/api/servicenow/status")
def servicenow_status():
    return {"mode": "MOCK", "status": "available_mock_adapter", "connected": False, "message": "No live ServiceNow credentials configured. Mock records are persisted in MongoDB and clearly labelled."}

@app.post("/api/servicenow/sync")
def sync_servicenow(incident_id: str = Query(min_length=1)):
    try:
        db = get_database(); incident = db["incidents"].find_one({"incident_id": incident_id})
        if not incident: raise HTTPException(status_code=404, detail="Incident not found; nothing was synced.")
        snow_id = f"MOCK-SNOW-{uuid4().hex[:8].upper()}"
        doc = {"sync_id": f"SYNC-{uuid4().hex[:10].upper()}", "incident_id": incident_id, "mock_servicenow_id": snow_id, "payload": {"title": incident.get("title"), "description": incident.get("description"), "category": incident.get("category"), "priority": incident.get("priority"), "status": incident.get("status")}, "mode": "MOCK", "created_at": NOW()}
        db["servicenow_syncs"].insert_one(doc)
        write_audit(db, "Mock ServiceNow sync", incident_id, "Success", f"Persisted mock sync record {snow_id}; no live ServiceNow instance was contacted.", {"mode": "MOCK", "mockServiceNowId": snow_id})
        return {"success": True, "mode": "MOCK", "connected": False, "sync": doc}
    except HTTPException: raise
    except (PyMongoError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail="Mock ServiceNow sync could not be persisted.") from exc
