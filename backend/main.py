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

from transformers import pipeline

HF_MODEL_NAME = "facebook/bart-large-mnli"

triage_classifier = None

class IncidentCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=5, max_length=10000)
    category: str = "Other"
    priority: str = "Medium"
    requester_email: str | None = None
    requester: str | None = None
    department: str = "General"

    # Preserve frontend assignment information
    assignmentGroup: str = "IT Support"
    assignee: str = "Unassigned"
    slaDue: str | None = None
    resolvedByAi: bool = False
    isUserCreated: bool = False

class IncidentStatusUpdate(BaseModel):
    # PATCH supports status changes, agent assignment, or both.
    status: str | None = Field(default=None, min_length=1, max_length=50)
    assignee: str | None = Field(default=None, min_length=1, max_length=120)
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

    # Information from previous chatbot turns
    original_issue: str | None = None
    clarification_answers: dict[str, str] = Field(
        default_factory=dict
    )

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

    # Values sent by AutoResolution.jsx. The selected article is still
    # verified against the approved MongoDB knowledge collection below.
    retrievalSimilarityPercent: float | None = None
    referenceThresholdPercent: float | None = 40.0
    isEscalated: bool = False

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
    global triage_classifier

    # Connect to MongoDB
    try:
        connect_to_mongodb()
        app.state.database_status = "connected"

        try:
            seeded = seed_sample_articles()
            indexed = rebuild_index()
            print(f"Knowledge base ready: seeded={seeded}, index={indexed}")

        except Exception as exc:
            print(
                f"Knowledge startup warning: "
                f"{type(exc).__name__}: {exc}"
            )

    except Exception as exc:
        app.state.database_status = "disconnected"
        print(
            f"MongoDB startup connection failed: "
            f"{type(exc).__name__}: {exc}"
        )

    # Load Hugging Face model during application startup
    try:
        print(f"Loading Hugging Face model: {HF_MODEL_NAME}")

        triage_classifier = pipeline(
            "zero-shot-classification",
            model=HF_MODEL_NAME,
        )

        app.state.ai_model_status = "loaded"

        print("Hugging Face AI triage model loaded successfully.")

    except Exception as exc:
        triage_classifier = None
        app.state.ai_model_status = "failed"

        print(
            f"Hugging Face model loading failed: "
            f"{type(exc).__name__}: {exc}"
        )

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
        db = get_database()

        # Build only the fields included in this PATCH request.
        # This allows agent assignment without requiring a status change.
        fields = {}

        if payload.status is not None:
            fields["status"] = payload.status.strip()

        if payload.assignee is not None:
            assignee = payload.assignee.strip()
            if not assignee:
                raise HTTPException(status_code=422, detail="Agent name cannot be empty.")
            fields["assignee"] = assignee

        if payload.resolvedByAi is not None:
            fields["resolvedByAi"] = payload.resolvedByAi

        if not fields:
            raise HTTPException(
                status_code=400,
                detail="Provide at least one field to update: status, assignee, or resolvedByAi."
            )

        fields["updated_at"] = NOW()

        result = db["incidents"].update_one(
            {"incident_id": incident_id},
            {"$set": fields}
        )

        if not result.matched_count:
            raise HTTPException(status_code=404, detail="Incident not found.")

        updated_incident = db["incidents"].find_one({"incident_id": incident_id})
        return {"success": True, "incident": serialize(updated_incident)}

    except HTTPException:
        raise
    except (PyMongoError, RuntimeError) as exc:
        raise HTTPException(
            status_code=503,
            detail="Incident could not be updated in the database."
        ) from exc

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
        issue = payload.text.strip()
        # Clarification stage: identify missing impact information

        clarification_answers = payload.clarification_answers or {}

        original_issue = (
            payload.original_issue.strip()
            if payload.original_issue
            else issue
        )

        # Use the original issue when processing follow-up answers
        if clarification_answers:
            issue = original_issue + "\nEmployee clarification: " + (
                "; ".join(
                    f"{key}: {value}"
                    for key, value in clarification_answers.items()
                )
            )

        # Extract the actual employee issue before deciding whether
        # impact clarification is relevant (questions and service requests
        # should not be forced through incident-impact questions).
        affected_users = clarification_answers.get("affected_users")

        # Clarification is advisory: complete automatic triage first, then show
        # an optional follow-up question when important context is missing.
        clarification_question = None
        clarification_options = []
        clarification_key = None

        # Extract the actual employee issue if the frontend
        # sends a combined diagnostic description.
        reported_issue = re.search(
            r'user reported issue\s*:\s*["“](.+?)["”]',
            issue,
            flags=re.IGNORECASE | re.DOTALL,
        )

        if reported_issue:
            issue = reported_issue.group(1).strip()

        issue_lower_early = issue.lower().strip()

        # Infer scope only when the employee's wording explicitly states it.
        # This avoids asking redundant impact clarification for obvious
        # company-wide outages while keeping ambiguous cases in clarification.
        if not affected_users:
            if any(term in issue_lower_early for term in (
                "entire company", "company-wide", "company wide", "everyone",
                "all employees", "whole organization", "all users",
            )):
                affected_users = "the entire company"
            elif any(term in issue_lower_early for term in (
                "my department", "our department", "my team", "our team",
                "multiple departments",
            )):
                affected_users = "my department"
            elif any(term in issue_lower_early for term in (
                "only me", "just me", "my account only", "only my computer",
            )):
                affected_users = "only me"

        # Keep non-IT requests out of incident creation and IT priority scoring.
        out_of_domain_patterns = (
            r"\brestaurant\b", r"\brecipe\b", r"\bweather\b",
            r"\bmovie\b", r"\btravel itinerary\b", r"\bfood recipe\b",
            r"\bshopping recommendation\b",
        )
        if any(re.search(pattern, issue_lower_early) for pattern in out_of_domain_patterns):
            return {
                "success": True,
                "intent": "Out of Domain",
                "predictedCategory": "Not an IT issue",
                "suggestedPriority": "Not applicable",
                "impact": "Not applicable",
                "urgency": "Not applicable",
                "recommendedGroup": "Not applicable",
                "confidence": 0,
                "confidenceScore": 0,
                "answer": "I can help with workplace IT issues, incidents, software requests, and approved IT knowledge articles. This message appears to be outside the IT helpdesk scope, so I haven't created or classified an IT ticket.",
                "sources": [],
                "escalated": False,
                "canCreateTicket": False,
                "triageMethod": "Scope rule",
                "selectionReason": "The request does not appear to be an IT support request.",
            }

        # Detect common request types before asking incident-only impact questions.
        lower = issue_lower_early
        security_signal = any(term in lower for term in (
            "suspicious login", "suspicious sign-in", "unexpected login",
            "unexpected sign-in", "unknown login", "someone logged in",
            "account compromised", "account compromise", "phishing",
            "unrecognized mfa", "unexpected mfa", "mfa prompt i didn't",
            "mfa prompt i did not", "push request i did not",
        ))
        mfa_blocked_signal = any(term in lower for term in (
            "mfa push loop", "mfa loop", "stuck in mfa", "mfa keeps",
            "mfa push", "cannot complete mfa", "can't complete mfa",
            "unable to complete mfa", "mfa prevents login",
        ))
        software_request_signal = any(term in lower for term in (
            "need visual studio code", "need vscode", "install visual studio code",
            "install vscode", "request to install", "need to install",
            "please install", "software request", "request software",
        ))
        software_failure_signal = any(term in lower for term in (
            "installation failed", "install failed", "failed to install",
            "software installation error", "installer error",
        ))
        password_expiration_signal = any(term in lower for term in (
            "password expired", "password has expired", "my password expired",
            "my password has expired", "expired password", "password expiration",
            "password expiry", "password is expiring", "password has been expired",
            "expired credentials", "credentials expired", "credential has expired",
            "need to change my password", "password renewal",
        ))
        password_lock_signal = password_expiration_signal or any(term in lower for term in (
            "account locked", "locked account", "locked out", "forgot password",
            "password reset", "unable to sign in because of password",
        ))
        resolved_signal = any(term in lower for term in (
            "already resolved", "issue is resolved", "problem is resolved",
            "vpn is working now", "vpn working now", "fixed now", "resolved now",
        )) and any(term in lower for term in ("ticket", "incident", "vpn", "issue", "problem"))

        # Ask for symptoms when the initial report is too vague to classify.
        vague_issue_patterns = (
            "computer issue", "computer problem", "something wrong with my computer",
            "my computer has an issue", "laptop issue", "desktop issue",
            "my device is not working", "technical issue",
        )
        if (
            any(term in lower for term in vague_issue_patterns)
            and not clarification_answers.get("issue_details")
            and not payload.original_issue
        ):
            clarification_question = (
                "What exactly is happening with your computer or device? "
                "For example, is it slow, not turning on, showing an error, "
                "or having a network issue?"
            )
            clarification_options = [
                "It is slow",
                "It will not turn on",
                "It shows an error",
                "It has a network or Wi-Fi issue",
                "Something else",
            ]
            clarification_key = "issue_details"

        # Ask impact only for likely incidents, not KB questions, service requests,
        # or resolution/update messages.
        knowledge_request_patterns = (
            r"\b(i want to know|i need to know|tell me|show me|approved troubleshooting steps|"
            r"knowledge article|troubleshooting guide|how do i|how can i|how to|what is|what are|"
            r"where can i|why does|why is|can you explain|explain|show me the steps)\b",
        )
        likely_knowledge_question = (
            bool(re.match(
                r"^(how do i|how can i|how to|what is|what are|where can i|"
                r"why does|why is|can you explain|explain|show me the steps)\b",
                lower
            ))
            or lower.endswith("?")
            or any(re.search(pattern, lower) for pattern in knowledge_request_patterns)
        )
        likely_service_request = software_request_signal and not software_failure_signal
        if not affected_users and not payload.original_issue and not (
            likely_knowledge_question or likely_service_request or resolved_signal
        ) and not clarification_question:
            clarification_question = "Who is affected by this issue?"
            clarification_options = ["Only me", "My department", "The entire company"]
            clarification_key = "affected_users"

        def predict(candidate_labels, hypothesis_template):
            # Prefer the Hugging Face zero-shot model when available. If model
            # download/loading fails, use a transparent deterministic fallback
            # so the assessment UI remains usable instead of returning 503.
            if triage_classifier is not None:
                result = triage_classifier(
                    issue,
                    candidate_labels=candidate_labels,
                    hypothesis_template=hypothesis_template,
                    multi_label=False,
                )
                return {
                    "label": result["labels"][0],
                    "score": float(result["scores"][0]),
                    "decisionSource": "hugging_face_zero_shot",
                }

            text = issue.lower()
            template = hypothesis_template.lower()
            labels = list(candidate_labels)
            chosen = labels[-1] if labels else "Unknown"
            score = 0.62

            if "employee message" in template:
                if any(k in text for k in ("how do i", "how to", "what is", "explain", "where can i", "?")):
                    chosen = next((x for x in labels if "knowledge question" in x.lower()), chosen)
                elif any(k in text for k in ("install", "request software", "need software", "please provide access")) and not any(k in text for k in ("failed", "error", "not working")):
                    chosen = next((x for x in labels if "service request" in x.lower()), chosen)
                elif any(k in text for k in ("automate", "automatically fix", "auto-remediat")):
                    chosen = next((x for x in labels if "automatable" in x.lower()), chosen)
                else:
                    chosen = next((x for x in labels if "incident" in x.lower()), chosen)
                    score = 0.72

            elif "business impact" in template:
                if any(k in text for k in ("entire company", "company-wide", "all employees", "everyone", "production outage", "critical service")):
                    chosen = next((x for x in labels if "high business impact" in x.lower()), chosen)
                    score = 0.88
                elif any(k in text for k in ("department", "team", "multiple users", "several users")):
                    chosen = next((x for x in labels if "medium business impact" in x.lower()), chosen)
                    score = 0.78
                else:
                    chosen = next((x for x in labels if "low business impact" in x.lower()), chosen)
                    score = 0.70

            elif "urgency of this it issue" in template:
                if any(k in text for k in ("outage", "unavailable", "down for everyone", "production down", "critical", "cannot access", "not connecting", "locked out", "security incident")):
                    chosen = next((x for x in labels if "high urgency" in x.lower()), chosen)
                    score = 0.82
                elif any(k in text for k in ("slow", "intermittent", "degraded", "sometimes", "delayed")):
                    chosen = next((x for x in labels if "medium urgency" in x.lower()), chosen)
                    score = 0.72
                else:
                    chosen = next((x for x in labels if "low urgency" in x.lower()), chosen)
                    score = 0.65

            elif "incident or request involves" in template:
                rules = [
                    (("vpn", "wi-fi", "wifi", "network", "dns", "connectivity"), ("network", "vpn")),
                    (("database", "postgres", "sql", "connection pool", "query"), ("database",)),
                    (("outlook", "webmail", "email", "mailbox", "teams", "messaging"), ("email", "collaboration")),
                    (("password", "mfa", "login", "sign in", "account", "access", "authentication"), ("account", "access")),
                    (("laptop", "keyboard", "monitor", "printer", "hardware", "device won't turn on"), ("hardware",)),
                    (("software", "application", "app", "installation", "install"), ("software",)),
                    (("cloud", "azure", "aws", "server", "infrastructure"), ("cloud",)),
                ]
                matched_label = None
                for terms, label_terms in rules:
                    if any(term in text for term in terms):
                        matched_label = next((x for x in labels if all(term in x.lower() for term in label_terms)), None)
                        if matched_label:
                            break
                if matched_label:
                    chosen = matched_label
                    score = 0.78
                else:
                    chosen = next((x for x in labels if "general it" in x.lower()), chosen)

            return {"label": chosen, "score": score, "decisionSource": "rule_based_fallback"}

        # 1. AI intent classification
        intent_result = predict(
            [
                "IT incident or technical problem",
                "IT service request",
                "IT knowledge question",
                "automatable IT issue",
            ],
            "This employee message is {}.",
        )

        intent_mapping = {
            "IT incident or technical problem": "Incident",
            "IT service request": "Service Request",
            "IT knowledge question": "Knowledge Question",
            "automatable IT issue": "Automatable Issue",
        }

        intent = intent_mapping[intent_result["label"]]

        # Deterministic rules for high-confidence, safety-sensitive intents.
        if resolved_signal:
            intent = "Incident Update"
        elif security_signal:
            intent = "Incident"
        elif mfa_blocked_signal or password_lock_signal or software_failure_signal:
            intent = "Incident"
        elif software_request_signal and not software_failure_signal:
            intent = "Service Request"
        elif likely_knowledge_question and not any(term in lower for term in (
            "not working", "failed", "error", "outage", "locked", "cannot", "unable"
        )):
            intent = "Knowledge Question"

        # 2. AI category classification with detailed ITSM descriptions

        category_descriptions = {
            "Network and VPN": (
                "Network and VPN incidents involving internet connectivity, "
                "Wi-Fi connection failures, LAN or WAN outages, VPN connection "
                "problems, DNS errors, network latency, packet loss, firewall "
                "connectivity, or inability to access network resources. "
                "Examples include VPN not connecting, office network down, "
                "and employees unable to access internal network services."
            ),

            "Cloud Infrastructure": (
                "Cloud infrastructure and platform incidents involving cloud "
                "service outages, virtual machines, cloud servers, containers, "
                "infrastructure availability, cloud deployment failures, "
                "AWS or Azure infrastructure, server downtime, resource "
                "availability, or infrastructure performance degradation. "
                "Use this category when the underlying cloud infrastructure "
                "is the primary problem rather than a business application."
            ),

            "Software": (
                "Software and business application incidents involving "
                "application errors, software crashes, application performance, "
                "failed application launches, software bugs, installation errors, "
                "application functionality, business system failures, payroll "
                "application outages, ERP or CRM problems, or application "
                "unavailability. Examples include payroll software unavailable, "
                "an application displaying errors, or employees unable to use "
                "a business application. Choose this category when the software "
                "application itself is the primary affected service."
            ),

            "Hardware": (
                "Physical IT equipment incidents involving laptops, desktops, "
                "monitors, keyboards, mice, printers, scanners, physical servers, "
                "storage devices, damaged equipment, hardware malfunction, "
                "overheating, battery problems, or devices failing to power on. "
                "Examples include a laptop not starting, a printer not working, "
                "or a broken monitor. Use this category for physical equipment "
                "problems rather than software or connectivity problems."
            ),

            "Account and Access": (
                "Identity, authentication, account, and access incidents "
                "involving login failures, forgotten passwords, account lockouts, "
                "MFA problems, authentication failures, permission errors, "
                "access denied messages, account provisioning, or user access "
                "restrictions. Examples include unable to sign in, password reset "
                "failure, locked account, or MFA verification problems. "
                "Choose this category when user identity or access permissions "
                "are the primary issue."
            ),

            "Email and Collaboration": (
                "Email, messaging, and collaboration service incidents involving "
                "Outlook, Microsoft Teams, email delivery, mailbox access, "
                "calendar synchronization, meeting failures, email attachments, "
                "shared collaboration tools, or communication service outages. "
                "Examples include Outlook not syncing, emails not being received, "
                "Teams calls failing, or calendar synchronization problems. "
                "Use this category when email or collaboration services are "
                "the primary affected system."
            ),

            "Database": (
                "Database incidents involving database server availability, "
                "database connection failures, connection pool exhaustion, "
                "SQL query errors, database performance degradation, "
                "database timeouts, data access failures, database corruption, "
                "or database service outages. Examples include PostgreSQL "
                "connection failures, database unavailable, or SQL queries "
                "timing out. Choose this category when the database itself "
                "is the primary technical issue."
            ),

            "General IT": (
                "General IT support issues, technical questions, miscellaneous "
                "IT problems, or incidents that do not clearly match network, "
                "cloud infrastructure, software, hardware, account access, "
                "email collaboration, or database categories. Use this category "
                "only when the primary issue cannot reasonably be assigned "
                "to one of the more specific ITSM categories."
            ),
        }

        category_result = predict(
            list(category_descriptions.values()),
            "This IT support incident or request involves {}.",
        )

        category_mapping = {
            description: category
            for category, description in category_descriptions.items()
        }

        category = category_mapping[category_result["label"]]
        
        # Correct category for account and authentication issues
        issue_lower = issue.lower()
        company_wide_scope = affected_users == "the entire company" or any(
            phrase in issue_lower
            for phrase in (
                "entire company", "company-wide", "company wide",
                "everyone", "all employees", "whole organization",
                "all users", "down for everyone",
            )
        )

        # Strong context override: production/business application outages
        # belong to Software, even if zero-shot predicts Email and Collaboration.
        # Keep this separate from impact/urgency so category does not change priority.
        production_application_keywords = [
            "production application",
            "production app",
            "production application outage",
            "production app outage",
            "production application is down",
            "production app is down",
            "production system outage",
            "application outage",
            "application is down",
            "app is down",
            "business application unavailable",
            "application unavailable",
            "production service outage",
            "customers are unable to use the service",
            "customers unable to use the service",
        ]

        if any(keyword in issue_lower for keyword in production_application_keywords):
            category = "Software"

        account_keywords = [
            "account locked",
            "account is locked",
            "my account is locked",
            "locked account",
            "account lockout",
            "locked out of my account",
            "mfa",
            "multi-factor authentication",
            "cannot log in",
            "login failure",
            "authentication failure",
            "password reset",
        ]

        network_keywords = [
            "vpn",
            "virtual private network",
            "wi-fi",
            "wifi",
            "dns",
            "network connectivity",
            "network connection",
            "network outage",
        ]

        software_keywords = [
            "application crashing",
            "app crashing",
            "software crashing",
            "application crash",
            "software error",
            "application error",
            "payroll application",
            "application not working",
        ]

        hardware_keywords = [
            "laptop screen",
            "screen flickering",
            "horizontal lines",
            "flickering screen",
            "monitor issue",
            "display issue",
            "keyboard not working",
            "mouse not working",
            "laptop overheating",
            "hardware failure",
        ]

        printer_keywords = [
            "printer", "printing", "print job", "print jobs", "office printer",
            "network printer", "printer queue", "printer not responding",
            "printer offline", "cannot print", "can't print", "unable to print",
            "not printing",
        ]
        mfa_keywords = [
            "mfa", "multi-factor authentication", "multifactor authentication",
            "authenticator app", "authentication code", "verification code",
            "push notification", "mfa push", "two-factor authentication",
            "2fa", "identity provider", "single sign-on", "sso",
        ]
        software_install_failure_keywords = [
            "installation failed", "install failed", "failed to install",
            "software installation error", "cannot install", "can't install",
            "unable to install", "installer error", "installation is failing",
        ]
        software_install_request_keywords = [
            "request to install", "request software", "need to install",
            "please install", "software request", "new software",
        ]
        itsm_ticket_failure_keywords = [
            "incident creation failed", "ticket creation failed",
            "failed to create incident", "unable to create ticket",
            "cannot create incident", "can't create ticket",
            "its m", "itsm", "helpdesk ticket submission",
            "ticket submission failed",
        ]

        is_printer_issue = any(keyword in issue_lower for keyword in printer_keywords)
        is_mfa_issue = any(keyword in issue_lower for keyword in mfa_keywords)
        is_install_failure = any(keyword in issue_lower for keyword in software_install_failure_keywords)
        is_install_request = any(keyword in issue_lower for keyword in software_install_request_keywords)
        is_itsm_ticket_failure = any(keyword in issue_lower for keyword in itsm_ticket_failure_keywords)
        is_production_application_outage = any(
            keyword in issue_lower for keyword in production_application_keywords
        )

        # Explicit context rules override broad zero-shot labels.
        if is_printer_issue:
            category = "Hardware"
        elif is_mfa_issue:
            category = "Account and Access"
        elif is_itsm_ticket_failure:
            category = "Software"
        elif is_production_application_outage:
            category = "Software"
        elif is_install_failure:
            category = "Software"
        elif any(keyword in issue_lower for keyword in account_keywords):
            category = "Account and Access"
        elif any(keyword in issue_lower for keyword in network_keywords):
            category = "Network and VPN"
        elif any(keyword in issue_lower for keyword in software_keywords):
            category = "Software"
        elif any(keyword in issue_lower for keyword in hardware_keywords):
            category = "Hardware"


        # QA-specific resolver/category overrides.
        slow_device_terms = (
            "slow laptop", "laptop is slow", "computer is slow", "slow computer",
            "slow desktop", "running very slowly", "running slowly", "computer is running slowly",
            "laptop is running slowly", "my computer is slow", "my laptop is slow",
            "computer freezing", "computer is freezing", "laptop freezing", "laptop is freezing",
            "device freezing", "device is freezing", "computer keeps freezing",
        )
        database_terms = ("connection pool", "postgresql", "database connection", "db connection", "database timeout")
        email_outage_terms = (
            "company-wide email outage", "company wide email outage", "email outage",
            "email is down", "mail service outage", "company email service is down",
            "company email is down", "email service is down", "email service down",
            "company email outage", "company email is unavailable", "email down for everyone",
            "email services are down for everyone", "email service is down for everyone",
            "entire company cannot access outlook", "entire company cannot access webmail",
            "company cannot access outlook", "company cannot access webmail",
            "webmail is down for everyone", "outlook is down for everyone",
        )
        suspicious_terms = ("suspicious login", "suspicious sign-in", "unexpected login", "unexpected sign-in", "account compromised", "phishing")
        itsm_error_terms = ("incident creation server error", "ticket creation server error", "ticket server error", "server error creating ticket", "server error while creating incident", "its m portal", "itsm portal", "helpdesk portal error", "ticket submission failed",
            "failed to create incident", "server error when i submit an incident",
            "server error when submitting an incident", "server error while submitting an incident",
            "portal shows a server error", "portal server error", "incident submission server error")
        if any(term in issue_lower for term in slow_device_terms) or any(
            term in issue_lower for term in ("computer freezing", "laptop freezing", "device freezing", "computer keeps freezing")
        ):
            category = "Hardware"
        if any(term in issue_lower for term in (
            "shared folder", "shared drive", "folder access", "access to folder",
            "permission denied", "access denied", "account is locked", "my account is locked",
            "account lockout", "locked out of my account", "locked account",
        )):
            category = "Account and Access"
        if any(term in issue_lower for term in ("outlook crash", "outlook crashes", "outlook crashing", "outlook keeps crashing")):
            category = "Email and Collaboration"
        if any(term in issue_lower for term in database_terms):
            category = "Database"
        if any(term in issue_lower for term in email_outage_terms) or (
            company_wide_scope and any(term in issue_lower for term in (
                "outlook", "webmail", "email", "mail service", "messaging"
            ))
        ):
            category = "Email and Collaboration"
        if any(term in issue_lower for term in suspicious_terms):
            category = "Account and Access"
        if any(term in issue_lower for term in itsm_error_terms):
            # The ITSM portal is a business application, not a generic IT issue.
            category = "Software"

        # Distinguish requesting new software from an existing installation failure.
        if is_install_request and not is_install_failure:
            intent = "Service Request"
        elif is_install_failure:
            intent = "Incident"


        if security_signal:
            intent = "Incident"
            category = "Account and Access"
        elif mfa_blocked_signal:
            intent = "Incident"
            category = "Account and Access"
        elif password_expiration_signal:
            # Password expiry is an identity/access issue, never a network/VPN issue.
            intent = "Incident"
            category = "Account and Access"
        elif password_lock_signal:
            intent = "Incident"
            category = "Account and Access"
        elif software_request_signal and not software_failure_signal:
            intent = "Service Request"
            category = "Software"
        elif software_failure_signal:
            intent = "Incident"
            category = "Software"
        elif resolved_signal:
            intent = "Incident Update"


        # Final deterministic guard: password expiration/recovery belongs to IAM.
        if password_expiration_signal:
            intent = "Incident"
            category = "Account and Access"

        # 3. AI business impact classification
        impact_result = predict(
            [
                "High business impact affecting many employees or a critical service",
                "Medium business impact affecting a department or important workflow",
                "Low business impact affecting one employee or a minor function",
            ],
            "The business impact of this IT issue is {}.",
        )

        impact_mapping = {
            "High business impact affecting many employees or a critical service": "High",
            "Medium business impact affecting a department or important workflow": "Medium",
            "Low business impact affecting one employee or a minor function": "Low",
        }

        
        impact = impact_mapping[impact_result["label"]]

        # Use the employee's clarification to determine business impact
        affected_users = str(clarification_answers.get("affected_users") or affected_users or "").strip().lower()

        impact_mapping_from_answer = {
            "only me": "Low",
            "my department": "Medium",
            "the entire company": "High",
        }

        if affected_users in impact_mapping_from_answer:
            impact = impact_mapping_from_answer[affected_users]


        # 4. AI urgency classification
        urgency_result = predict(
            [
                "High urgency requiring immediate attention",
                "Medium urgency requiring timely attention",
                "Low urgency that can wait for scheduled support",
            ],
            "The urgency of this IT issue is {}.",
        )

        urgency_mapping = {
            "High urgency requiring immediate attention": "High",
            "Medium urgency requiring timely attention": "Medium",
            "Low urgency that can wait for scheduled support": "Low",
        }

        urgency = urgency_mapping[urgency_result["label"]]

        # Adjust urgency for company-wide incidents
        affected_users = str(
            clarification_answers.get("affected_users") or affected_users or ""
        ).strip().lower()

        if intent == "Incident" and affected_users == "the entire company":
            urgency = "High"

        
        # Business context adjustment for widespread critical incidents
        issue_lower = issue.lower()

        widespread_outage = any(
            phrase in issue_lower
            for phrase in [
                "company-wide outage",
                "company wide outage",
                "affecting all employees",
                "all employees are affected",
                "entire organization",
                "organization-wide outage",
                "organization wide outage",
                "all users are affected",
                "entire company cannot access",
                "entire company cannot use",
                "company cannot access outlook",
                "company cannot access webmail",
                "email services are down for everyone",
                "email service is down for everyone",
                "outlook is down for everyone",
                "webmail is down for everyone",
                "email is unavailable for everyone",
                "mail is down for everyone",
                "down for everyone",
                "network outage affecting everyone",
            ]
        )

        critical_service_outage = any(
            phrase in issue_lower
            for phrase in [
                "production down",
                "critical service unavailable",
                "business-critical service down",
                "database outage affecting production",
            ]
        )

        company_wide_scope = affected_users == "the entire company" or any(
            phrase in issue_lower
            for phrase in (
                "entire company", "company-wide", "company wide",
                "everyone", "all employees", "whole organization",
                "all users", "down for everyone",
            )
        )

        if intent == "Incident" and (
            widespread_outage or critical_service_outage or company_wide_scope
        ):
            impact = "High"
            urgency = "High"

        # Suspicious sign-ins require prompt human security review. Raise urgency
        # and the impact floor without assigning every security case P1.
        if intent == "Incident" and security_signal:
            if impact == "Low":
                impact = "Medium"
            urgency = "High"


        # 5. ITSM priority matrix
        priority_matrix = {
            ("High", "High"): "P1 - Critical",
            ("High", "Medium"): "P2 - High",
            ("High", "Low"): "P3 - Medium",

            ("Medium", "High"): "P2 - High",
            ("Medium", "Medium"): "P3 - Medium",
            ("Medium", "Low"): "P4 - Low",

            ("Low", "High"): "P3 - Medium",
            # Low impact does not automatically mean low priority.
            # Medium urgency still needs timely attention, even for one employee.
            ("Low", "Medium"): "P3 - Medium",
            ("Low", "Low"): "P4 - Low",
        }

        priority = priority_matrix[(impact, urgency)]
        if intent != "Incident":
            priority = "Not applicable"
            impact = "Not applicable"
            urgency = "Not applicable"

        # Automatically escalate P1 Critical incidents
        escalated = intent == "Incident" and (
            priority == "P1 - Critical" or security_signal
        )

        # 6. Recommended support group
        group_mapping = {
            "Network and VPN": "Network Support",
            "Cloud Infrastructure": "Incident Management / SRE",
            "Software": "Application Support",
            "Hardware": "Hardware Support",
            "Account and Access": "Identity and Access Management (IAM) Support",
            "Email and Collaboration": "Messaging Support",
            "Database": "Database Support",
            "General IT": "ServiceDesk Tier-1 Queue",
        }

        group = group_mapping.get(
            category,
            "ServiceDesk Tier-1 Queue"
        )

        # Route specialist cases to the correct resolver group.
        if is_printer_issue:
            group = "Hardware and Print Support"
        elif security_signal:
            group = "Security Operations / IAM"
        elif is_mfa_issue or mfa_blocked_signal or password_lock_signal:
            group = "Identity and Access Management (IAM) Support"
        elif is_install_failure:
            group = "Software Deployment Support"
        elif is_itsm_ticket_failure or any(term in issue_lower for term in itsm_error_terms):
            group = "ITSM / ServiceDesk Support"
        elif any(term in issue_lower for term in database_terms):
            group = "Database Support"
        elif any(term in issue_lower for term in email_outage_terms) or (
            company_wide_scope and any(term in issue_lower for term in (
                "outlook", "webmail", "email", "mail service", "messaging"
            ))
        ):
            group = "Messaging Support"
        elif any(term in issue_lower for term in slow_device_terms) or any(
            term in issue_lower for term in ("computer freezing", "laptop freezing", "device freezing")
        ):
            group = "Endpoint Support"
        elif any(term in issue_lower for term in ("outlook crash", "outlook crashes", "outlook crashing", "outlook keeps crashing")):
            group = "Messaging Support"
        elif any(term in issue_lower for term in ("shared folder", "shared drive", "folder access", "access to folder", "permission denied", "access denied")):
            group = "Identity and Access Management (IAM) Support"

        # 7. Retrieve approved knowledge separately.
        # Knowledge retrieval does not determine AI priority.
        result = answer_question(payload.text)
        sources = result.get("sources", [])

        if intent == "Incident Update":
            result = {
                **result,
                "answer": "Thanks for confirming the issue is resolved. Please update the existing incident to Resolved, or contact the service desk with its incident ID. This chatbot will not create a duplicate incident.",
                "sources": [],
                "escalated": False,
                "answer_mode": "incident_update_guidance",
            }
            sources = []

        # Keep each zero-shot model score separate. These are raw model
        # ranking scores, NOT calibrated probabilities or verified accuracy.
        intent_model_score = round(intent_result["score"] * 100, 1)
        category_model_score = round(category_result["score"] * 100, 1)
        impact_model_score = round(impact_result["score"] * 100, 1)
        urgency_model_score = round(urgency_result["score"] * 100, 1)

        # Record whether the final decision came from the model or a rule.
        category_decision_source = (
            "keyword_override" if category != category_mapping[category_result["label"]]
            else "zero_shot_model"
        )
        impact_decision_source = (
            "business_context_rule"
            if (intent == "Incident" and (widespread_outage or critical_service_outage))
            else "employee_clarification"
            if affected_users in impact_mapping_from_answer
            else "zero_shot_model"
        )
        urgency_decision_source = (
            "business_context_rule"
            if (
                (intent == "Incident" and affected_users == "the entire company")
                or (intent == "Incident" and (widespread_outage or critical_service_outage))
            )
            else "zero_shot_model"
        )

        # Retain a legacy aggregate for API compatibility, but explicitly
        # mark it as an uncalibrated average rather than an accuracy value.
        confidence = round(
            (
                intent_model_score
                + category_model_score
                + impact_model_score
                + urgency_model_score
            ) / 4,
            1,
        )

        priority_reasoning = (
            "Priority is not applicable to this request type. Impact and urgency are scored only for incidents."
            if intent != "Incident"
            else (
                f"Business impact is {impact.lower()} based on the affected-user "
                f"scope and critical-service context. Urgency is {urgency.lower()} "
                f"based on reported symptoms and business context. Impact and urgency "
                f"were evaluated separately. The configured matrix maps {impact.lower()} "
                f"impact plus {urgency.lower()} urgency to {priority}."
            )
        )

        if intent in {"Knowledge Question", "Service Request", "Incident Update"}:
            escalated = False

        # 8. Return frontend-compatible response
        return {
            "success": True,
            "predictedCategory": category,
            "intent": intent,
            "triageMethod": (
                "Hugging Face AI zero-shot classification"
                if triage_classifier is not None
                else "Rule-based fallback (Hugging Face model unavailable)"
            ),
            # Legacy aggregate: uncalibrated mean of four model scores.
            "confidence": confidence,
            "confidenceScore": confidence,
            "confidenceType": "uncalibrated_average_model_score_not_accuracy",
            "modelScores": {
                "intent": {
                    "label": intent,
                    "score": intent_model_score,
                    "decisionSource": intent_result.get("decisionSource", "zero_shot_model"),
                },
                "category": {
                    "modelLabel": category_mapping[category_result["label"]],
                    "finalLabel": category,
                    "score": category_model_score,
                    "decisionSource": category_result.get("decisionSource", category_decision_source),
                },
                "impact": {
                    "modelLabel": impact_mapping[impact_result["label"]],
                    "finalLabel": impact,
                    "score": impact_model_score,
                    "decisionSource": impact_result.get("decisionSource", impact_decision_source),
                },
                "urgency": {
                    "modelLabel": urgency_mapping[urgency_result["label"]],
                    "finalLabel": urgency,
                    "score": urgency_model_score,
                    "decisionSource": urgency_result.get("decisionSource", urgency_decision_source),
                },
            },
            "suggestedPriority": priority,
            "impact": impact,
            "urgency": urgency,
            "priorityReasoning": priority_reasoning,
            "sentiment": "Requires agent confirmation",
            "sentimentScore": "Not evaluated",
            "recommendedGroup": group,
            "matchedRunbook": (
                ", ".join(
                    source["article_id"] + ": " + source["title"]
                    for source in sources
                )
                if sources
                else "No approved runbook matched"
            ),
            "deflectionFeasibility": (
                "Knowledge-supported; agent confirmation recommended"
                if sources
                else "Escalate to human support"
            ),
            "safetyAssessment": (
                "AI classification is a recommendation. "
                "Verify impact and urgency before critical actions."
            ),
            "selectionReason": (
                "Category selected using the zero-shot model with ITSM-specific rule overrides for security, access, software, endpoint, database, messaging, and portal issues."
            ),
            "canCreateTicket": intent in {"Incident", "Unsupported / Human Review"},
            "canUpdateIncident": intent == "Incident Update",
            "categoryDecisionSource": category_decision_source,
            "answer": result.get("answer"),
            "possibleCause": result.get("possibleCause"),
            "possibleCauseMode": result.get("possibleCauseMode"),
            "sources": sources,
            # Classification is returned immediately for queue-wide auto-analysis.
            # Any clarification is optional follow-up context, not a blocker.
            "needsClarification": bool(clarification_question),
            "clarificationQuestion": clarification_question,
            "clarificationOptions": clarification_options,
            "original_issue": original_issue,
            "clarification_key": clarification_key,
            "retrievalSimilarity": (
                round(float(result.get("confidence", 0.0)) * 100, 1)
                if isinstance(result.get("confidence"), (int, float))
                else next((source.get("score") for source in sources if isinstance(source.get("score"), (int, float))), None)
            ),
            "retrievalSimilarityType": "knowledge_retrieval_score",
            "escalationReason": (
                "High-priority/security incident requires human review."
                if escalated
                else "No backend escalation reason returned."
            ),
            "escalated": escalated,
            "retrievalMode": result.get("retrieval_mode"),
            "answerMode": result.get("answer_mode"),
        }

    except HTTPException:
        raise

    except (PyMongoError, RuntimeError) as exc:
        raise HTTPException(
            status_code=503,
            detail="Triage unavailable because the knowledge database is unavailable."
        ) from exc

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
    """Run a safe, assessment-only self-healing simulation.

    The frontend and backend use the same incident query and selected KB ID.
    Retrieval confidence is similarity (not a probability). The article must
    still exist in MongoDB and be approved before the simulation can succeed.
    """
    try:
        db = get_database()
        CONFIDENCE_THRESHOLD = 40.0

        # This mirrors AutoResolution.jsx:
        # `${currentScenario.issue || ''} ${currentScenario.scenarioName || ''}`
        search_query = f"{payload.issue or ''} {payload.scenarioName or ''}".strip()
        if not search_query:
            search_query = payload.ticketId

        # Search the same approved knowledge source used by the frontend.
        search_results = search_knowledge(search_query, "ALL", limit=10)

        requested_article_id = (
            payload.matchedKnowledgeArticleId or payload.runbookId
        )

        matched = None
        if requested_article_id:
            matched = next(
                (
                    item for item in search_results
                    if str(item.get("article_id") or item.get("id"))
                    == str(requested_article_id)
                ),
                None,
            )
        elif search_results:
            matched = search_results[0]
            requested_article_id = matched.get("article_id") or matched.get("id")

        # Validate approval directly in MongoDB. Do not trust the frontend's
        # article ID or approval flag by itself.
        approved_article = None
        if requested_article_id:
            approved_article = db["knowledge_articles"].find_one(
                {"article_id": str(requested_article_id), "approved": True}
            )

        # If the selected article was returned by the frontend but isn't in
        # this search result (for example, a temporarily stale vector index),
        # use its approved DB record and the frontend's retrieval score as a
        # fallback. Never use this fallback without an approved article.
        if matched is None and approved_article:
            matched = {
                "article_id": approved_article.get("article_id"),
                "id": approved_article.get("article_id"),
                "title": approved_article.get("title"),
                "category": approved_article.get("category"),
                "source_document": approved_article.get("source_document"),
                "content": approved_article.get("content", ""),
                "troubleshooting_instructions": (
                    approved_article.get("troubleshooting_instructions") or []
                ),
                "score": None,
                "retrieval_mode": "approved_article_frontend_score_fallback",
            }

        # Prefer the backend score for the exact selected article. If it was
        # not available, use the frontend score (after validating the article).
        raw_confidence = None
        if matched and matched.get("score") is not None:
            raw_confidence = matched.get("score")
        elif approved_article is not None:
            raw_confidence = payload.retrievalSimilarityPercent

        try:
            confidence = float(raw_confidence) if raw_confidence is not None else 0.0
        except (TypeError, ValueError):
            confidence = 0.0

        # search_knowledge scores are normally 0..1; frontend values are 0..100.
        if 0.0 <= confidence <= 1.0:
            confidence_percent = confidence * 100.0
        else:
            confidence_percent = confidence
        confidence_percent = round(max(0.0, min(100.0, confidence_percent)), 1)

        eligible = payload.isEligibleForAutoRemediation is True
        risk_level = str(payload.riskLevel or "").strip().lower()
        high_risk = risk_level in {"critical", "high", "high risk"}
        explicitly_escalated = payload.isEscalated is True
        meets_threshold = confidence_percent >= CONFIDENCE_THRESHOLD
        has_approved_match = bool(matched and approved_article)

        # Ignore answer_question().get("escalated") here: that endpoint uses
        # a separate RAG human-review threshold. Auto-resolution is based on
        # this exact selected article, its retrieval score, and safety gates.
        safe = (
            has_approved_match
            and meets_threshold
            and eligible
            and not high_risk
            and not explicitly_escalated
        )

        reasons = []
        if not has_approved_match:
            reasons.append("No selected approved knowledge article was found")
        if not meets_threshold:
            reasons.append(
                f"Retrieval confidence {confidence_percent}% is below the "
                f"{CONFIDENCE_THRESHOLD}% threshold"
            )
        if not eligible:
            reasons.append("Incident is not eligible for automatic remediation")
        if high_risk:
            reasons.append("High-risk action requires human approval")
        if explicitly_escalated:
            reasons.append("Incident is already escalated and requires human review")

        if safe:
            status = "Completed (Simulated)"
            execution_status = "Success"
            result_text = (
                "Automatic remediation simulation completed successfully. "
                f"Retrieval confidence: {confidence_percent}%. "
                "No endpoint, account, network, or production configuration "
                "was changed."
            )
            steps = [
                "Approved knowledge article verified",
                f"Retrieval confidence: {confidence_percent}%",
                "Confidence threshold satisfied",
                "Incident eligibility verified",
                "Safety checks passed",
                "Automatic simulation completed successfully",
            ]
        else:
            status = "Escalated to Human Tier 3"
            execution_status = "Failed"
            result_text = (
                "Simulation blocked and escalated: "
                + "; ".join(reasons or ["Human review required"])
                + ". No change was made."
            )
            steps = [
                "Safety policy evaluated",
                "Automatic simulation blocked",
                "Human support escalation recorded",
            ]

        audit = write_audit(
            db,
            "Self-heal assessment simulation",
            payload.ticketId,
            execution_status,
            result_text,
            {
                "scenarioId": payload.scenarioId,
                "runbookId": payload.runbookId,
                "scenarioName": payload.scenarioName,
                "matchedKnowledgeArticleId": (
                    matched.get("article_id") if matched else None
                ),
                "confidence": confidence_percent,
                "confidenceThreshold": CONFIDENCE_THRESHOLD,
                "status": status,
                "steps": steps,
                "simulationOnly": True,
            },
        )

        return {
            "success": True,
            "ticketId": payload.ticketId,
            "status": status,
            "executionStatus": execution_status,
            "result": result_text,
            "escalationReason": "; ".join(reasons) if not safe else None,
            "steps": steps,
            "isSimulated": True,
            "confidence": confidence_percent / 100.0,
            "confidencePercent": confidence_percent,
            "confidenceThreshold": CONFIDENCE_THRESHOLD,
            "sources": search_results,
            "escalated": not safe,
            "auditLog": audit,
        }

    except (PyMongoError, RuntimeError) as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "Simulation could not be recorded. "
                "No resolution status was changed."
            ),
        ) from exc



