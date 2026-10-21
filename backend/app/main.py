from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .config import FRONTEND_DIR
from .database import Base, engine
from .routers import auth, business, chat, faqs, orders, products, stats, telegram
from .telegram_bot import register_webhook

# Create any missing tables when the server starts
Base.metadata.create_all(bind=engine)



@asynccontextmanager
async def lifespan(_app: FastAPI):
    register_webhook()      # only does something on the deployed site (PUBLIC_URL set)
    yield


app = FastAPI(title="AURAQ API", lifespan=lifespan)

# API routes first...
app.include_router(auth.router)
app.include_router(business.router)
app.include_router(products.router)
app.include_router(faqs.router)
app.include_router(chat.router)
app.include_router(orders.router)
app.include_router(stats.router)
app.include_router(telegram.router)


@app.get("/health")
def health():
    return {"status": "ok"}


# ...then serve the website itself for everything else.
# html=True makes "/" open index.html. This must stay LAST.
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
