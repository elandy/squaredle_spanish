import {
    getTodayPuzzle,
    createSession,
    submitWord,
    getProgress
} from "./api.js";

let puzzle;
let sessionId;

let foundWords = new Set();

let selectedCells = [];
let currentWord = "";

let dragging = false;

// ==========================================================
// INIT
// ==========================================================

async function init() {
    puzzle = await getTodayPuzzle();

    sessionId = localStorage.getItem("session_id");

    if (!sessionId) {
        const session = await createSession(puzzle.id);
        sessionId = session.session_id;
        localStorage.setItem("session_id", sessionId);
    }

    await loadProgress();

    renderBoard();
}

// ==========================================================
// PROGRESS
// ==========================================================

async function loadProgress() {
    const progress = await getProgress(sessionId);

    foundWords = new Set(progress.words || []);

    updateProgress();
    renderFoundWords();
}

// ==========================================================
// BOARD
// ==========================================================

function renderBoard() {
    const board = document.getElementById("board");
    board.innerHTML = "";

    board.style.gridTemplateColumns =
        `repeat(${puzzle.size}, 70px)`;

    for (let row = 0; row < puzzle.size; row++) {
        for (let col = 0; col < puzzle.size; col++) {
            const cell = document.createElement("div");

            cell.className = "cell";
            cell.textContent = puzzle.board[row][col];

            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.dataset.letter = puzzle.board[row][col];

            cell.addEventListener("pointerdown", startSelection);
            board.appendChild(cell);
        }
    }

    board.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishSelection);

    updateProgress();
}

// ==========================================================
// POINTER CONTROL (RESTORED ORIGINAL BEHAVIOR)
// ==========================================================

function handlePointerMove(event) {
    if (!dragging) return;

    const element = document.elementFromPoint(
        event.clientX,
        event.clientY
    );

    const cell = element?.closest(".cell");
    if (!cell) return;

    if (!cursorNearCenter(cell, event.clientX, event.clientY)) return;

    addCell(cell);
}

function cursorNearCenter(cell, x, y) {
    const rect = cell.getBoundingClientRect();

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = x - cx;
    const dy = y - cy;

    return Math.sqrt(dx * dx + dy * dy) < rect.width * 0.35;
}

// ==========================================================
// SELECTION LOGIC (RESTORED BACKTRACKING)
// ==========================================================

function startSelection(event) {
    clearSelection();
    dragging = true;

    const cell = event.target.closest(".cell");
    addCell(cell);
}

function addCell(cell) {
    if (!cell) return;

    const existingIndex = selectedCells.indexOf(cell);

    // ==========================
    // BACKTRACKING RULE
    // ==========================
    if (existingIndex !== -1) {
        if (existingIndex === selectedCells.length - 2) {
            const removed = selectedCells.pop();
            removed.classList.remove("selected");

            currentWord = currentWord.slice(0, -1);
            updateCurrentWord();
        }
        return;
    }

    // adjacency constraint
    if (selectedCells.length > 0) {
        const prev = selectedCells[selectedCells.length - 1];
        if (!isAdjacent(prev, cell)) return;
    }

    selectedCells.push(cell);
    cell.classList.add("selected");

    currentWord += cell.dataset.letter;
    updateCurrentWord();
}

function isAdjacent(a, b) {
    const ar = +a.dataset.row, ac = +a.dataset.col;
    const br = +b.dataset.row, bc = +b.dataset.col;

    return Math.abs(ar - br) <= 1 &&
           Math.abs(ac - bc) <= 1 &&
           !(ar === br && ac === bc);
}

function finishSelection() {
    if (!dragging) return;
    dragging = false;

    submitCurrentWord();
    clearSelection();
}

function clearSelection() {
    selectedCells.forEach(c => c.classList.remove("selected"));
    selectedCells = [];
    currentWord = "";
    updateCurrentWord();
}

function updateCurrentWord() {
    document.getElementById("current-word").textContent = currentWord;
}

// ==========================================================
// SERVER
// ==========================================================

async function submitCurrentWord() {
    if (!currentWord) return;

    const result = await submitWord(
        sessionId,
        puzzle.id,
        currentWord
    );

    if (!result.success) return;

    foundWords.add(result.word);

    renderFoundWords();
    updateProgress();
}

// ==========================================================
// UI
// ==========================================================

function renderFoundWords() {
    const container = document.getElementById("found-words");
    container.innerHTML = "";

    [...foundWords]
        .sort()
        .forEach(w => {
            const div = document.createElement("div");
            div.textContent = w;
            container.appendChild(div);
        });
}

function updateProgress() {
    document.getElementById("progress").textContent =
        `${foundWords.size} / ${puzzle.word_count}`;
}

// ==========================================================
// START
// ==========================================================

init();