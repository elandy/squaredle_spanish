import json
import random
from datetime import date
from collections import Counter
from pathlib import Path
from statistics import mean
from wordfreq import zipf_frequency

from src.utils.normalize import normalize


# ==========================================
# CONFIG
# ==========================================
BONUS_ZIPF_THRESHOLD = 3
SIZE = 4

MIN_WORDS = 80
MAX_WORDS = 1000

LETTERS = (
    "EEEEEEEEEEEE"
    "AAAAAAAAAAA"
    "OOOOOOOOOO"
    "SSSSSSSS"
    "NNNNNNN"
    "RRRRRRR"
    "IIIIIII"
    "LLLLL"
    "DDDDD"
    "TTTTT"
    "CCCC"
    "UUUU"
    "MMMM"
    "PPPP"
    "BBB"
    "GGG"
    "VV"
    "YY"
    "HH"
    "FF"
    "ZZ"
    "JJ"
    "Ñ"
)


# ==========================================
# TRIE
# ==========================================

class TrieNode:
    def __init__(self):
        self.children = {}
        self.word = None


class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, normalized_word, display_word):
        node = self.root
        for ch in normalized_word:
            node = node.children.setdefault(ch, TrieNode())

        node.word = {
            "display": display_word,
            "normalized": normalized_word,
        }


# ==========================================
# LOAD DICTIONARY (lazy, cached)
# ==========================================

_trie = None

def get_trie():
    global _trie

    if _trie is not None:
        return _trie

    trie = Trie()
    data_file = Path(__file__).parent.parent / "data" / "Spanish.txt"

    with open(data_file, encoding="utf-16") as f:
        for line in f:
            original = line.strip()
            normalized = normalize(original)
            trie.insert(normalized, original.upper())

    _trie = trie
    return trie


# ==========================================
# BOARD UTILITIES
# ==========================================

def parse_board(text):
    rows = text.split("/")
    return [[normalize(c) for c in row] for row in rows]


def generate_board():
    return [
        [random.choice(LETTERS) for _ in range(SIZE)]
        for _ in range(SIZE)
    ]


# ==========================================
# SOLVER
# ==========================================

DIRECTIONS = [
    (-1, -1), (-1, 0), (-1, 1),
    (0, -1),           (0, 1),
    (1, -1),  (1, 0),  (1, 1)
]


def search(board, trie):
    found = {}
    n = len(board)

    def dfs(x, y, node, visited, path):
        letter = board[x][y]
        if letter not in node.children:
            return

        node = node.children[letter]
        visited.add((x, y))
        path.append((x, y))

        if node.word:
            key = node.word["normalized"]
            if key not in found:
                found[key] = {
                    "display": node.word["display"],
                    "normalized": node.word["normalized"],
                    "path": path.copy(),
                }

        for dx, dy in DIRECTIONS:
            nx, ny = x + dx, y + dy
            if 0 <= nx < n and 0 <= ny < n and (nx, ny) not in visited:
                dfs(nx, ny, node, visited, path)

        path.pop()
        visited.remove((x, y))

    for i in range(n):
        for j in range(n):
            dfs(i, j, trie.root, set(), [])

    return found


# ==========================================
# ANALYSIS
# ==========================================

def analyze(normal_words, bonus_words):
    lengths = [len(w) for w in normal_words]

    return {
        "count": len(normal_words),
        "bonus_count": len(bonus_words),
        "avg_length": round(mean(lengths), 2),
        "max_length": max(lengths),
        "length_distribution": dict(Counter(lengths)),
        "score": sum(len(w) - 3 for w in normal_words)
    }


def board_score(words):
    return sum(len(w) - 3 for w in words)


_word_frequency_cache = {}

def is_bonus_word(word: str) -> bool:
    freq = _word_frequency_cache.get(word)

    if freq is None:
        freq = zipf_frequency(word.lower(), "es")
        _word_frequency_cache[word] = freq

    return freq < BONUS_ZIPF_THRESHOLD

# ==========================================
# CORE FUNCTION
# ==========================================

def generate_puzzle(board=None, puzzle_date: date | None = None):
    trie = get_trie()

    attempts = 0
    valid = False

    if board is None:
        while True:
            attempts += 1
            board = generate_board()
            solutions = search(board, trie)
            words = set(solutions.keys())
            normal_words = {
                w
                for w in words
                if not is_bonus_word(w)
            }

            bonus_words = words - normal_words

            used = set()
            for data in solutions.values():
                used.update(data["path"])

            if (
                MIN_WORDS <= len(words) <= MAX_WORDS
                and len(used) == SIZE * SIZE
            ):
                valid = True
                break
    else:
        if len(board) != SIZE or any(len(r) != SIZE for r in board):
            raise ValueError("Board must be 4x4")

        solutions = search(board, trie)
        words = set(solutions.keys())
        normal_words = {
            w
            for w in words
            if not is_bonus_word(w)
        }

        bonus_words = words - normal_words

        used = set()
        for data in solutions.values():
            used.update(data["path"])

        if len(used) != SIZE * SIZE:
            raise ValueError("Board has unused tiles")

        if len(words) > MAX_WORDS:
            raise ValueError("Too many words")

        valid = True

    if not valid:
        raise RuntimeError("No valid puzzle found")

    stats = analyze(normal_words, bonus_words)
    score = board_score(normal_words)

    # IMPORTANT CHANGE HERE
    if puzzle_date is None:
        puzzle_date = date.today()

    puzzle_id = puzzle_date.isoformat()

    daily_solution = {
        "id": puzzle_id,
        "size": SIZE,
        "board": board,
        "word_count": len(words),
        "words": sorted(
            [
                {
                    "display": data["display"],
                    "normalized": data["normalized"],
                    "bonus": is_bonus_word(data["normalized"]),
                }
                for data in solutions.values()
            ],
            key=lambda w: w["normalized"],
        ),
        "paths": {
            k: [[r, c] for r, c in v["path"]]
            for k, v in solutions.items()
        },
        "stats": stats,
    }

    daily_puzzle = {
        "id": puzzle_id,
        "size": SIZE,
        "board": board,
        "word_count": len(words),
    }

    return {
        "board": board,
        "solutions": solutions,
        "words": words,
        "stats": stats,
        "puzzle": daily_puzzle,
        "solution": daily_solution,
        "attempts": attempts,
    }

# ==========================================
# CLI (optional backward compatibility)
# ==========================================

if __name__ == "__main__":
    result = generate_puzzle()

    with open("daily_solution.json", "w", encoding="utf-8") as f:
        json.dump(result["solution"], f, ensure_ascii=False, indent=2)

    with open("daily_puzzle.json", "w", encoding="utf-8") as f:
        json.dump(result["puzzle"], f, ensure_ascii=False, indent=2)

    print("Saved files")