@app.post("/api/knowledge/rebuild")
def rebuild_knowledge_index():
    try:
        result = rebuild_index()
        return {
            "success": True,
            "message": "Knowledge base index rebuilt successfully",
            **result
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to rebuild knowledge index: {str(exc)}"
        )

@app.post("/api/auto-resolution/approve")
def approve_resolution(payload: ResolutionApprovalRequest):
    try:
        db = get_database()
        audit = write_audit(db, "Human-approved assessment simulation", payload.ticketId, "Success", "Approval was recorded for the assessment simulation only. No real remediation or production change was performed.", {"approverName": payload.approverName, "approvalNotes": payload.approvalNotes, "simulationOnly": True})
        return {"success": True, "status": "Human Approved (Simulated)", "isSimulated": True, "auditLog": audit, "message": "Approval recorded for simulation only; no real change was made."}
    except (PyMongoError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail="Approval could not be recorded.") from exc

@app.get("/api/anomaly-clusters")
def get_anomaly_clusters():
    """Return clusters derived from stored incidents, never fabricated demo cards."""
    try:
        db = get_database()
        records = list(db["incidents"].find({}).sort("created_at", -1).limit(500))
        rules = [
            ("VPN / Network Connectivity", ("vpn", "wi-fi", "wifi", "network connection", "network connectivity")),
            ("Email & Collaboration", ("outlook", "webmail", "email outage", "mailbox", "teams")),
            ("Database Availability", ("postgres", "postgresql", "database unavailable", "database down", "connection pool")),
            ("Identity & MFA", ("mfa", "password expired", "password reset", "account locked", "login failure", "cannot log in")),
            ("Software Installation", ("software install", "installation failed", "install failed", "application install")),
        ]

        groups = {}
        for item in records:
            text = " ".join(str(item.get(key) or "") for key in ("title", "description", "category")).lower()
            matched_name = None
            for name, terms in rules:
                if any(term in text for term in terms):
                    matched_name = name
                    break
            if not matched_name:
                category = str(item.get("category") or "Uncategorized").strip()
                if category.lower() in {"", "other", "general", "not categorized"}:
                    continue
                matched_name = f"{category} incidents"
            groups.setdefault(matched_name, []).append(item)

        clusters = []
        for name, items in groups.items():
            if len(items) < 2:
                continue
            ids = [str(item.get("incident_id") or item.get("ticket_id") or item.get("_id")) for item in items]
            timestamps = [str(item.get("created_at") or item.get("createdAt") or "") for item in items]
            clusters.append({
                "id": "CL-" + re.sub(r"[^A-Z0-9]+", "-", name.upper()).strip("-")[:24],
                "title": name,
                "category": name,
                "incidentCount": len(items),
                "affectedIncidentIds": ids,
                "incidentTitles": [str(item.get("title") or item.get("description") or "Untitled incident")[:180] for item in items],
                "latestReportedAt": max(timestamps) if timestamps else None,
                "rootCauseHypothesis": "These incidents share keywords or a category. Review their timelines and technical evidence before confirming a common root cause.",
                "recommendedAction": "Compare affected services, timestamps, error messages and recent changes; escalate to the owning resolver group if a shared outage is confirmed.",
                "status": "Needs correlation review",
                "source": "MongoDB incident records",
            })
        clusters.sort(key=lambda cluster: cluster["incidentCount"], reverse=True)
        return {"success": True, "source": "MongoDB incident records", "totalIncidentsScanned": len(records), "totalClusters": len(clusters), "items": clusters}
    except (PyMongoError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail="Incident clusters could not be calculated from stored records.") from exc


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

