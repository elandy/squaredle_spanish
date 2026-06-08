# Squaredle ES

## Overview

Squaredle ES is a word puzzle game built with:

- FastAPI backend
- PostgreSQL (AWS RDS)
- Vanilla JS frontend
- SQLAlchemy ORM
- Custom board generator + solver

The game generates a 4x4 letter grid and computes all valid Spanish words that can be formed by adjacent tiles (including diagonals).

Players create a session per puzzle and submit words in real time.

---

## Project Structure

src/
  db/                database models + session setup
  scripts/           puzzle generation + import tools
  services/          game logic (PuzzleService)
  main.py            FastAPI app

frontend/
  index.html
  css/
  js/

---

## Setup

### Install dependencies

uv sync

---

## Run the system

### Start backend API

uvicorn src.main:app --reload --port 8000

API will be available at:
http://localhost:8000

---

### Start frontend (static server)

Run inside the frontend/ folder:

python -m http.server 5500

Then open:
http://localhost:5500

---

## Puzzle generation

### Generate a manual puzzle

python -m src.scripts.generate_puzzle --board MOCI/IENE/SQID/OUBF

Format:
- 4 rows
- letters separated by /
- 4x4 grid required

---

### Generate a random puzzle

python -m src.scripts.generate_puzzle

This will:
- generate random board
- validate solvability
- ensure tile coverage
- enforce word count constraints

---

## Output files

After generation:

daily_puzzle.json
daily_solution.json

### daily_puzzle.json

Public game data:

{
  "id": "...",
  "size": 4,
  "board": [["A","B","C","D"], ...],
  "word_count": 62
}

### daily_solution.json

Contains full solution:
- all valid words
- display + normalized forms
- board paths
- statistics

---

## Import puzzle into database

python -m src.scripts.import_puzzle daily_puzzle.json daily_solution.json

This will:
- create Puzzle row
- store solution JSON
- make puzzle available via API

---

## API endpoints

### Puzzle

GET /puzzle/today
GET /puzzle/{puzzle_id}

Returns puzzle without solution data.

---

### Session

POST /session

Request:

{
  "puzzle_id": "uuid"
}

Response:

{
  "session_id": "uuid"
}

---

### Gameplay

POST /submit-word

Request:

{
  "session_id": "uuid",
  "puzzle_id": "uuid",
  "word": "string"
}

Response:

{
  "success": true,
  "normalized": "PALABRA",
  "display": "Palabra",
  "score_added": 3,
  "total_score": 10,
  "found_count": 5,
  "total_words": 62,
  "completion": 8.12
}

---

### Progress

GET /progress/{session_id}

Response:

{
  "session_id": "uuid",
  "puzzle_id": "uuid",
  "found_words": 5,
  "total_words": 62,
  "score": 10,
  "completed": false,
  "words": ["PALABRA"],
  "display_words": ["Palabra"]
}

---

### Found words (raw)

GET /found-words/{session_id}

Returns normalized words only.

---

### Leaderboard

GET /leaderboard/today
GET /leaderboard/{puzzle_id}

---

## Word validation rules

A word is valid if:

- exists in Spanish dictionary
- exists in puzzle solution set
- formed by adjacent tiles (diagonal allowed)
- each tile used once per word

---

## Backend behavior

- session persists per puzzle
- found words stored in DB
- scoring = len(word) - 3 (min 1)
- progress computed from DB + solution mapping

---

## Dictionary sources

Short wordlist:
https://github.com/eymenefealtun/all-words-in-all-languages/tree/main/Spanish

Long wordlist:
https://github.com/keepassxreboot/keepassxc/discussions/9854

---

## Notes

- frontend is stateless except session_id
- backend is source of truth
- puzzles are immutable after import
- solution JSON is never exposed via API

## Next steps

### UI performance improvements <-- high priority

Current behavior:
- word validation happens server-side
- full roundtrip on every submission
- UI only updates after API response

Planned improvement:
- preload `solution.json` (or a reduced hash map) on puzzle load
- perform instant client-side validation for:
  - word existence
  - duplicate detection
  - early visual feedback
- keep server as source of truth asynchronously
- reconcile state periodically or on submit

Target outcome:
- immediate feedback on word selection
- no perceived latency on valid/invalid words
- reduced API dependency during gameplay loop

---

### Leaderboards

Planned features:
- global leaderboard per puzzle
- daily leaderboard
- session-based ranking by:
  - word count
  - total score
  - completion percentage

API already partially supports:
- `/leaderboard/today`
- `/leaderboard/{puzzle_id}`

Still needed:
- frontend integration
- UI component for ranking display
- optional real-time updates (polling or websocket later)

---

### Session & persistence improvements

Planned:
- session expiration per puzzle day
- cleanup of stale sessions
- better handling of puzzle rotation in localStorage

---