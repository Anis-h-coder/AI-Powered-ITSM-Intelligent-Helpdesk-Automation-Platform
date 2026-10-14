"""Knowledge ingestion and retrieval for the ITSM assessment.

Uses SentenceTransformers + ChromaDB when installed. The explicit lexical fallback
is only for local smoke testing and is reported as such by /api/health.
"""
from __future__ import annotations

import os
import re
from typing import Any

from backend.database import get_database

SAMPLE_ARTICLES: list[dict[str, Any]] = [
    {
        "article_id": "KB-1001", "title": "VPN Connection Troubleshooting", "category": "Network & VPN",
        "source_document": "SOP-NET-014-VPN-Client-Resolution.md", "approved": True,
        "content": "VPN connection troubleshooting. First confirm the employee has an active network connection and can open an approved public website. Confirm the VPN client is up to date and record the exact error message. Ask the employee to disconnect and reconnect using the company-approved VPN profile. Check whether the issue affects one employee or multiple employees. Do not disable endpoint protection, bypass MFA, share access tokens, or change production network settings. If authentication fails repeatedly, the device is non-compliant, or multiple employees are affected, escalate to Network Support with the timestamp, client version, and error details.",
        "troubleshooting_instructions": ["Verify ordinary internet connectivity", "Reconnect using the approved VPN profile", "Capture the exact error and client version", "Escalate repeated authentication failures or multi-user impact"],
        "tags": ["vpn", "network", "remote access"],
    },
    {
        "article_id": "KB-1002", "title": "Password Expiration and Account Recovery", "category": "Identity & Access",
        "source_document": "SOP-SEC-002-Password-Recovery-Standard.md", "approved": True,
        "content": "Password expiration and account recovery. Use only the organization's approved self-service password reset page or identity provider workflow. Complete the required identity verification before resetting credentials. Never ask an employee to send a password, one-time code, recovery code, or session token to support. If MFA is unavailable, the account is locked after repeated attempts, or identity verification fails, stop and escalate to Identity and Access Management. A helpdesk simulation cannot issue credentials or unlock a real account.",
        "troubleshooting_instructions": ["Open the approved self-service password reset workflow", "Complete identity verification", "Never share passwords or one-time codes", "Escalate failed verification or persistent lockout"],
        "tags": ["password", "expired", "account", "mfa", "identity"],
    },
    {
        "article_id": "KB-1003", "title": "Outlook Email Synchronization Troubleshooting", "category": "Email & O365",
        "source_document": "SOP-M365-021-Outlook-Sync-Remediation.md", "approved": True,
        "content": "Outlook synchronization troubleshooting. Check the service health notice and confirm network connectivity. Confirm Outlook is not in Work Offline mode and note any displayed sync error. Save open work before restarting Outlook. Compare behavior with the approved webmail client to help isolate a desktop-client issue. Do not delete a mailbox, remove user data, or rebuild a profile without the approved support procedure and user confirmation. If webmail is also unavailable or several users are affected, escalate to the messaging team with timestamps and error details.",
        "troubleshooting_instructions": ["Check service health and network connectivity", "Confirm Work Offline is disabled", "Compare with approved webmail", "Escalate if multiple users or webmail are affected"],
        "tags": ["outlook", "email", "sync", "microsoft 365"],
    },
    {
        "article_id": "KB-1004", "title": "Enterprise Wi-Fi Connectivity", "category": "Network & Connectivity",
        "source_document": "SOP-NET-008-Enterprise-WiFi-Diagnostics.md", "approved": True,
        "content": "Enterprise Wi-Fi connectivity. Verify Wi-Fi is enabled and the employee is in a supported coverage area. Confirm the employee selected the official corporate SSID and that device date and time are correct. Reconnect using the approved enterprise authentication flow. Do not bypass certificate validation or install an unknown certificate. If the device reports certificate or enterprise authentication errors, capture the message and escalate to Network Support. If the issue affects a whole site, treat it as a potential major incident and notify the service desk.",
        "troubleshooting_instructions": ["Verify Wi-Fi is enabled and coverage is available", "Select the official corporate SSID", "Reconnect through enterprise authentication", "Do not bypass certificate validation; escalate certificate errors"],
        "tags": ["wifi", "wi-fi", "wireless", "network"],
    },
    {
        "article_id": "KB-1005", "title": "Software Installation and VS Code Requests", "category": "Software & Licensing",
        "source_document": "SOP-APP-001-Software-Catalog.md", "approved": True,
        "content": "Software installation requests. Employees must submit a service request for the requested application, business purpose, device, and department. IT checks the approved software catalog, license availability, security requirements, and any manager approval requirement. Only approved packages may be installed by the managed deployment tool. A submitted request is not proof that software has been installed. In this assessment environment, provisioning is a mock workflow: it records request status but does not install software on a device. Requests for unlisted or paid software must be reviewed by IT Asset Management.",
        "troubleshooting_instructions": ["Submit a service request with application and business purpose", "Check the approved software catalog and license", "Obtain required approval", "Use managed deployment; assessment mock does not install software"],
        "tags": ["software", "installation", "vscode", "visual studio code", "provisioning"],
    },
    {
        "article_id": "KB-1006", "title": "Infrastructure Outage and Major Incident Protocol", "category": "Cloud Infrastructure",
        "source_document": "SOP-SRE-009-Major-Incident-Protocol.md", "approved": True,
        "content": "Infrastructure outage protocol. Record the affected service, start time, error messages, business impact, and whether more than one team is affected. Check the approved service-health dashboard if access is available. Do not restart production services, change database configuration, rotate secrets, or scale infrastructure automatically from a helpdesk simulation. Escalate suspected production outage immediately to the on-call SRE or incident commander. Keep employee-facing updates factual and do not claim recovery until an authorized health check confirms it.",
        "troubleshooting_instructions": ["Capture affected service, timestamp, and business impact", "Check approved service-health dashboard", "Do not change production infrastructure from the helpdesk simulation", "Escalate immediately to on-call SRE for suspected outage"],
        "tags": ["outage", "database", "production", "infrastructure", "rds", "sre"],
    },
]

