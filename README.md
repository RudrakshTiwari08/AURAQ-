# AURAQ: AI agents for small-business customer conversations
link [ https://auraq-ai-agent.onrender.com]
BBDU minor project · Group AI47 · Guide: Mr. Rakesh Sharma
Team: Rudraksh, Shivansh Gupta, Ritik Kumar Singh

Small businesses can't answer customers 24/7. The same questions repeat, orders are missed at night,
and nobody is awake when a customer asks. AURAQ gives any small shop (clothing, cafe, salon, electronics
and more) an AI assistant that answers customer questions and takes order requests on Telegram, while the
**owner stays in control**: every order is confirmed by the owner.

## What it does

**For the owner (website, works on phones too)**
- Sign up, add products (with optional options such as size/type and stock counts) or upload a CSV, and add
  FAQs (or paste text and let the AI turn it into FAQs). Wording adapts to the business type, so a cafe is
  asked for "Size / Type", not "Colour".
- Get a shareable Telegram link for an Instagram or Telegram bio.
- Dashboard: conversations, funnel (conversations → interested → wanted to buy → confirmed), most-asked
  products, orders with Confirm / Reject, chats that need a human, and a Test chat.
- Telegram alerts for new orders and for chats that need the owner.

**For the customer (Telegram)**
- Opens the shop's link and asks about products, prices, stock, timings, delivery, returns.
- Places an order in a short conversation (item, options, quantity, name, contact), confirms with YES,
  and gets a message when the owner confirms or rejects it.

## How it works

```
Customer on Telegram
        |
        v
 Telegram (webhook in production, polling on a laptop)  --->  Engine  <---  Dashboard "Test chat"
                                                                |
                    +-------------------+-----------------------+----------------+
                    v                   v                       v                v
              Router agent          Info agent            Order agent     Escalation agent
         (what does the customer  (answers ONLY from    (collects details, (alerts the owner
          want?)                   the shop's data)      checks real stock)  on Telegram)
                                                                |
                                                                v
                      SQLite (local) / Postgres (production)  <--->  FastAPI  <--->  Owner website
```

Design rule used throughout: **the AI only reads messages** (classify, extract, answer from the shop's own
data). **Our Python code decides** stock, prices, order creation and notifications. Orders are created only
after an explicit YES, and stock is reduced only when the owner confirms.

The AI provider lives in one file (`backend/app/llm.py`). Calls retry when the service is busy and fall back
to a backup model.

## Tech stack

| Part | Tool |
|---|---|
| Backend / API | Python, FastAPI |
| Database | SQLite locally, Postgres in production (SQLAlchemy) |
| AI reasoning | Gemini API |
| Customer channel | Telegram Bot API |
| Owner website | HTML, CSS, JavaScript (served by FastAPI) |
| Auth | bcrypt password hashing, signed JWT tokens |
| Hosting (free tier) | Render (app) + Neon (Postgres) |

## Project structure

```
├── backend/
│   ├── app/
│   │   ├── main.py            # starts the API, serves the website, registers the Telegram webhook
│   │   ├── config.py          # settings from .env / environment
│   │   ├── database.py, models.py
│   │   ├── security.py, ratelimit.py   # hashing, tokens, signup/login throttling
│   │   ├── llm.py             # the only file that talks to the AI provider
│   │   ├── engine.py          # Router, Info, Order and Escalation agents
│   │   ├── labels.py          # wording per business type
│   │   ├── telegram_bot.py    # message handling + local polling bot
│   │   └── routers/           # auth, business, products, faqs, chat, orders, stats, telegram
│   ├── requirements.txt
│   └── .env.example
├── frontend/                  # landing page, signup, login, setup wizard, dashboard, privacy notice
└── render.yaml                # optional deploy settings for Render
```

## Run on your own computer (Windows, PowerShell)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env        # then fill in the values
uvicorn app.main:app --reload --port 8000        # terminal 1: website + API
python -m app.telegram_bot                       # terminal 2: Telegram bot (polling)
```

Open `http://localhost:8000`. To open it on your phone (same Wi-Fi), start uvicorn with
`--host 0.0.0.0` and visit `http://<your PC's IPv4 address>:8000`.
In `frontend/js/config.js`, `USE_MOCK` must be `false` to use the real backend.

| Variable | Meaning |
|---|---|
| `SECRET_KEY` | long random string used to sign logins: `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `TELEGRAM_BOT_USERNAME` / `TELEGRAM_BOT_TOKEN` | from @BotFather (keep the token private) |
| `GEMINI_API_KEY` | from Google AI Studio (keep private) |
| `GEMINI_MODEL`, `GEMINI_FALLBACK_MODELS` | optional model names |
| `DATABASE_URL` | production only: a Postgres address (for example from Neon) |
| `PUBLIC_URL` | production only: the site's https address; enables the Telegram webhook |
| `SIGNUP_LIMIT_PER_HOUR`, `DAILY_MESSAGE_LIMIT` | optional abuse limits |

**Never commit `.env`.** It is listed in `.gitignore`.

## Deploy (free tier)

1. **Database:** create a free Neon project and copy its connection string.
2. **App:** on Render, create a Web Service from this GitHub repo.
   Build command: `pip install -r backend/requirements.txt`.
   Start command: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
   Set the environment variables above (`DATABASE_URL`, `GEMINI_API_KEY`, `TELEGRAM_BOT_TOKEN`,
   `TELEGRAM_BOT_USERNAME`, `SECRET_KEY`, and `PUBLIC_URL` = the address Render gives you).
3. On start, the app tells Telegram to deliver messages to `PUBLIC_URL/api/telegram/webhook`.
   Do not run the local polling bot with the same bot token while the site is live.

Free-tier notes: Render's free web service sleeps after about 15 minutes without traffic and takes about a
minute to wake, so the first message after a quiet period is slow. Neon's free database also sleeps when idle
but wakes in a fraction of a second.

## API overview

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/signup`, `POST /api/auth/login` |
| Business | `GET/PUT /api/business`, `GET /api/telegram/connect-link` |
| Products | `GET/POST /api/products`, `PUT/DELETE /api/products/{id}`, `POST /api/products/upload` (CSV: `name,price,category,size,colour,stock`) |
| FAQs | `GET/POST /api/faqs`, `DELETE /api/faqs/{id}`, `POST /api/faqs/generate` |
| Chat | `POST /api/test-chat`, `GET /api/conversations` |
| Orders | `GET /api/orders`, `POST /api/orders/{id}/confirm`, `POST /api/orders/{id}/reject` |
| Dashboard | `GET /api/dashboard/stats` |
| Telegram | `POST /api/telegram/webhook` (called by Telegram, protected by a secret header) |

Every route except signup, login and the webhook requires the owner's login token, and every query is
limited to that owner's own business.

## Safety and design decisions

- Passwords are stored only as bcrypt hashes; login errors do not reveal which emails exist.
- Each owner can only read and change their own data.
- Customer-written text is treated as untrusted: HTML is escaped before it reaches the dashboard, and
  customer names are cleaned.
- Names and phone numbers the AI extracts must actually appear in the customer's own message.
- The Info agent answers only from the shop's data and says so when it does not know, then alerts the
  owner instead of guessing.
- Abuse limits: signup and login throttling, a per-chat message rate limit, and a daily message cap per shop.
- The Telegram webhook only accepts calls carrying a secret known to Telegram and the server.
- Customers are told on first contact that the assistant is an AI and that messages are saved
  (see `frontend/privacy.html`).

## Limitations (honest list)

- Telegram only for now; WhatsApp and Instagram need Meta approval and paid APIs.
- The free AI tier is not suitable for real customer data in production: use a paid tier before real shops
  rely on it.
- One owner account per business; no password reset or email verification yet.
- No online payment: the owner contacts the customer about payment and delivery.
- The owner cannot reply to a customer inside the dashboard yet.

## Future work

- WhatsApp and Instagram channels using the same engine.
- Owner replies from the dashboard, payment links, order status updates.
- Hindi / Hinglish support and per-business tone settings.
- Plans and billing; move to a paid AI tier (for example Claude or paid Gemini).
