import json
import sys
from pathlib import Path
from datetime import date

from src.db.database import SessionLocal
from src.db.models import Puzzle


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def main():

    if len(sys.argv) != 3:
        print(
            "Usage:\n"
            "python import_puzzle.py daily_puzzle.json daily_solution.json"
        )
        sys.exit(1)

    puzzle_file = Path(sys.argv[1])
    solution_file = Path(sys.argv[2])

    puzzle_json = load_json(puzzle_file)
    solution_json = load_json(solution_file)

    puzzle_id = puzzle_json["id"]

    db = SessionLocal()

    try:

        existing = (
            db.query(Puzzle)
            .filter(Puzzle.id == puzzle_id)
            .first()
        )

        if existing:

            existing.puzzle_json = puzzle_json
            existing.solution_json = solution_json

            print(f"Updated puzzle {puzzle_id}")

        else:

            puzzle = Puzzle(
                id=puzzle_id,
                puzzle_date=date.today(),
                puzzle_json=puzzle_json,
                solution_json=solution_json,
            )

            db.add(puzzle)

            print(f"Inserted puzzle {puzzle_id}")

        db.commit()

    finally:
        db.close()


if __name__ == "__main__":
    main()