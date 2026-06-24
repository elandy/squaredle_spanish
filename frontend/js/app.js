import {
    getTodayPuzzle,
    createSession,
    submitWord,
    getProgress,
    fetchDefinition,
} from "./api.js";

let puzzle;
let sessionId;

let foundWords = new Set();

let selectedCells = [];
let currentWord = "";

let wordMap = {};
let normalizedFoundWords = new Set();

let dragging = false;

document.addEventListener("click", (e) => {
    if (!e.target.closest(".word-chip")) {
        hideTooltip();
    }
});

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
// WORD DEFINITION TOOLTIP
// ==========================================================

function getTooltip() {
    return document.getElementById("definition-tooltip");
}

function showTooltip(word, rect) {
    const tooltip = getTooltip();
    tooltip.textContent = "Cargando...";

    tooltip.style.left = `${rect.left}px`;
    tooltip.style.top = `${rect.bottom + 8}px`;

    tooltip.classList.add("active");

    fetchDefinition(word).then(data => {
        tooltip.innerHTML = "";

        const title = document.createElement("div");
        title.className = "tooltip-word";
        title.textContent = data.word;

        tooltip.appendChild(title);

        data.definitions.forEach(definition => {
            const item = document.createElement("div");
            item.className = "tooltip-definition";
            item.textContent = definition;

            tooltip.appendChild(item);
        });
    });
}

function hideTooltip() {
    const tooltip = getTooltip();
    tooltip.classList.remove("active");
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
            playLetterSound(selectedCells.length);
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
}

function updateCurrentWord() {
    const el = document.getElementById("current-word");
    el.textContent = currentWord;
    el.classList.remove("valid", "invalid");
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
        spawnWordAnimation(currentWord, "wrong");
        currentWord = "";
        updateCurrentWord();
        return;
    }

    // already found
    if (normalizedFoundWords.has(currentWord)) {
        spawnWordAnimation(currentWord, "wrong");
        currentWord = "";
        updateCurrentWord();
        return;
    }

    // instant UI update
    normalizedFoundWords.add(currentWord);
    foundWords.add(displayWord);

    renderFoundWords();
    updateProgress();
    spawnWordAnimation(displayWord, "correct");

    playBuffer(correctBuffer);
    // fire-and-forget server update
    submitWord(sessionId, puzzle.id, currentWord)
        .catch(error => {
            console.error("submit failed", error);
        });

    currentWord = "";
    updateCurrentWord();
}

// ==========================================================
// UI
// ==========================================================

function renderFoundWords() {
    const container = document.getElementById("found-words");
    container.innerHTML = "";

    // Build full solution groups
    const groups = {};

    for (const w of puzzle.words) {
        const len = w.display.length;

        if (!groups[len]) {
            groups[len] = {
                total: [],
                found: []
            };
        }

        groups[len].total.push(w.display);

        if (foundWords.has(w.display)) {
            groups[len].found.push(w.display);
        }
    }

    Object.keys(groups)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach(len => {
            const group = groups[len];

            const wrapper = document.createElement("div");
            wrapper.className = "word-group";

            const title = document.createElement("div");
            title.className = "word-group-title";
            title.textContent =
                `${len} letras (+${group.total.length - group.found.length} palabras faltantes)`;

            const wordsWrap = document.createElement("div");
            wordsWrap.className = "word-group-words";

            group.found
                .sort()
                .forEach(word => {
                    const chip = document.createElement("div");
                    chip.className = "word-chip found";
                    chip.textContent = word;
                    chip.addEventListener("click", (e) => {
                        const rect = chip.getBoundingClientRect();
                        showTooltip(word, rect);
                    });
                    wordsWrap.appendChild(chip);
                });

            wrapper.appendChild(title);
            wrapper.appendChild(wordsWrap);
            container.appendChild(wrapper);
        });
}

function updateProgress() {
    document.getElementById("progress").textContent =
        `${normalizedFoundWords.size} / ${puzzle.word_count}`;
}

function spawnWordAnimation(text, type) {
    const el = document.createElement("div");

    el.textContent = text;
    el.className = `floating-word ${type}`;

    document.body.appendChild(el);
    void el.offsetWidth;

    // trigger animation
    requestAnimationFrame(() => {
        el.classList.add("active");
    });

    el.addEventListener("animationend", () => {
        el.remove();
    });
}

// ==========================================================
// START
// ==========================================================

init();