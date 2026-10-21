import os
from pathlib import Path

from dotenv import load_dotenv

# backend/ folder (this file is backend/app/config.py)
BASE_DIR = Path(__file__).resolve().parents[1]
# repo root, where frontend/ lives
ROOT_DIR = BASE_DIR.parent

load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("SECRET_KEY", "")
TELEGRAM_BOT_USERNAME = os.getenv("TELEGRAM_BOT_USERNAME", "").lstrip("@")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")
# backup models, tried in order if the main one is busy or missing (comma separated)
GEMINI_FALLBACK_MODELS = [
    m.strip() for m in os.getenv("GEMINI_FALLBACK_MODELS", "gemini-flash-lite-latest").split(",") if m.strip()
]

TOKEN_EXPIRE_DAYS = 7

# Locally we use a SQLite file. In production set DATABASE_URL to a Postgres address
# (for example from Neon). The prefix is adjusted so SQLAlchemy uses the psycopg driver.
_db = os.getenv("DATABASE_URL", "").strip()
if _db.startswith("postgres://"):
    _db = "postgresql://" + _db[len("postgres://"):]
if _db.startswith("postgresql://"):
    _db = "postgresql+psycopg://" + _db[len("postgresql://"):]
DATABASE_URL = _db or f"sqlite:///{BASE_DIR / 'auraq.db'}"
IS_SQLITE = DATABASE_URL.startswith("sqlite")

# The public https address of the deployed site, for example https://auraq.onrender.com.
# When set, the server tells Telegram to deliver messages to it (a "webhook").
PUBLIC_URL = os.getenv("PUBLIC_URL", "").strip().rstrip("/")

# Abuse protection for a public site
SIGNUP_LIMIT_PER_HOUR = int(os.getenv("SIGNUP_LIMIT_PER_HOUR", "10"))   # per visitor address
DAILY_MESSAGE_LIMIT = int(os.getenv("DAILY_MESSAGE_LIMIT", "300"))      # customer messages per shop per day
FRONTEND_DIR = ROOT_DIR / "frontend"

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is missing. Add it to backend/.env")
