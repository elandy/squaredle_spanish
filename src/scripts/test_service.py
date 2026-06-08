from src.services.puzzle_service import PuzzleService

service = PuzzleService()

puzzle = service.get_today_puzzle()

print(puzzle)