_embedder = None
_chroma_client = None
_collection = None
_vector_error: str | None = None


def _normalise_article(raw: dict[str, Any]) -> dict[str, Any]:
    return {
        "article_id": str(raw.get("article_id") or raw.get("id") or "").strip(),
        "title": str(raw.get("title") or "").strip(),
        "category": str(raw.get("category") or "General").strip(),
        "source_document": str(raw.get("source_document") or raw.get("sourceDocument") or "uploaded-knowledge.md").strip(),
        "approved": bool(raw.get("approved", True)),
        "content": str(raw.get("content") or raw.get("body") or raw.get("shortDescription") or "").strip(),
        "troubleshooting_instructions": raw.get("troubleshooting_instructions") or raw.get("troubleshootingInstructions") or [],
        "tags": raw.get("tags") or [],
        "updated_at": raw.get("updated_at"),
    }


def seed_sample_articles() -> int:
    """Seed approved assessment examples only when the knowledge collection is empty."""
    db = get_database()
    collection = db["knowledge_articles"]
    if collection.count_documents({}) > 0:
        return 0
    now_count = 0
    for item in SAMPLE_ARTICLES:
        doc = {**item}
        doc["updated_at"] = doc.get("updated_at") or __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()
        collection.update_one({"article_id": doc["article_id"]}, {"$setOnInsert": doc}, upsert=True)
        now_count += 1
    return now_count


def _load_vector_stack():
    global _embedder, _chroma_client, _collection, _vector_error
    if _collection is not None and _embedder is not None:
        return _embedder, _collection
    try:
        import chromadb
        from sentence_transformers import SentenceTransformer
        persist_dir = os.getenv("CHROMA_PERSIST_DIR", "./.chroma")
        model_name = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
        _chroma_client = chromadb.PersistentClient(path=persist_dir)
        _collection = _chroma_client.get_or_create_collection(name="itsm_knowledge", metadata={"hnsw:space": "cosine"})
        _embedder = SentenceTransformer(model_name)
        _vector_error = None
        return _embedder, _collection
    except Exception as exc:
        _vector_error = f"{type(exc).__name__}: {exc}"
        return None, None


