from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
import os

# NOTE: keep this in an environment variable in real use — hardcoding
# it here only for local testing convenience.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_Igx0ORvnZ1jL@ep-silent-frog-atvcmosp-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
)

# fixed: Neon's pooler endpoint (PgBouncer, transaction mode) does its own
# connection pooling. Layering SQLAlchemy's pool on top of that causes
# "SSL connection has been closed unexpectedly" errors when Neon silently
# recycles/drops a connection that SQLAlchemy still thinks is alive —
# even with pool_pre_ping. NullPool disables SQLAlchemy's pool entirely
# and opens a fresh connection per request, which Neon's pooler expects.
engine = create_engine(
    DATABASE_URL,
    poolclass=NullPool,
    pool_pre_ping=True,  # extra safety net, cheap even with NullPool
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()