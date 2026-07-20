from datetime import date, datetime, UTC

from fastapi import HTTPException
from sqlalchemy import func
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


class PuzzleService:
    def get_today_puzzle(self):
        with SessionLocal() as db:
            puzzle = (
                db.query(Puzzle)
                .filter(
                    Puzzle.puzzle_date == date.today()
                )
                .first()
            )
            if not puzzle: return None
            return _get_safe_puzzle_data(puzzle)

    def get_puzzle(self, puzzle_id):
        with SessionLocal() as db:
            puzzle = (
                db.query(Puzzle)
                .filter(
                    Puzzle.id == puzzle_id
                )
                .first()
            )
            if not puzzle: return None
            return _get_safe_puzzle_data(puzzle)


    def create_session(self, puzzle_id, player_id: str | None = None):
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

    def get_session(self, session_id):
        with SessionLocal() as db:
            session = (
                db.query(PlayerSession)
                .filter(
                    PlayerSession.id == session_id
                )
                .first()
            )
            if not session: return None
            return {
                "id": session.id,
                "puzzle_id": session.puzzle_id,
                "created_at": session.created_at,
                "last_seen": session.last_seen,
            }


    def submit_word(self, session_id, word):
        word = word.upper()
        session = self.get_session(session_id)
        puzzle_id = session["puzzle_id"]

        with SessionLocal() as db:
            session = (
                db.query(PlayerSession)
                .filter(
                    PlayerSession.id == session_id
                )
                .first()
            )

            if not session:
                return {
                    "success": False,
                    "reason": "session_not_found"
                }

            puzzle = (
                db.query(Puzzle)
                .filter(
                    Puzzle.id == puzzle_id
                )
                .first()
            )
            if not puzzle:
                return {
                    "success": False,
                    "reason": "puzzle_not_found"
                }
            valid_words = {w["normalized"] for w in puzzle.solution_json["words"]}
            if word not in valid_words:
                return {
                    "success": False,
                    "reason": "invalid_word"
                }
            bonus = False
            for w in puzzle.solution_json["words"]:
                if w["normalized"] == word:
                    bonus = w.get("bonus", False)
                    break
            existing = (
                db.query(FoundWord)
                .filter(
                    FoundWord.session_id == session_id,
                    FoundWord.word == word
                )
                .first()
            )
            if existing:
                return {
                    "success": False,
                    "reason": "already_found"
                }
            score_added = calculate_word_score(word)
            found_word = FoundWord(
                session_id=session_id,
                word=word,
                found_at=datetime.now(UTC),
                bonus=bonus,
                score=score_added,
            )
            db.add(found_word)
            session.last_seen = datetime.now(UTC),

            if not bonus:
                session.score += score_added
                session.found_count += 1
            else:
                session.bonus_score += score_added
                session.bonus_found_count += 1

            db.commit()
            db.refresh(session)
            completion = round(session.found_count * 100 / len(valid_words), 2)
            display_word = next((w["display"] for w in puzzle.solution_json["words"] if w["normalized"] == word), None)
            return {
                "success": True,
                "normalized": word,
                "display": display_word,
                "score_added": score_added,
                "total_score": session.score,
                "found_count": session.found_count,
                "total_words": len(valid_words),
                "completion": completion,
            }

    def get_progress(self, session_id):
        with SessionLocal() as db:
            session = (
                db.query(PlayerSession)
                .filter(PlayerSession.id == session_id)
                .first()
            )

            if not session:
                return None

            puzzle = (
                db.query(Puzzle)
                .filter(Puzzle.id == session.puzzle_id)
                .first()
            )

            found_words = (
                db.query(FoundWord)
                .filter(FoundWord.session_id == session_id)
                .all()
            )

            solution_map = {
                w["normalized"]: w["display"]
                for w in puzzle.solution_json["words"]
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
                "completed": session.found_count == puzzle.solution_json["stats"].get("count", 0),
                "words": found_words_norm,
                "bonus_words": found_bonus_words_norm,
                "display_words": found_words_display,
                "display_bonus_words": found_bonus_words_display,

                # puzzle stats
                "puzzle_id": session.puzzle_id,
                "total_words": puzzle.solution_json["stats"].get("count", 0),
                "total_score": puzzle.solution_json["stats"].get("score", 0),
                "total_bonus_words": puzzle.solution_json["stats"].get("bonus_count", 0),
            }

    def get_found_words(self, session_id):
        with SessionLocal() as db:
            words = (
                db.query(FoundWord)
                .filter(
                    FoundWord.session_id == session_id
                )
                .all()
            )
            return [w.word for w in words]

    def get_today_leaderboard(self):
        with SessionLocal() as db:
            today_date = date.today()
            puzzle = (
                db.query(Puzzle)
                .filter(
                    Puzzle.puzzle_date == today_date
                )
                .first()
            )
            if not puzzle: return { 'date': today_date.isoformat(), 'leaderboards': []}
            leaderboard = self.get_leaderboard(puzzle.id)
            return {'date': today_date.isoformat(), 'leaderboards': leaderboard}

    def get_leaderboard(self, puzzle_id: str):
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
                    "stats": {
                        "found_words": row.found_words,
                        "bonus_found_words": row.bonus_found_words,
                        "score": row.score,
                        "bonus_score": row.bonus_score,
                    },
                }
                for row in rows
            ]

            return {
                "score": sorted(
                    players,
                    key=lambda p: (
                        p["stats"]["score"],
                        p["stats"]["found_words"],
                    ),
                    reverse=True,
                )[:100],

                "score_bonus": sorted(
                    players,
                    key=lambda p: (
                        p["stats"]["score"] + p["stats"]["bonus_score"],
                        p["stats"]["found_words"] + p["stats"]["bonus_found_words"],
                    ),
                    reverse=True,
                )[:100],

                "words": sorted(
                    players,
                    key=lambda p: (
                        p["stats"]["found_words"],
                        p["stats"]["score"],
                    ),
                    reverse=True,
                )[:100],

                "words_bonus": sorted(
                    players,
                    key=lambda p: (
                        p["stats"]["found_words"] + p["stats"]["bonus_found_words"],
                        p["stats"]["score"] + p["stats"]["bonus_score"],
                    ),
                    reverse=True,
                )[:100],
            }

    def create_player(self, session_id: str, username: str) -> Player:
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
            session = (
                db.query(PlayerSession)
                .filter(PlayerSession.id == session_id)
                .first()
            )

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