import json
import random
from datetime import datetime, date

from collections import Counter
from pathlib import Path
from statistics import mean

import argparse

from src.utils.normalize import normalize

parser = argparse.ArgumentParser()

parser.add_argument(
    "--board",
    type=str,
)

args = parser.parse_args()

def parse_board(text):
    rows = text.split("/")
    return [
        [normalize(c) for c in row]
        for row in rows
    ]

# ==========================================
# CONFIG
# ==========================================

SIZE = 4

MIN_WORDS = 40
MAX_WORDS = 85
FREQUENCY_FILTER = 3.0
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
# LOAD DICTIONARY
# ==========================================

print("Loading dictionary...")

trie = Trie()
loaded_words = []
DATA_FILE = (Path(__file__).parent.parent/"data"/"Spanish.txt")

with open(DATA_FILE, encoding="utf-16") as f:
    for line in f:
        original = line.strip()
        normalized = normalize(original)
        trie.insert(normalized, original.upper())
        loaded_words.append(original)

print(f"Loaded {len(loaded_words):,} words")

# ==========================================
# BOARD GENERATION
# ==========================================

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
    def dfs(x, y, node, current, visited, path):
        letter = board[x][y]
        if letter not in node.children: return

        node = node.children[letter]
        current += letter
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
            nx = x + dx
            ny = y + dy
            if (
                0 <= nx < n
                and 0 <= ny < n
                and (nx, ny) not in visited
            ):
                dfs(nx, ny, node, current, visited, path)

        path.pop()
        visited.remove((x, y))

    for i in range(n):
        for j in range(n):
            dfs(i, j, trie.root, "", set(), [])

    return found


# ==========================================
# ANALYSIS
# ==========================================

def analyze(words):

    lengths = [len(w) for w in words]

    return {
        "count": len(words),
        "avg_length": round(mean(lengths), 2),
        "max_length": max(lengths),
        "length_distribution": dict(
            Counter(lengths)
        )
    }


# ==========================================
# FIND PUZZLE
# ==========================================

attempts = 0
valid_board = False

print(f"\nSearching for puzzle with between {MIN_WORDS} and {MAX_WORDS} words...\n")

if args.board:
    board = parse_board(args.board)

    if len(board) != SIZE or any(len(row) != SIZE for row in board):
        print(f"Board must be {SIZE}x{SIZE}")
        raise SystemExit(1)

    solutions = search(board, trie)
    words = set(solutions.keys())

    used_tiles = set()
    for data in solutions.values():
        used_tiles.update(data["path"])

    if len(used_tiles) != SIZE * SIZE:
        unused = []
        for r in range(SIZE):
            for c in range(SIZE):
                if (r, c) not in used_tiles:
                    unused.append(f"{board[r][c]} ({r},{c})")
        print("\nINVALID BOARD. Unused tiles:", ", ".join(unused))
        raise SystemExit(1)
    if len(words) > MAX_WORDS:
        print(f"\nINVALID BOARD\n{len(words)} words (maximum is {MAX_WORDS})")
        raise SystemExit(1)

    valid_board = True

    print(f"\nVALID BOARD ({len(words)} words)")
else:
    while True:
        attempts += 1
        board = generate_board()
        solutions = search(board, trie)
        words = set(solutions.keys())
        used_tiles = set()
        for data in solutions.values():
            used_tiles.update(data["path"])

        if attempts % 100 == 0:
            print(f"Attempt {attempts:,} | best current board: {len(words)} words")
        if (
            MIN_WORDS <= len(words) <= MAX_WORDS
            and len(used_tiles) == SIZE * SIZE
        ):
            valid_board = True
            break
# ==========================================
# RESULTS
# ==========================================
if not valid_board:
    raise SystemExit(1)

stats = analyze(words)

print("\n" + "=" * 60)
print("PUZZLE FOUND")
print("=" * 60)

for row in board:
    print(" ".join(row))

print()

print(f"Attempts: {attempts:,}")

for k, v in stats.items():
    print(f"{k}: {v}")

print("\nTop words:\n")

for word in sorted(words, key=lambda w: (-len(w), w))[:50]:
    print(f"{len(word):2d} {word}")

def board_score(words):
    score = 0
    for word in words:
        score += len(word) - 3
    return score

lengths = [len(w) for w in words]
score = board_score(words)
avg_length = round(mean(lengths), 2)
max_length = max(lengths)


# ==========================================
# SAVE
# ==========================================
puzzle_id = date.today().isoformat()

daily_solution = {
    "id": puzzle_id,
    "size": SIZE,
    "board": board,
    "word_count": len(words),
    "words": sorted(
        [
            {
                "display": data["display"],
                "normalized": data["normalized"]
            }
            for data in solutions.values()
        ],
        key=lambda w: w["normalized"]
    ),
    "paths": {
        normalized: [
            [r, c]
            for r, c in data["path"]
        ]
        for normalized, data in solutions.items()
    },
    "stats": {
        "word_count": len(words),
        "avg_length": avg_length,
        "max_length": max_length,
        "score": score,
    }
}

daily_puzzle = {
    "id": puzzle_id,
    "size": SIZE,
    "board": board,
    "word_count": len(words),
}

with open("daily_solution.json", "w", encoding="utf-8") as f:
    json.dump(daily_solution, f, ensure_ascii=False, indent=2)
print("\nSaved daily_solution.json")

with open("daily_puzzle.json", "w", encoding="utf-8") as f:
    json.dump(daily_puzzle, f, ensure_ascii=False, indent=2)
print("\nSaved daily_puzzle.json")