import { state } from "./state";

export function updateBoardHints() {
    if (!state.puzzle) { return; }
    const enabled = state.score >= state.puzzle.total_score / 2;
    // Remove existing badges
    document
        .querySelectorAll(".cell-start-count")
        .forEach(el => el.remove());

    if (!enabled) { return; }

    const counts = new Map<string, number>();
    for (const [hash, info] of Object.entries(state.puzzle.words)) {
        if (info.bonus) { continue; }
        if (state.foundWordHashes.has(hash)) { continue; }

        const [row, col] = info.cells[0];
        const key = `${row},${col}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    document.querySelectorAll<HTMLElement>(".cell").forEach(cell => {
        const row = cell.dataset.row!;
        const col = cell.dataset.col!;
        const key = `${row},${col}`;

        const count = counts.get(key);

        if (!count) { return; }

        const badge = document.createElement("div");
        badge.className = "cell-start-count";
        badge.textContent = String(count);

        cell.appendChild(badge);
    });
}