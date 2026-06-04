import json
import random
from datetime import datetime

import unicodedata
from collections import Counter
from statistics import mean

from wordfreq import zipf_frequency


# ==========================================
# CONFIG
# ==========================================

SIZE = 4

MIN_WORDS = 40
MAX_WORDS = 85

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
# NORMALIZATION
# ==========================================

def normalize(word):
    word = unicodedata.normalize("NFD", word)

    result = []

    for c in word:
        if c == "ñ":
            result.append("Ñ")
        elif c == "Ñ":
            result.append("Ñ")
        elif unicodedata.category(c) != "Mn":
            result.append(c)

    return "".join(result).upper()


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

    def insert(self, word):

        node = self.root

        for ch in word:
            node = node.children.setdefault(ch, TrieNode())

        node.word = word


# ==========================================
# LOAD DICTIONARY
# ==========================================

print("Loading dictionary...")

trie = Trie()
loaded_words = []

with open("Spanish.txt", encoding="utf-8") as f:

    for line in f:

        word = normalize(line.strip())

        if len(word) < 4:
            continue

        if zipf_frequency(word.lower(), "es") < 2.5:
            continue

        trie.insert(word)
        loaded_words.append(word)

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
        if node.word:  # Keep first path found
            if node.word not in found:
                found[node.word] = path.copy()

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

print(f"\nSearching for puzzle with between {MIN_WORDS} and {MAX_WORDS} words...\n")

while True:

    attempts += 1

    board = generate_board()

    solutions = search(board, trie)
    words = set(solutions.keys())

    if attempts % 100 == 0:
        print(
            f"Attempt {attempts:,} | "
            f"best current board: {len(words)} words"
        )

    if MAX_WORDS >= len(words) >= MIN_WORDS:
        break


# ==========================================
# RESULTS
# ==========================================

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

daily_solution = {
    "id": datetime.now().isoformat(),
    "size": SIZE,
    "board": board,
    "word_count": len(words),
    "words": sorted(words),
    "paths": {
        word: [[r,c] for r,c in path]
        for word, path in solutions.items()
    },
    "stats": {
        "word_count": len(words),
        "avg_length": avg_length,
        "max_length": max_length,
        "score": score,
    }
}

daily_puzzle = {
    "id": datetime.now().isoformat(),
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