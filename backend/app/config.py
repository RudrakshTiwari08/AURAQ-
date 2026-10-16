import os
from pathlib import Path

from dotenv import load_dotenv

# backend/ folder (this file is backend/app/config.py)
BASE_DIR = Path(__file__).resolve().parents[1]
# repo root, where frontend/ lives
ROOT_DIR = BASE_DIR.parent

load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("SECRET_KEY", "")
TELEGRAM_BOT_USERNAME = os.getenv("TELEGRAM_BOT_USERNAME", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")

TOKEN_EXPIRE_DAYS = 7
DATABASE_URL = f"sqlite:///{BASE_DIR / 'auraq.db'}"
FRONTEND_DIR = ROOT_DIR / "frontend"

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is missing. Add it to backend/.env")
