
import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient

# Locate the project root and explicitly load its .env file.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = PROJECT_ROOT / ".env"

load_dotenv(ENV_FILE, override=True)

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "ISTM")

client = None
db = None


def connect_to_mongodb():
    """Connect to MongoDB and verify connectivity with a real ping."""
    global client, db

    if not MONGODB_URI:
        raise RuntimeError(
            f"MONGODB_URI is missing or empty in {ENV_FILE}"
        )

    # Close any previous client before reconnecting.
    if client is not None:
        client.close()

    client = MongoClient(
        MONGODB_URI,
        serverSelectionTimeoutMS=10000,
        connectTimeoutMS=10000,
        appname="ITSM-AI-Platform",
    )

    try:
        # This performs an actual server connectivity check.
        client.admin.command("ping")

        db = client[MONGODB_DATABASE]

        print(
            f"MongoDB connection verified. "
            f"Database: {MONGODB_DATABASE}"
        )

        return db

    except Exception as exc:
        client.close()
        client = None
        db = None

        # Print the error type and message, never the URI.
        print(
            f"MongoDB connection failed: "
            f"{type(exc).__name__}: {exc}"
        )

        raise RuntimeError(
            "MongoDB connection could not be verified. "
            "Check the terminal for the error details."
        ) from exc


def get_database():
    """Return the connected database or raise an explicit error."""
    if db is None:
        raise RuntimeError(
            "MongoDB is not connected. "
            "Call connect_to_mongodb() first."
        )

    return db


def close_mongodb():
    """Close the MongoDB client and reset the connection state."""
    global client, db

    if client is not None:
        client.close()

    client = None
    db = None
