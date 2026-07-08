import { updateProgress } from "./progressUI.js";
import { state } from "./state.js";
import {
    startSelection,
    handlePointerMove,
    finishSelection
} from "./selection.js";

export function renderBoard() {
    const board = document.getElementById("board");
    board.innerHTML = "";

    board.style.gridTemplateColumns =
        `repeat(${state.puzzle.size}, 70px)`;

    for (let row = 0; row < state.puzzle.size; row++) {
        for (let col = 0; col < state.puzzle.size; col++) {
            const cell = document.createElement("div");

            cell.className = "cell";
            cell.setAttribute("translate", "no");

            cell.textContent = state.puzzle.board[row][col];

            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.dataset.letter = state.puzzle.board[row][col];

            cell.addEventListener("pointerdown", startSelection);
            board.appendChild(cell);
        }
    }

    board.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishSelection);

    updateProgress();
}
