import {
    getTodayPuzzle,
    createSession,
    submitWord,
    getProgress,
    createPlayer, getLeaderboard
} from "./api.js";
import { correctBuffer, wrongBuffer, playBuffer, playLetterSound, toggleMute, isMuted} from "./audio.js";
import { showTooltip, hideTooltip} from "./tooltip.js";
import { askUsername } from "./username.js";

let puzzle;
let sessionId;

let foundWords = new Set();
let foundBonusWords = new Set();
let normalizedFoundWords = new Set();
let normalizedBonusWords = new Set();

let selectedCells = [];
let currentWord = "";

let dragging = false;

document.addEventListener("click", (e) => {
    if (!e.target.closest(".word-chip")) {
        hideTooltip();
    }
});

document.getElementById("leaderboard-btn").addEventListener("click", async () => {
    const data = await getLeaderboard()
    showLeaderboardModal(data);
});

// ==========================================================
// INIT
// ==========================================================

async function init() {
    puzzle = await getTodayPuzzle();

    const savedSession = localStorage.getItem("session_id");
    const savedPuzzle = localStorage.getItem("session_puzzle_id");

    if (!savedSession || savedPuzzle !== puzzle.id) {
        const session = await createSession(
            puzzle.id,
            localStorage.getItem("player_id")
        );

        sessionId = session.session_id;

        localStorage.setItem("session_id", sessionId);
        localStorage.setItem("session_puzzle_id", puzzle.id);
    } else {
        sessionId = savedSession;
    }

    let playerId = localStorage.getItem("player_id");

    if (!playerId) {
        await askUsername(sessionId);
    }

    await loadProgress();
    renderBoard();
}

const muteBtn = document.getElementById("mute-btn");

function updateMuteButton() {
    muteBtn.textContent = isMuted()
        ? "🔇"
        : "🔊";
}

muteBtn.addEventListener("click", () => {
    toggleMute();
    updateMuteButton();
});

updateMuteButton();

// ==========================================================
// PROGRESS
// ==========================================================

async function loadProgress() {
    const progress = await getProgress(sessionId);

    normalizedFoundWords = new Set(progress.words || []);
    normalizedBonusWords = new Set(progress.bonus_words || []);
    foundWords = new Set(progress.display_words || []);
    foundBonusWords = new Set(progress.display_bonus_words || []);

    updateProgress();
    renderFoundWords();

    const username = progress.username || "Anónimo";

    document.getElementById("player-info").textContent = `${username}`;
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
            cell.setAttribute("translate", "no");

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

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function submitCurrentWord() {
    if (!currentWord) return;

    const wordWithSalt = currentWord + puzzle.id;
    const wordHash = await sha256(wordWithSalt);
    const isValid = wordHash in puzzle.words;
    const isBonus = puzzle.words[wordHash];

    // invalid word
    if (!isValid) {
        playBuffer(wrongBuffer);
        spawnWordAnimation(currentWord, "wrong");
        currentWord = "";
        updateCurrentWord();
        return;
    }

    // already found
    if (
        normalizedFoundWords.has(currentWord) ||
        normalizedBonusWords.has(currentWord)
    ) {
        spawnWordAnimation(currentWord, "wrong");
        currentWord = "";
        updateCurrentWord();
        return;
    }

    // instant UI update
    if (isBonus) {
        normalizedBonusWords.add(currentWord);
    }
    else {
        normalizedFoundWords.add(currentWord);
    }

    // Add temporary uppercase guess as display word
    const tempDisplayWord = currentWord;

    if (isBonus) {
        foundBonusWords.add(tempDisplayWord);
    } else {
        foundWords.add(tempDisplayWord);
    }

    renderFoundWords();
    updateProgress();
    spawnWordAnimation(tempDisplayWord, "correct");

    playBuffer(correctBuffer);
    
    // fire-and-forget server update
    const submittedWord = currentWord;
    submitWord(sessionId, puzzle.id, submittedWord)
        .then(result => {
            if (result && result.success) {
                if (isBonus) {
                    foundBonusWords.delete(tempDisplayWord);
                    foundBonusWords.add(result.display);
                } else {
                    foundWords.delete(tempDisplayWord);
                    foundWords.add(result.display);
                }

                renderFoundWords();
            }
        })
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

    const groups = {};

    // Initialize groups from word_lengths
    for (const [lenStr, total] of Object.entries(puzzle.word_lengths || {})) {
        const len = Number(lenStr);
        groups[len] = {
            totalCount: total,
            found: []
        };
    }

    // Populate found words into their groups
    for (const word of foundWords) {
        const len = word.length;
        if (!groups[len]) {
            groups[len] = {
                totalCount: 0,
                found: []
            };
        }
        groups[len].found.push(word);
    }

    Object.keys(groups)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach(len => {
            const group = groups[len];
            const missing = Math.max(0, group.totalCount - group.found.length);

            const wrapper = document.createElement("div");
            wrapper.className = "word-group";

            const title = document.createElement("div");
            title.className = "word-group-title";
            title.textContent =
                `${len} letras (+${missing} palabras faltantes)`;

            const wordsWrap = document.createElement("div");
            wordsWrap.className = "word-group-words";

            group.found
                .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
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

    // Bonus words section
    if (foundBonusWords.size > 0) {
        const missingBonus = Math.max(0, puzzle.bonus_word_count - foundBonusWords.size);
        const wrapper = document.createElement("div");
        wrapper.className = "word-group";

        const title = document.createElement("div");
        title.className = "word-group-title";
        title.textContent = `Palabras bonus (+${missingBonus} palabras faltantes)`;

        const wordsWrap = document.createElement("div");
        wordsWrap.className = "word-group-words";

        [...foundBonusWords]
            .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
            .forEach(word => {
                const chip = document.createElement("div");
                chip.className = "word-chip found bonus";
                chip.textContent = word;

                chip.addEventListener("click", () => {
                    const rect = chip.getBoundingClientRect();
                    showTooltip(word, rect);
                });

                wordsWrap.appendChild(chip);
            });

        wrapper.appendChild(title);
        wrapper.appendChild(wordsWrap);
        container.appendChild(wrapper);
    }
}

function updateProgress() {
    const normal = normalizedFoundWords.size;
    const bonus = normalizedBonusWords.size;

    const totalNormal = puzzle.word_count;
    const totalBonus = puzzle.bonus_word_count || 0;

    const text =
        `${normal} / ${totalNormal}` +
        (totalBonus > 0 ? ` (+${bonus}/${totalBonus} bonus)` : "");

    document.querySelector("#progress .progress-text").textContent = text;

    const ratio = totalNormal === 0 ? 0 : (normal / totalNormal) * 100;
    document.querySelector("#progress .progress-bar").style.width = `${ratio}%`;
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
// Leaderboard
// ==========================================================

function showLeaderboardModal(data) {
    const modal = document.getElementById("leaderboard-modal");
    const list = document.getElementById("leaderboard-list");
    const dateEl = document.getElementById("leaderboard-date");

    list.innerHTML = "";

    dateEl.textContent = data.date;

    data.leaderboard.forEach((row, i) => {
        const div = document.createElement("div");

        div.className = "word-chip";
        div.textContent =
            `${i + 1}. ${row.username ?? "Anónimo"} - ${row.words_found}`;

        list.appendChild(div);
    });

    modal.classList.remove("hidden");
}

document.getElementById("close-leaderboard").onclick = () => {
    document.getElementById("leaderboard-modal").classList.add("hidden");
};

// ==========================================================
// START
// ==========================================================

init();