from datetime import timedelta
from src.scripts.generate_puzzle import generate_puzzle
from src.scripts.import_puzzle import import_puzzle


def batch_generate_and_import(n, start_date):
    for i in range(n):
        d = start_date + timedelta(days=i)

        result = generate_puzzle(puzzle_date=d)

        import_puzzle(
            result["puzzle"],
            result["solution"],
            d
        )

if __name__ == "__main__":
    import argparse
    from datetime import date

    parser = argparse.ArgumentParser()
    parser.add_argument("n", type=int)
    parser.add_argument("start_date", type=str)

    args = parser.parse_args()

    start = date.fromisoformat(args.start_date)

    batch_generate_and_import(args.n, start)