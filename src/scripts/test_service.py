from src.services.puzzle_service import PuzzleService

service = PuzzleService()

puzzle = service.get_today_puzzle()

session = service.create_session(
    puzzle["id"]
)

print(session)

service.submit_word(
    session,
    puzzle["id"],
    "PUÑO"
)

print(
    service.get_progress(
        session
    )
)