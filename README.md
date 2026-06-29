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
  "display_words": ["Palabra"],
  "username": "joe"
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
##  Analysis
The API was designed using a capability-driven approach inspired by Arnaud Lauret's API design methodology. Rather than exposing database operations, endpoints correspond to user capabilities required by the Squaredle game. Multiple user interactions may map to the same capability, and each capability is implemented by one or more HTTP operations.
### API Capability Analysis

The API was designed by first identifying the capabilities required by the game rather than starting from endpoints. Each user interaction was decomposed into inputs, successful outcomes, failure cases, and the underlying API capability.

| User | Use Case | Step | Input | Success | Failure | API Capability |
|------|----------|------|-------|----------|----------|---------------|
| Player | Play today's puzzle | Load today's puzzle | — | Puzzle returned | No puzzle published | Retrieve puzzle |
| Player | Start a game | Create a play session | puzzle_id, optional player_id | Session created | Puzzle not found | Create session |
| Anonymous player | Choose a username | Register player | session_id, username | Player created and linked to session | Username already exists | Register player |
| Player | Resume a game | Restore progress | session_id | Found words and score returned | Session not found | Retrieve session progress |
| Player | Submit a word | Validate word | session_id, word | Word accepted and recorded | Invalid word, duplicate word, session not found | Submit word |
| Player | Track progress | Refresh progress | session_id | Current progress returned | Session not found | Retrieve progress |
| Player | View rankings | Display today's leaderboard | — | Leaderboard returned | Puzzle unavailable | Retrieve leaderboard |
| Player | View rankings | Display leaderboard for a puzzle | puzzle_id | Leaderboard returned | Puzzle not found | Retrieve leaderboard |
| Player | Read a definition | Lookup a discovered word | word | Definitions returned | Definition unavailable | Retrieve dictionary entry |
| Monitoring | Check service availability | Health probe | — | Service healthy | Service unavailable | Health check |

---

### API Capability Map

The identified capabilities map directly to the public API.

| Capability | Endpoint |
|------------|----------|
| Retrieve puzzle | `GET /puzzle/today` |
| Retrieve puzzle | `GET /puzzle/{puzzle_id}` |
| Create session | `POST /session` |
| Retrieve session | `GET /session/{session_id}` |
| Register player | `POST /player` |
| Submit word | `POST /submit-word` |
| Retrieve progress | `GET /progress/{session_id}` |
| Retrieve leaderboard | `GET /leaderboard/today` |
| Retrieve leaderboard | `GET /leaderboard/{puzzle_id}` |
| Retrieve dictionary entry | `GET /dictionary/rae` |
| Health check | `GET /health` |

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

Pending features:
* Ranking by:
  * Score
  * Bonus words found
  * Speed
  * Current leaderboard is limited to 100 entries. Improve current user display in the leaderboard.
* Victory screen
* Leaderboard history
* Cache word definitions to minimize API calls

Pending fixes:
* The definition modal sometimes goes out of the screen, making it impossible to read.
