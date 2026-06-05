from datetime import datetime, date, UTC

from sqlalchemy import String, Date, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from uuid import uuid4
from sqlalchemy import UniqueConstraint
from sqlalchemy.sql.schema import Index, ForeignKey

from src.db.database import Base


class Puzzle(Base):
    __tablename__ = "puzzles"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    puzzle_date: Mapped[date] = mapped_column(Date, unique=True)
    puzzle_json: Mapped[dict] = mapped_column(JSONB)
    solution_json: Mapped[dict] = mapped_column(JSONB)

    __table_args__ = (Index("ix_puzzles_puzzle_date", puzzle_date),)


class PlayerSession(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    puzzle_id: Mapped[str] = mapped_column(ForeignKey("puzzles.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now(UTC))
    last_seen: Mapped[datetime] = mapped_column(DateTime, default=datetime.now(UTC))
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    found_words = relationship("FoundWord", back_populates="session", cascade="all, delete-orphan")
    score: Mapped[int] = mapped_column(default=0)
    found_count: Mapped[int] = mapped_column(default=0)
    
class FoundWord(Base):
    __tablename__ = "found_words"

    id: Mapped[int] = mapped_column(primary_key=True)

    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), index=True)
    session = relationship("PlayerSession",back_populates="found_words")

    word: Mapped[str] = mapped_column(String, index=True)
    found_at: Mapped[datetime]
    score: Mapped[int] = mapped_column(default=1)


    __table_args__ = (
        UniqueConstraint(
            "session_id",
            "word",
            name="uq_session_word"
        ),
    )