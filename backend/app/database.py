from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import settings

# If no DATABASE_URL is configured, default to local SQLite database
db_url = settings.DATABASE_URL
if not db_url:
    # Use a local SQLite file
    db_url = "sqlite:///./docmind.db"

# For SQLite, we need to allow multi-threading access
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Replace postgres:// with postgresql:// if needed (Render/Supabase support)
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(db_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency to get db session in FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