def vector_status() -> dict[str, Any]:
    embedder, collection = _load_vector_stack()
    return {"status": "ready" if embedder is not None and collection is not None else "unavailable", "provider": "ChromaDB + SentenceTransformers" if embedder is not None else "lexical_fallback", "model": os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2") if embedder is not None else None, "detail": None if embedder is not None else "Install chromadb and sentence-transformers to enable semantic vector search."}


def _documents() -> list[dict[str, Any]]:
    docs = list(get_database()["knowledge_articles"].find({"approved": True}).limit(500))
    for d in docs:
        d["_id"] = str(d.get("_id", ""))
    return docs


def _normalise_tokens(text: str) -> set[str]:
    stop_words = {
        "the", "a", "an", "and", "or", "to", "for", "of", "in", "on",
        "is", "are", "was", "were", "my", "me", "i", "we", "it", "this",
        "that", "with", "from", "at", "as", "be", "can", "could", "please",
        "help", "issue", "problem", "not", "working", "unable", "having",
    }
    aliases = {
        "connecting": "connect", "connected": "connect", "connection": "connect",
        "connections": "connect", "disconnecting": "disconnect",
        "disconnected": "disconnect", "emails": "email", "mailbox": "email",
        "passwords": "password", "expired": "expire", "expiration": "expire",
        "installing": "install", "installed": "install", "installation": "install",
    }
    tokens = set()
    for token in re.findall(r"[a-z0-9]+", text.lower()):
        if token not in stop_words:
            tokens.add(aliases.get(token, token))
    return tokens


def _lexical_score(query: str, text: str) -> float:
    query_tokens = _normalise_tokens(query)
    content_tokens = _normalise_tokens(text)
    if not query_tokens:
        return 0.0
    shared = len(query_tokens & content_tokens)
    return round(min(shared / min(len(query_tokens), 8), 1.0), 4) if shared else 0.0


def rebuild_index() -> dict[str, Any]:
    docs = _documents()
    embedder, collection = _load_vector_stack()
    if not embedder or not collection:
        return {"indexed": 0, "mode": "lexical_fallback", "detail": "Vector dependencies unavailable; articles remain searchable lexically."}
    ids, texts, metas = [], [], []
    for doc in docs:
        article_id = doc.get("article_id") or str(doc.get("_id"))
        ids.append(article_id)
        texts.append(f"{doc.get('title','')}\n{doc.get('category','')}\n{doc.get('content','')}\nTags: {' '.join(doc.get('tags') or [])}")
        metas.append({"article_id": article_id, "title": str(doc.get("title", "")), "category": str(doc.get("category", "")), "source_document": str(doc.get("source_document", ""))})
    if ids:
        # Chroma upsert updates changed content without duplicate IDs.
        vectors = embedder.encode(texts, normalize_embeddings=True).tolist()
        collection.upsert(ids=ids, documents=texts, metadatas=metas, embeddings=vectors)
    return {"indexed": len(ids), "mode": "semantic_vector_search"}


def search_knowledge(query: str, category: str = "ALL", limit: int = 5) -> list[dict[str, Any]]:
    q = query.strip()
    if not q:
        return []
    docs = _documents()
    if category and category != "ALL":
        docs = [d for d in docs if d.get("category") == category]
    embedder, collection = _load_vector_stack()
    vector_hits: dict[str, dict[str, Any]] = {}
    vector_search_available = bool(embedder and collection and collection.count() > 0)
    if vector_search_available:
        try:
            vector = embedder.encode([q], normalize_embeddings=True).tolist()
            result = collection.query(
                query_embeddings=vector,
                n_results=min(max(limit * 3, limit), max(collection.count(), 1)),
            )
            ids = (result.get("ids") or [[]])[0]
            distances = (result.get("distances") or [[]])[0]
            for article_id, distance in zip(ids, distances):
                vector_hits[article_id] = {
                    "score": round(max(0.0, 1.0 - float(distance)), 4),
                    "mode": "semantic_vector_search",
                }
        except Exception:
            vector_hits = {}
            vector_search_available = False

    results = []
    for doc in docs:
        article_id = doc.get("article_id") or doc.get("_id")
        title = str(doc.get("title", ""))
        category_name = str(doc.get("category", ""))
        tags = doc.get("tags") or []
        content = str(doc.get("content", ""))
        lexical = _lexical_score(
            q, f"{title} {category_name} {' '.join(tags)} {content[:1200]}"
        )
        hit = vector_hits.get(article_id)

        if vector_search_available and vector_hits:
            # Do not mix lexical-only results into a semantic result set.
            if not hit:
                continue
            semantic = hit["score"]
            # Prefer articles whose topic words also overlap with the query.
            score = (0.75 * semantic + 0.25 * lexical) if lexical > 0 else (0.65 * semantic)
            mode = "hybrid_semantic_lexical"
        else:
            score = lexical
            mode = "lexical_fallback"

        if score > 0:
            results.append({
                "article_id": article_id,
                "id": article_id,
                "title": doc.get("title"),
                "category": doc.get("category"),
                "source_document": doc.get("source_document"),
                "content": content,
                "troubleshooting_instructions": doc.get("troubleshooting_instructions", []),
                "tags": tags,
                "score": round(score, 4),
                "retrieval_mode": mode,
            })
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:limit]


