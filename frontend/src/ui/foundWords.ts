import { showTooltip } from "./tooltip";
import { state } from "../game/state";
import { WordGroup } from "../types/game";

export function renderFoundWords() {
    if (!state.puzzle) {
        throw new Error("Puzzle not initialized");
    }

    const container = document.getElementById("found-words") as HTMLDivElement;
    container.innerHTML = "";

    const groups: Record<number, WordGroup> = {};

    for (const [lenStr, total] of Object.entries(state.puzzle.word_lengths || {})) {
        const len = Number(lenStr);
        groups[len] = {
            totalCount: total,
            found: []
        };
    }

    for (const word of state.foundWords) {
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
                    chip.addEventListener("click", () => {
                        const rect: DOMRect = chip.getBoundingClientRect();
                        showTooltip(word, rect);
                    });
                    wordsWrap.appendChild(chip);
                });

            wrapper.appendChild(title);
            wrapper.appendChild(wordsWrap);
            container.appendChild(wrapper);
        });

    if (state.foundBonusWords.size > 0) {
        const missingBonus = Math.max(
            0,
            state.puzzle.bonus_word_count - state.foundBonusWords.size
        );
        const wrapper = document.createElement("div");
        wrapper.className = "word-group";

        const title = document.createElement("div");
        title.className = "word-group-title";
        title.textContent = `Palabras bonus (+${missingBonus} palabras faltantes)`;

        const wordsWrap = document.createElement("div");
        wordsWrap.className = "word-group-words";

        [...state.foundBonusWords]
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
