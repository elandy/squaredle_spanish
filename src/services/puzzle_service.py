import functools
from datetime import date, datetime, UTC
from heapq import nlargest

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from src.db.database import SessionLocal
from src.db.models import (
    Puzzle,
    PlayerSession,
    FoundWord, Player,
)
import hashlib
from collections import Counter


def calculate_word_score(word: str) -> int:
    return max(1, len(word) - 3)

@functools.lru_cache(maxsize=16)
def get_safe_puzzle_data(puzzle_id: int):
    with SessionLocal() as db:
        puzzle = db.get(Puzzle, puzzle_id)
        if puzzle is None: return None
        return _get_safe_puzzle_data(puzzle)

def _get_safe_puzzle_data(puzzle: Puzzle) -> dict:
    pj = puzzle.puzzle_json
    sj = puzzle.solution_json

    words = sj.get("words", [])
    paths = sj.get("paths", {})

    lengths = [
        len(w["normalized"])
        for w in words
        if not w["bonus"]
    ]
    word_lengths = dict(Counter(lengths))

    word_hashes = {}

    for w in words:
        normalized = w["normalized"]
        salted = f"{normalized}{puzzle.id}"
        hash = hashlib.sha256(salted.encode("utf-8")).hexdigest()

        word_hashes[hash] = {
            "bonus": w.get("bonus", False),
            "cells": paths.get(normalized, [])
        }

    return {
        "id": puzzle.id,
        "size": pj.get("size", 4),
        "board": pj.get("board", []),

        "word_count": sj.get("stats", {}).get("count", 0),
        "bonus_word_count": sj.get("stats", {}).get("bonus_count", 0),
        "total_score": sj.get("stats", {}).get("score", 0),

        "word_lengths": word_lengths,
        "words": word_hashes,
    }

@functools.lru_cache(maxsize=16)
def get_puzzle_data(puzzle_id):
    with SessionLocal() as db:
        puzzle = db.get(Puzzle, puzzle_id)
        if puzzle is None:
            return None
        words = {}
        for w in puzzle.solution_json["words"]:
            words[w["normalized"]] = {
                "display": w["display"],
                "bonus": w.get("bonus", False),
            }
        return {
            "total_words": len(words),
            "total_score": puzzle.solution_json["stats"].get("score", 0),
            "bonus_word_count": puzzle.solution_json["stats"].get("bonus_count", 0),
            "words": words,
        }

@functools.lru_cache(maxsize=2)
def get_today_puzzle_id(today: date):
    with SessionLocal() as db:
        puzzle = (
            db.query(Puzzle.id)
            .filter(Puzzle.puzzle_date == today)
            .first()
        )
        return puzzle[0] if puzzle else None

