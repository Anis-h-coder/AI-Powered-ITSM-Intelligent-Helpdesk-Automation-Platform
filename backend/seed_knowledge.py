"""Import the assessment Markdown knowledge documents into MongoDB and rebuild Chroma index.
Run from project root: python -m backend.seed_knowledge
"""
from datetime import datetime, timezone
from pathlib import Path
import re

from backend.database import connect_to_mongodb, close_mongodb
from backend.knowledge_base import rebuild_index

DOCS = Path(__file__).resolve().parent / "knowledge_documents"

def main():
    db = connect_to_mongodb()
    try:
        imported = 0
        for path in sorted(DOCS.glob("*.md")):
            content = path.read_text(encoding="utf-8")
            title_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
            category_match = re.search(r"^Category:\s*(.+)$", content, re.MULTILINE)
            article = {
                "article_id": path.stem,
                "title": title_match.group(1).strip() if title_match else path.stem,
                "category": category_match.group(1).strip() if category_match else "General",
                "source_document": path.name,
                "content": content,
                "approved": True,
                "approval_note": "Assessment sample; replace with organization-approved SOP before production use.",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            db["knowledge_articles"].update_one({"article_id": article["article_id"]}, {"$set": article}, upsert=True)
            imported += 1
        index_result = rebuild_index()
        print(f"Imported {imported} documents. Index result: {index_result}")
    finally:
        close_mongodb()

if __name__ == "__main__":
    main()
