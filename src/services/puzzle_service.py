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
    lengths = [len(w["normalized"]) for w in words if not w["bonus"]]
    word_lengths = dict(Counter(lengths))

    word_hashes = {}

    for w in words:
        normalized = w["normalized"]
        salted = f"{normalized}{puzzle.id}"
        hash = hashlib.sha256(salted.encode("utf-8")).hexdigest()
        word_hashes[hash] = w.get("bonus", False)

    return {
        "id": puzzle.id,
        "size": pj.get("size", 4),
        "board": pj.get("board", []),

        "word_count": sj.get("stats", {}).get("count", 0),
        "bonus_word_count": sj.get("stats", {}).get("bonus_count", 0),

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
            found_word = FoundWord(
                session_id=session_id,
                word=word,
                found_at=datetime.now(UTC),
                bonus=bonus,
            )
            db.add(found_word)
            session.last_seen = datetime.now(UTC),
            db.commit()

            score_added = calculate_word_score(word)

            session.score += score_added
            session.found_count += 1
            session.last_seen = datetime.now(UTC)

            completion = round(
                session.found_count * 100 / len(valid_words),
                2
            )
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
                .filter(
                    PlayerSession.id == session_id
                )
                .first()
            )

            if not session:
                return None

            puzzle = (
                db.query(Puzzle)
                .filter(
                    Puzzle.id == session.puzzle_id
                )
                .first()
            )

            found_words = (
                db.query(FoundWord)
                .filter(
                    FoundWord.session_id == session_id
                )
                .all()
            )
            solution_map = {
                w["normalized"]: w["display"]
                for w in puzzle.solution_json["words"]
            }
            normalized_words = [w.word for w in found_words if not w.bonus]
            normalized_bonus_words = [w.word for w in found_words if w.bonus]

            display_words = [solution_map[w] for w in normalized_words if w in solution_map]
            display_bonus_words = [solution_map[w] for w in normalized_bonus_words if w in solution_map]
            return {
                "session_id": session.id,
                "puzzle_id": session.puzzle_id,
                "found_words": len(normalized_words),
                "total_words": puzzle.solution_json["stats"].get("count", 0),
                "score": sum(len(w) - 3 for w in normalized_words),
                "completed": len(normalized_words) == puzzle.solution_json["stats"].get("count", 0),
                "words": normalized_words,
                "bonus_words": normalized_bonus_words,
                "total_bonus_words": puzzle.solution_json["stats"].get("bonus_count", 0),
                "display_words": display_words,
                "display_bonus_words": display_bonus_words,
                "username": session.player.username if session.player else None,
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
            if not puzzle: return { 'date': today_date.isoformat(), 'leaderboard': []}
            leaderboard = self.get_leaderboard(puzzle.id)
            return {'date': today_date.isoformat(), 'leaderboard': leaderboard}

    def get_leaderboard(self, puzzle_id: str):
        with SessionLocal() as db:
            results = (
                db.query(
                    PlayerSession.id.label("session_id"),
                    Player.username.label("username"),
                    func.count(FoundWord.id).label("words_found"),
                )
                .outerjoin(
                    FoundWord,
                    FoundWord.session_id == PlayerSession.id,
                )
                .outerjoin(
                    Player,
                    Player.id == PlayerSession.player_id,
                )
                .filter(
                    PlayerSession.puzzle_id == puzzle_id
                )
                .group_by(
                    PlayerSession.id,
                    Player.username,
                )
                .order_by(
                    func.count(FoundWord.id).desc()
                )
                .limit(100)
                .all()
            )

            return [
                {
                    "session_id": row.session_id,
                    "username": row.username,
                    "words_found": row.words_found,
                }
                for row in results
            ]

    def create_player(self, session_id: str, username: str) -> Player:
        username = username.strip().lower()
        if not username:
            raise ValueError("Username cannot be empty")

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