def answer_question(question: str, category: str = "ALL") -> dict[str, Any]:
    matches = search_knowledge(question, category, limit=4)
    threshold = float(os.getenv("RAG_MIN_SCORE", "0.45"))
    relevant = [m for m in matches if m["score"] >= threshold]
    if not relevant:
        return {"answer": "I couldn't find an approved knowledge article that supports an answer. This request should be escalated to the IT support team for human review.", "confidence": 0.0, "escalated": True, "sources": [], "retrieval_mode": vector_status()["provider"], "answer_mode": "no_supported_evidence"}
    context = "\n\n".join(f"[{m['article_id']}] {m['title']} ({m['source_document']}): {m['content']}" for m in relevant)
    # Local Hugging Face generation is optional and must be explicitly configured.
    model_name = os.getenv("HF_TEXT_MODEL", "").strip()
    answer = None
    answer_mode = "grounded_extract"
    if model_name:
        try:
            from transformers import pipeline
            generator = _get_text_generator(model_name)
            prompt = ("Answer the IT support question using only the approved context. If the context does not answer it, say it is not covered and recommend escalation. Cite article IDs in brackets.\n\n" f"Context:\n{context}\n\nQuestion: {question}\nAnswer:")
            generated = generator(prompt, max_new_tokens=180, do_sample=False)
            answer = generated[0].get("generated_text", "").replace(prompt, "").strip()
            answer_mode = f"huggingface:{model_name}"
        except Exception:
            answer = None
    if not answer:
        answer = "Based on the approved knowledge article(s):\n" + "\n".join(f"• {m['title']}: {m['content']}" for m in relevant)
    top_score = max(m["score"] for m in relevant)
    return {"answer": answer, "confidence": top_score, "escalated": top_score < 0.35, "sources": [{"article_id": m["article_id"], "title": m["title"], "source_document": m["source_document"], "score": m["score"]} for m in relevant], "retrieval_mode": relevant[0]["retrieval_mode"], "answer_mode": answer_mode}

_text_generator = None
_text_generator_model = None

def _get_text_generator(model_name: str):
    global _text_generator, _text_generator_model
    if _text_generator is None or _text_generator_model != model_name:
        from transformers import pipeline
        _text_generator = pipeline("text2text-generation", model=model_name) if "t5" in model_name.lower() or "bart" in model_name.lower() else pipeline("text-generation", model=model_name)
        _text_generator_model = model_name
    return _text_generator
