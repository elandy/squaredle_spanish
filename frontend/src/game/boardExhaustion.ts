import { state } from "./state";

export function updateBoardExhaustion() {
    const board = document.getElementById("board");
    if (!board) return;
    const cells = board.querySelectorAll<HTMLElement>(".cell");
    for (const cell of cells) {
        const row = Number(cell.dataset.row);
        const col = Number(cell.dataset.col);
        const hashes = state.cellUsage.get(`${row},${col}`);
        // No non-bonus words ever use this cell.
        if (!hashes || hashes.size === 0) {
            cell.classList.add("exhausted");
            continue;
        }
        const exhausted = [...hashes].every(hash =>
            state.foundWordHashes.has(hash)
        );
        cell.classList.toggle("exhausted", exhausted);
    }
}