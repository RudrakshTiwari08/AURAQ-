from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .config import FRONTEND_DIR
from .database import Base, engine
from .routers import auth, business, faqs, products

# Create any missing tables when the server starts
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AURAQ API")

# API routes first...
app.include_router(auth.router)
app.include_router(business.router)
app.include_router(products.router)
app.include_router(faqs.router)


@app.get("/health")
def health():
    return {"status": "ok"}


# ...then serve the website itself for everything else.
# html=True makes "/" open index.html. This must stay LAST.
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
