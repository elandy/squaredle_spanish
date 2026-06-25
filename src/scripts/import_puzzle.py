import json
from pathlib import Path
from datetime import date, datetime

from src.db.database import SessionLocal
from src.db.models import Puzzle


# ==========================================
# UTIL
# ==========================================

def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def parse_date(arg):
    if not arg:
        return date.today()
    return datetime.strptime(arg, "%Y-%m-%d").date()


# ==========================================
# CORE FUNCTION
# ==========================================

def import_puzzle(puzzle_json, solution_json, target_date):
    """
    Inserts or updates a puzzle for a specific date.
    """

    puzzle_id = puzzle_json["id"]

    db = SessionLocal()

    try:
        existing = (
            db.query(Puzzle)
            .filter(Puzzle.puzzle_date == target_date)
            .first()
        )

        if existing:
            existing.puzzle_json = puzzle_json
            existing.solution_json = solution_json
            existing.id = puzzle_id

            return {
                "status": "updated",
                "date": target_date,
                "id": puzzle_id,
            }

        puzzle = Puzzle(
            id=puzzle_id,
            puzzle_date=target_date,
            puzzle_json=puzzle_json,
            solution_json=solution_json,
        )

        db.add(puzzle)

        return {
            "status": "inserted",
            "date": target_date,
            "id": puzzle_id,
        }

    finally:
        db.commit()
        db.close()


# ==========================================
# CLI COMPATIBILITY (optional)
# ==========================================

if __name__ == "__main__":
    import sys

    if len(sys.argv) not in (3, 4):
        print(
            "Usage:\n"
            "python import_puzzle.py daily_puzzle.json daily_solution.json [YYYY-MM-DD]"
        )
        sys.exit(1)

    puzzle_file = Path(sys.argv[1])
    solution_file = Path(sys.argv[2])

    target_date = parse_date(sys.argv[3] if len(sys.argv) == 4 else None)

    puzzle_json = load_json(puzzle_file)
    solution_json = load_json(solution_file)

    result = import_puzzle(puzzle_json, solution_json, target_date)

    print(result)