class PuzzleService:

    @staticmethod
    def get_today_puzzle():
        puzzle_id = get_today_puzzle_id(date.today())
        if puzzle_id is None: return None
        return get_safe_puzzle_data(puzzle_id)

    @staticmethod
    def get_puzzle(puzzle_id):
        return get_safe_puzzle_data(puzzle_id)

    @staticmethod
    def create_session(puzzle_id, player_id: str | None = None):
        with SessionLocal() as db:
            session = PlayerSession(
                puzzle_id=puzzle_id,
                created_at=datetime.now(UTC),
                last_seen=datetime.now(UTC),
                completed_at=None,
                player_id=player_id,
            )
            db.add(session)
            db.commit()
            db.refresh(session)
            return session.id

    @staticmethod
    def get_session(session_id):
        with SessionLocal() as db:
            session = db.get(PlayerSession, session_id)
            if not session: return None
            return {
                "id": session.id,
                "puzzle_id": session.puzzle_id,
                "created_at": session.created_at,
                "last_seen": session.last_seen,
            }

    @staticmethod
    def submit_word(session_id, word):
        word = word.upper()
        with SessionLocal() as db:
            session = db.get(PlayerSession, session_id)
            if session is None:
                return {
                    "success": False,
                    "reason": "session_not_found",
                }

            puzzle = get_puzzle_data(session.puzzle_id)
            if puzzle is None:
                return {
                    "success": False,
                    "reason": "puzzle_not_found",
                }

            entry = puzzle["words"].get(word)
            if entry is None:
                return {
                    "success": False,
                    "reason": "invalid_word",
                }
            score_added = calculate_word_score(word)
            db.add(
                FoundWord(
                    session_id=session_id,
                    word=word,
                    found_at=datetime.now(UTC),
                    bonus=entry["bonus"],
                    score=score_added,
                )
            )

            session.last_seen = datetime.now(UTC)
            if entry["bonus"]:
                session.bonus_score += score_added
                session.bonus_found_count += 1
            else:
                session.score += score_added
                session.found_count += 1

            try:
                db.commit()
            except IntegrityError:
                db.rollback()
                return {
                    "success": False,
                    "reason": "already_found",
                }

            db.refresh(session)
            return {
                "success": True,
                "normalized": word,
                "display": entry["display"],
                "score_added": score_added,
                "total_score": session.score,
                "found_count": session.found_count,
                "total_words": puzzle["total_words"],
                "completion": round(session.found_count * 100 / puzzle["total_words"], 2),
            }

    @staticmethod
    def get_progress(session_id):
        with SessionLocal() as db:
            session = db.get(PlayerSession, session_id)
            if not session:  return None

            found_words = (
                db.query(FoundWord)
                .filter(FoundWord.session_id == session_id)
                .all()
            )

            cached = get_puzzle_data(session.puzzle_id)

            solution_map = {
                normalized: data["display"]
                for normalized, data in cached["words"].items()
            }

            found_words_norm = [w.word for w in found_words if not w.bonus]
            found_bonus_words_norm = [w.word for w in found_words if w.bonus]

            found_words_display = [
                solution_map[w]
                for w in found_words_norm
                if w in solution_map
            ]
            found_bonus_words_display = [
                solution_map[w]
                for w in found_bonus_words_norm
                if w in solution_map
            ]

            return {
                # session info
                "session_id": session.id,
                "username": session.player.username if session.player else None,

                # player stats
                "found_words": session.found_count,
                "bonus_found_words": session.bonus_found_count,
                "score": session.score,
                "bonus_score": session.bonus_score,
                "completed": session.found_count == cached["total_words"],
                "words": found_words_norm,
                "bonus_words": found_bonus_words_norm,
                "display_words": found_words_display,
                "display_bonus_words": found_bonus_words_display,

                # puzzle stats
                "puzzle_id": session.puzzle_id,
                "total_words": cached["total_words"],
                "total_score": cached["total_score"],
                "total_bonus_words": cached["bonus_word_count"],
            }

    @staticmethod
    def get_found_words(session_id):
        with SessionLocal() as db:
            words = (
                db.query(FoundWord)
                .filter(
                    FoundWord.session_id == session_id
                )
                .all()
            )
            return [w.word for w in words]

    @staticmethod
    def get_today_leaderboard():
        today = date.today()
        puzzle_id = get_today_puzzle_id(today)
        if puzzle_id is None:
            return {
                "date": today.isoformat(),
                "leaderboards": [],
            }
        return {
            "date": today.isoformat(),
            "leaderboards": PuzzleService.get_leaderboard(puzzle_id),
        }

    @staticmethod
    def get_leaderboard(puzzle_id: str):
        with SessionLocal() as db:
            rows = (
                db.query(
                    PlayerSession.id.label("session_id"),
                    Player.username.label("username"),
                    PlayerSession.found_count.label("found_words"),
                    PlayerSession.bonus_found_count.label("bonus_found_words"),
                    PlayerSession.score.label("score"),
                    PlayerSession.bonus_score.label("bonus_score"),
                )
                .outerjoin(
                    Player,
                    Player.id == PlayerSession.player_id,
                )
                .filter(
                    PlayerSession.puzzle_id == puzzle_id
                )
                .all()
            )

            players = [
                {
                    "session_id": row.session_id,
                    "username": row.username,
                    "found_words": row.found_words,
                    "bonus_found_words": row.bonus_found_words,
                    "score": row.score,
                    "bonus_score": row.bonus_score,
                }
                for row in rows
            ]

            score = nlargest(
                100,
                players,
                key=lambda p: (p["score"], p["found_words"]),
            )
            score_bonus = nlargest(
                100,
                players,
                key=lambda p: (p["score"] + p["bonus_score"], p["found_words"] + p["bonus_found_words"]),
            )
            words = nlargest(
                100,
                players,
                key=lambda p: (p["found_words"], p["score"]),
            )
            words_bonus = nlargest(
                100,
                players,
                key=lambda p: (p["found_words"] + p["bonus_found_words"], p["score"] + p["bonus_score"]),
            )

            return {
                "score": score,
                "score_bonus": score_bonus,
                "words": words,
                "words_bonus": words_bonus,
            }

    @staticmethod
    def create_player(session_id: str, username: str) -> Player:
        username = username.strip().lower()

        if not username:
            raise ValueError("Username cannot be empty")
        if len(username) < 4:
            raise ValueError("Username cannot be shorter than 4 characters")
        if len(username) > 25:
            raise ValueError("Username cannot be longer than 25 characters")
        if not username.isalnum():
            raise ValueError("Username can only contain letters and numbers")

        with SessionLocal() as db:
            session = db.get(PlayerSession, session_id)
            if not session: raise ValueError("Session not found")

            existing = (
                db.query(Player)
                .filter(Player.username == username)
                .first()
            )
            if existing: raise HTTPException(status_code=409, detail="Username already taken")

            player = Player(username=username)
            db.add(player)
            db.flush()

            session.player = player
            db.commit()
            db.refresh(player)

            return player