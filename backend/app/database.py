"""
Database configuration for local SQLite and production PostgreSQL/Supabase.
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DEFAULT_SQLITE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data",
    "freight.db",
)

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    f"sqlite:///{DEFAULT_SQLITE_PATH}",
)

IS_SQLITE = DATABASE_URL.startswith("sqlite")

if IS_SQLITE:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        future=True,
    )
else:
    # Keep the Render/Supabase connection pool deliberately small.
    # This prevents the API from exhausting the database connection limit.
    engine = create_engine(
        DATABASE_URL,
        pool_size=3,
        max_overflow=2,
        pool_timeout=10,
        pool_recycle=1800,
        pool_pre_ping=True,
        future=True,
    )

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True,
)

Base = declarative_base()


def get_db():
    """FastAPI dependency that always closes the database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create tables if they don't exist."""
    from app.models import freight  # noqa: F401

    Base.metadata.create_all(bind=engine)