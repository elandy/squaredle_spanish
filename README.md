# Squaredle ES

## Overview

Squaredle ES is a Spanish word puzzle game built with:

* FastAPI backend
* PostgreSQL
* Vanilla JavaScript frontend
* SQLAlchemy ORM
* Custom board generator and solver
* Docker Compose deployment

The game generates a 4x4 letter grid and computes all valid Spanish words that can be formed by adjacent tiles (including diagonals).

Players create a session per puzzle and submit words in real time.

---

## Project Structure

```text
src/
├── db/                # Database models and session setup
├── scripts/           # Puzzle generation and import tools
├── services/          # Game logic (PuzzleService)
└── main.py            # FastAPI application

frontend/
├── index.html
├── css/
└── js/

docker-compose.yml
Dockerfile
```

---

## Running with Docker Compose

### Build and start all services

```bash
docker compose up --build
```

Run in detached mode:

```bash
docker compose up -d --build
```

---

### Stop all services

```bash
docker compose down
```

---

### View logs

All services:

```bash
docker compose logs -f
```

Backend only:

```bash
docker compose logs -f api
```

---

## Accessing the application

Frontend:

```text
http://localhost:5500
```

Backend API:

```text
http://localhost:8000
```

API documentation:

```text
http://localhost:8000/docs
```

Health check:

```text
http://localhost:8000/health
```

---

## Local Development (without Docker)

### Install dependencies

```bash
uv sync
```

### Start backend

```bash
uvicorn src.main:app --reload --port 8000
```

### Start frontend

From the frontend directory:

```bash
python -m http.server 5500
```

Open:

```text
http://localhost:5500
```

---

## Puzzle Generation

### Generate a manual puzzle

```bash
python -m src.scripts.generate_puzzle --board MOCI/IENE/SQID/OUBF
```

Format:

* 4 rows
* Rows separated by `/`
* 4x4 grid required

---

### Generate a random puzzle

```bash
python -m src.scripts.generate_puzzle
```

This will:

* Generate a random board
* Validate solvability
* Ensure tile coverage
* Enforce word count constraints

---

## Output Files

After generation:

```text
daily_puzzle.json
daily_solution.json
```

### daily_puzzle.json

Public game data:

```json
{
  "id": "...",
  "size": 4,
  "board": [["A", "B", "C", "D"]],
  "word_count": 62
}
```

### daily_solution.json

Contains:

* All valid words
* Display and normalized forms
* Tile paths
* Puzzle statistics

---

## Import Puzzle Into Database

```bash
python -m src.scripts.import_puzzle daily_puzzle.json daily_solution.json
```

This will:

* Create a Puzzle row
* Store solution JSON
* Make the puzzle available through the API

---

## API Endpoints

### Health

```http
GET /health
```

---

### Puzzle

```http
GET /puzzle/today
GET /puzzle/{puzzle_id}
```

Returns puzzle data without solution information.

---

### Session

```http
POST /session
```

Request:

```json
{
  "puzzle_id": "uuid"
}
```

Response:

```json
{
  "session_id": "uuid"
}
```

---

### Gameplay

```http
POST /submit-word
```

Request:

```json
{
  "session_id": "uuid",
  "word": "string"
}
```

Response:

```json
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
```

---

### Progress

```http
GET /progress/{session_id}
```

Response:

```json
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
```

---

### Dictionary

```http
GET /dictionary/rae?q=PALABRA
```

Returns RAE definitions for discovered words.

Example:

```json
{
  "word": "CENÉ",
  "definitions": [
    "Tomar la cena",
    "Comer en la cena una cosa"
  ]
}
```

---

### Leaderboard

```http
GET /leaderboard/today
GET /leaderboard/{puzzle_id}
```

---

## Word Validation Rules

A word is valid if:

* Exists in the Spanish dictionary
* Exists in the puzzle solution set
* Is formed by adjacent tiles (diagonals allowed)
* Uses each tile at most once per word

---

## Backend Behavior

* Sessions persist per puzzle
* Found words are stored in the database
* Scoring formula: `max(len(word) - 3, 1)`
* Progress is computed from database state and solution data
* Solution data is never exposed through the API

---

## Dictionary Sources

The wordlist used in this project is derived from:

Short word list:

https://github.com/eymenefealtun/all-words-in-all-languages/tree/main/Spanish

Long word list:

https://github.com/keepassxreboot/keepassxc/discussions/9854

## Optional RAE API Integration

The game can display definitions from the RAE dictionary when hovering over discovered words.

This feature uses the public RAE API:

https://rae-api.com/

An API key is **optional**. The application works without one, but providing a key may help avoid rate limits.

### Configure API Key

Create a `.env` file in the project root:

```env
RAE_API_KEY=your_api_key_here
```

### Docker Compose

If using Docker Compose, ensure the environment variable is passed to the API container:

```yaml
services:
  api:
    environment:
      - RAE_API_KEY=${RAE_API_KEY}
```

Then start or restart the stack:

```bash
docker compose up -d --build
```

### Endpoint

```http
GET /dictionary/rae?q=PALABRA
```

Example response:

```json
{
  "word": "CENÉ",
  "definitions": [
    "Tomar la cena",
    "Comer en la cena una cosa"
  ]
}
```

If the RAE service is unavailable, gameplay is unaffected. Dictionary lookups are optional and independent from word validation.

---

## Notes

* Frontend is stateless except for `session_id`
* Backend is the source of truth
* Puzzles are immutable after import
* Solution JSON is never exposed through the API

---

## Roadmap

### Leaderboards

Planned features:

* Global leaderboard per puzzle
* Daily leaderboard
* Ranking by:

  * Word count
  * Score
  * Completion percentage

Current API support:

```http
GET /leaderboard/today
GET /leaderboard/{puzzle_id}
```

Still needed:

* Frontend integration
* Ranking UI
* Optional realtime updates

---

### Session Improvements

Planned:

* Session expiration
* Cleanup of stale sessions
* Better puzzle rotation handling
* Improved localStorage management
