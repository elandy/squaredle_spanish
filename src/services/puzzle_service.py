from datetime import date, datetime, UTC
from sqlalchemy import func
from src.db.database import SessionLocal
from src.db.models import (
    Puzzle,
    PlayerSession,
    FoundWord,
)


def calculate_word_score(word: str) -> int:
    return max(1, len(word) - 3)

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
            return puzzle.solution_json

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
            return puzzle.puzzle_json

    def create_session(self, puzzle_id):
        with SessionLocal() as db:
            session = PlayerSession(
                puzzle_id=puzzle_id,
                created_at=datetime.now(UTC),
                last_seen=datetime.now(UTC),
                completed_at=None,
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
            normalized_words = [w.word for w in found_words]
            display_words = [solution_map[w] for w in normalized_words if w in solution_map]
            return {
                "session_id": session.id,
                "puzzle_id": session.puzzle_id,
                "found_words": len(found_words),
                "total_words": puzzle.puzzle_json["word_count"],
                "score": sum(len(w.word) - 3 for w in found_words),
                "completed": len(found_words) == puzzle.puzzle_json["word_count"],
                "words": normalized_words,
                "display_words": display_words
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
            puzzle = (
                db.query(Puzzle)
                .filter(
                    Puzzle.puzzle_date == date.today()
                )
                .first()
            )
            if not puzzle: return []
            return self.get_leaderboard(puzzle.id)

    def get_leaderboard(self, puzzle_id):
        with SessionLocal() as db:
            results = (
                db.query(
                    PlayerSession.id,
                    func.count(
                        FoundWord.id
                    ).label("words_found")
                )
                .outerjoin(
                    FoundWord,
                    FoundWord.session_id
                    == PlayerSession.id
                )
                .filter(
                    PlayerSession.puzzle_id
                    == puzzle_id
                )
                .group_by(
                    PlayerSession.id
                )
                .order_by(
                    func.count(
                        FoundWord.id
                    ).desc()
                )
                .limit(100)
                .all()
            )
            return [
                {
                    "session_id": row.id,
                    "words_found": row.words_found,
                }
                for row in results
            ]