import { submitCurrentWord } from "./wordSubmission.js";
import { playLetterSound } from "../audio/audio.js";
import { state } from "./state";

export function updateCurrentWord() {
    const el = document.getElementById("current-word")!;
    el.textContent = state.currentWord;
    el.classList.remove("valid", "invalid");
}

export function startSelection(event: PointerEvent) {
    clearSelection();
    state.dragging = true;
    const target = event.target as HTMLElement;
    const cell = target.closest<HTMLElement>(".cell");
    addCell(cell);
}

export function finishSelection() {
    if (!state.dragging) return;
    state.dragging = false;

    submitCurrentWord();
    clearSelection();
}

function clearSelection() {
    state.selectedCells.forEach(cell => cell.classList.remove("selected"));
    state.selectedCells = [];
}

export function handlePointerMove(event: PointerEvent) {
    if (!state.dragging) return;

    const element = document.elementFromPoint(
        event.clientX,
        event.clientY
    );

    const cell = element?.closest(".cell");
    if (!(cell instanceof HTMLElement)) {
        return;
    }

    if (!cursorNearCenter(cell, event.clientX, event.clientY)) return;

    addCell(cell);
}

function cursorNearCenter(
    cell: HTMLElement,
    x: number,
    y: number
) {
    const rect = cell.getBoundingClientRect();

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = x - cx;
    const dy = y - cy;

    return Math.sqrt(dx * dx + dy * dy) < rect.width * 0.35;
}

function addCell(cell: HTMLElement | null) {
    if (!cell) return;

    const existingIndex = state.selectedCells.indexOf(cell);

    if (existingIndex !== -1) {
        if (existingIndex === state.selectedCells.length - 2) {
            const removed = state.selectedCells.pop();
            if (removed) {
                removed.classList.remove("selected");
            }

            state.currentWord = state.currentWord.slice(0, -1);
            updateCurrentWord();
            playLetterSound(state.selectedCells.length);
        }
        return;
    }

    if (state.selectedCells.length > 0) {
        const prev = state.selectedCells[state.selectedCells.length - 1];
        if (!isAdjacent(prev, cell)) return;
    }

    state.selectedCells.push(cell);
    cell.classList.add("selected");

    state.currentWord += cell.dataset.letter;
    updateCurrentWord();
    playLetterSound(state.selectedCells.length);
}

function isAdjacent(
    a: HTMLElement,
    b: HTMLElement
) {
    const ar = +(a.dataset.row!)
    const ac = +(a.dataset.col!)
    const br = +(b.dataset.row!)
    const bc = +(b.dataset.col!)

    return Math.abs(ar - br) <= 1 &&
        Math.abs(ac - bc) <= 1 &&
        !(ar === br && ac === bc);
}
