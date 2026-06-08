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

let wordMap = {};
let normalizedFoundWords = new Set();

let dragging = false;

// ==========================================================
// SOUND SYSTEM
// ==========================================================

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

let letterBuffer;
let correctBuffer;
let wrongBuffer;

async function loadSound(url) {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    return await audioCtx.decodeAudioData(arrayBuffer);
}

correctBuffer = await loadSound("/assets/sounds/correct.mp3");
wrongBuffer = await loadSound("/assets/sounds/wrong.mp3");
letterBuffer = await loadSound("/assets/sounds/letter.mp3");

function playBuffer(buffer, playbackRate = 1) {
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;

    source.connect(audioCtx.destination);
    source.start(0);
}

function playLetterSound(index) {
    const semitoneRatio = Math.pow(2, 1 / 12);

    const steps = Math.min(index - 1, 11); // cap at 12 notes
    const rate = Math.pow(semitoneRatio, steps);

    playBuffer(letterBuffer, rate);
}

// ==========================================================
// INIT
// ==========================================================

async function init() {
    puzzle = await getTodayPuzzle();

    wordMap = Object.fromEntries(
        puzzle.words.map(w => [
            w.normalized,
            w.display
        ])
    );

    const savedSession = localStorage.getItem("session_id");
    const savedPuzzle = localStorage.getItem("session_puzzle_id");

    if (!savedSession || savedPuzzle !== puzzle.id) {
        const session = await createSession(puzzle.id);

        sessionId = session.session_id;

        localStorage.setItem(
            "session_id",
            sessionId
        );

        localStorage.setItem(
            "session_puzzle_id",
            puzzle.id
        );
    }
    else {
        sessionId = savedSession;
    }

    await loadProgress();

    renderBoard();
}

// ==========================================================
// PROGRESS
// ==========================================================

async function loadProgress() {
    const progress = await getProgress(sessionId);
    normalizedFoundWords = new Set(progress.words || []);
    foundWords = new Set(progress.display_words || []);
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

    // letter sound with pitch scaling
    playLetterSound(selectedCells.length);
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

    const displayWord = wordMap[currentWord];

    // invalid word
    if (!displayWord) {
        playBuffer(wrongBuffer);
        return;
    }

    // already found
    if (normalizedFoundWords.has(currentWord)) {
        playBuffer(wrongBuffer);
        return;
    }

    // instant UI update
    normalizedFoundWords.add(currentWord);
    foundWords.add(displayWord);

    renderFoundWords();
    updateProgress();

    playBuffer(correctBuffer);

    // fire-and-forget server update
    submitWord(sessionId, puzzle.id, currentWord)
        .catch(error => {
            console.error("submit failed", error);
        });
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
        `${normalizedFoundWords.size} / ${puzzle.word_count}`;
}

// ==========================================================
// START
// ==========================================================

init();