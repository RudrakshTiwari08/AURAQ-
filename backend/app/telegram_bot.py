"""The Telegram bot. Run it in its OWN terminal:   python -m app.telegram_bot

It asks Telegram "any new messages?" over and over (called polling), so it needs no
public website address. Each message goes to the same engine the dashboard's Test chat uses.
"""
import time

import httpx
from sqlalchemy import select

from .config import TELEGRAM_BOT_TOKEN
from .database import Base, SessionLocal, engine
from .engine import get_or_create_conversation, handle_message
from .models import Business, ChatBinding
from .notify import send_telegram
from .safe import clean_name, clean_username
from .security import verify_owner_code

NOT_BOUND = "Please open a shop's chat link first, so I know which shop you're talking to."


def process_update(update: dict, send=send_telegram) -> None:
    """Handle ONE Telegram update. `send` can be swapped out in tests."""
    message = update.get("message")
    if not isinstance(message, dict):
        return
    chat = message.get("chat") or {}
    if chat.get("type") != "private":
        return                                          # ignore groups and channels
    chat_id = str(chat.get("id", ""))
    if not chat_id:
        return
    sender = message.get("from") or {}
    text = message.get("text")

    if not isinstance(text, str):
        send(chat_id, "I can only read text messages for now.")
        return
    text = text.strip()

    with SessionLocal() as db:
        # ---- /start <code>  (the shop's link, or the owner's alert link)
        if text.startswith("/start"):
            param = text[6:].strip()
            if param.startswith("owner_"):
                business_id = verify_owner_code(param[6:])
                business = db.get(Business, business_id) if business_id else None
                if business is None:
                    send(chat_id, "That alerts link isn't valid. Please open it again from your dashboard.")
                    return
                business.owner_telegram_chat_id = chat_id
                db.commit()
                send(chat_id, f"Alerts are on for {business.name}. I'll message you here for new order requests "
                              "and for chats that need you.")
                return
            if param:
                business = db.scalar(select(Business).where(Business.link_code == param))
                if business is None:
                    send(chat_id, "That shop link isn't valid. Please ask the shop for their link again.")
                    return
                binding = db.get(ChatBinding, chat_id)
                if binding is None:
                    db.add(ChatBinding(chat_id=chat_id, business_id=business.id))
                else:
                    binding.business_id = business.id
                db.commit()
                send(chat_id, f"Welcome to {business.name}! Ask me about products, prices, stock or timings, "
                              "or tell me what you'd like to order.")
                return
            binding = db.get(ChatBinding, chat_id)
            send(chat_id, "Hi again! What can I help you with?" if binding else NOT_BOUND)
            return

        if text.startswith("/"):
            return                                      # other commands: ignore quietly

        # ---- a normal message
        binding = db.get(ChatBinding, chat_id)
        business = db.get(Business, binding.business_id) if binding else None
        if business is None:
            if db.scalar(select(Business.id).where(Business.owner_telegram_chat_id == chat_id)):
                send(chat_id, "This chat is for your alerts. Use your dashboard to manage orders and chats.")
            else:
                send(chat_id, NOT_BOUND)
            return

        name = clean_name(sender.get("first_name")) or ""
        username = clean_username(sender.get("username"))
        conv = get_or_create_conversation(db, business, "telegram", chat_id, name=name, username=username)
        reply = handle_message(db, business, conv, text)
        send(chat_id, reply)


def telegram_call(method: str, **payload):
    r = httpx.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/{method}", json=payload, timeout=40)
    r.raise_for_status()
    return r.json()


def main() -> None:
    if not TELEGRAM_BOT_TOKEN:
        raise SystemExit("TELEGRAM_BOT_TOKEN is missing. Add it to backend/.env")
    Base.metadata.create_all(bind=engine)
    try:
        telegram_call("deleteWebhook")                  # polling and webhooks can't be used together
    except Exception as exc:
        print("Could not reach Telegram:", type(exc).__name__)
    print("AURAQ bot is running. Press Ctrl+C to stop.")

    offset = None
    while True:
        try:
            data = telegram_call("getUpdates", timeout=25, offset=offset, allowed_updates=["message"])
            for update in data.get("result", []):
                offset = update["update_id"] + 1
                try:
                    process_update(update)
                except Exception as exc:               # one bad message must never stop the bot
                    print("Error while handling a message:", type(exc).__name__)
        except KeyboardInterrupt:
            print("Stopped.")
            return
        except Exception as exc:
            print("Telegram connection problem:", type(exc).__name__, "- retrying in 5s")
            time.sleep(5)


if __name__ == "__main__":
    main()
