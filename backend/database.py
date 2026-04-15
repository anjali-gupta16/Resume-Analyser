"""
database.py — SQLAlchemy models and database setup
"""
import json
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./resume_analyser.db")

# SQLite needs this for multi-threaded use
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Analysis(Base):
    """Stores each resume analysis result."""
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    filename = Column(String(255), nullable=False)
    job_role = Column(String(100), nullable=False)
    resume_text = Column(Text, nullable=True)  # raw extracted text
    score = Column(Integer, nullable=False, default=0)
    match_pct = Column(Integer, nullable=False, default=0)
    tier = Column(String(50), nullable=False, default="Beginner")
    rank_text = Column(Text, nullable=True)
    # JSON-encoded lists/objects stored as Text
    skills_json = Column(Text, nullable=True, default="[]")
    missing_json = Column(Text, nullable=True, default="[]")
    suggestions_json = Column(Text, nullable=True, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Convenience properties
    @property
    def skills(self):
        return json.loads(self.skills_json or "[]")

    @skills.setter
    def skills(self, value):
        self.skills_json = json.dumps(value)

    @property
    def missing(self):
        return json.loads(self.missing_json or "[]")

    @missing.setter
    def missing(self, value):
        self.missing_json = json.dumps(value)

    @property
    def suggestions(self):
        return json.loads(self.suggestions_json or "[]")

    @suggestions.setter
    def suggestions(self, value):
        self.suggestions_json = json.dumps(value)

    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "job_role": self.job_role,
            "score": self.score,
            "match_pct": self.match_pct,
            "tier": self.tier,
            "rank_text": self.rank_text,
            "skills": self.skills,
            "missing": self.missing,
            "suggestions": self.suggestions,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


def init_db():
    """Create all tables if they don't exist."""
    Base.metadata.create_all(bind=engine)
    print("[OK] Database initialised.")


def get_db():
    """FastAPI dependency — yields a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
