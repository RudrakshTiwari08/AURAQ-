from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import DATABASE_URL, IS_SQLITE

if IS_SQLITE:
    # check_same_thread=False: FastAPI handles requests on several threads
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def set_sqlite_pragmas(dbapi_connection, _):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")   # readers do not block the writer
        cursor.execute("PRAGMA foreign_keys=ON")    # enforce relations between tables
        cursor.close()
else:
    # pool_pre_ping: a hosted database may close idle connections (Neon sleeps when idle),
    # so test each connection before using it. pool_recycle: replace old ones regularly.
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=240, pool_size=5, max_overflow=5)

SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    """Every table class inherits from this."""


def get_db():
    """FastAPI dependency: opens a DB session for one request, always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
