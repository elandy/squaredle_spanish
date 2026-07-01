import os
from datetime import datetime
from typing import Annotated

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, StringConstraints
from src.services.puzzle_service import PuzzleService
from fastapi.middleware.cors import CORSMiddleware
import httpx
from fastapi import Query

from src.utils.normalize import normalize

app = FastAPI(title="Squaredle ES API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://squaredle-es.elandy.workers.dev",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

service = PuzzleService()

# ==========================================================
# MODELS
# ==========================================================

class SubmitWordRequest(BaseModel):
    session_id: str
    word: str

class CreateSessionRequest(BaseModel):
    puzzle_id: str
    player_id: str | None = None

class SessionResponse(BaseModel):
    session_id: str
    puzzle_id: str
    created_at: datetime

Username = Annotated[
    str,
    StringConstraints(
        min_length=4,
        max_length=25,
        pattern=r"^[A-Za-z0-9]+$",
    ),
]

class CreatePlayerRequest(BaseModel):
    session_id: str
    username: Username

# ==========================================================
# HEALTH
# ==========================================================

@app.get("/health")
async def health():
    return {"status": "ok"}

# ==========================================================
# PUZZLES
# ==========================================================

@app.get("/puzzle/today")
async def get_today_puzzle():
    """
    Returns today's puzzle.
    """

    puzzle = service.get_today_puzzle()

    if not puzzle:
        raise HTTPException(404, "Puzzle not found")

    return puzzle

@app.get("/puzzle/{puzzle_id}")
async def get_puzzle(puzzle_id: str):

    puzzle = service.get_puzzle(puzzle_id)

    if not puzzle:
        raise HTTPException(404, "Puzzle not found")

    return puzzle

# ==========================================================
# SESSION
# ==========================================================

@app.post("/session", response_model=SessionResponse)
async def create_session(request: CreateSessionRequest):

    session_id = service.create_session(
        puzzle_id=request.puzzle_id,
        player_id=request.player_id,
    )

    return SessionResponse(
        session_id=session_id,
        puzzle_id=request.puzzle_id,
        created_at=datetime.now(),
    )

@app.get("/session/{session_id}")
async def get_session(session_id: str):

    session = service.get_session(session_id)

    if not session:
        raise HTTPException(404, "Session not found")

    return session

@app.post("/player")
async def create_player(request: CreatePlayerRequest):
    player = service.create_player(
        session_id=request.session_id,
        username=request.username,
    )

    return {
        "id": player.id,
        "username": player.username,
    }

# ==========================================================
# GAMEPLAY
# ==========================================================

@app.post("/submit-word")
async def submit_word(request: SubmitWordRequest):
    word = normalize(request.word)
    return service.submit_word(
        session_id=request.session_id,
        word=word
    )

@app.get("/progress/{session_id}")
async def get_progress(session_id: str):

    progress = service.get_progress(session_id)

    if not progress:
        raise HTTPException(404, "Session not found")

    return progress

# ==========================================================
# LEADERBOARD
# ==========================================================

@app.get("/leaderboard/today")
async def leaderboard_today():

    return service.get_today_leaderboard()

@app.get("/leaderboard/{puzzle_id}")
async def leaderboard(puzzle_id: str):

    return service.get_leaderboard(
        puzzle_id=puzzle_id
    )

# ==========================================================
# RAE
# ==========================================================

@app.get("/dictionary/rae")
async def rae_lookup(q: str = Query(..., min_length=1)):
    url = f"https://rae-api.com/api/words/{q}"

    headers = {
        "accept": "application/json"
    }

    api_key = os.getenv("RAE_API_KEY")
    if api_key:
        headers["X-API-KEY"] = api_key

    try:
        async with httpx.AsyncClient(headers=headers, timeout=5.0) as client:
            r = await client.get(url)

        if r.status_code != 200:
            return {
                "word": q.upper(),
                "definitions": ["La definición no fue encontrada."]
            }

        data = r.json()

        definitions = []

        for meaning in data.get("data", {}).get("meanings", []):
            for sense in meaning.get("senses", []):
                desc = sense.get("description")

                if not desc:
                    continue

                if len(desc.split()) == 1 and any(c.isdigit() for c in desc):
                    continue

                definitions.append(desc)

        if not definitions:
            definitions = ["La definición no fue encontrada."]
        else:
            definitions = [
                f"{i}. {definition}"
                for i, definition in enumerate(definitions, start=1)
            ]

        return {
            "word": q.upper(),
            "definitions": definitions
        }

    except Exception:
        return {
            "word": q.upper(),
            "definitions": ["La definición no fue encontrada."]
        }