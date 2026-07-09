import { state } from "../game/state";

export function updateProgress() {
    if (!state.puzzle) {
        throw new Error("Puzzle not initialized");
    }

    const bonus = state.normalizedBonusWords.size;

    const totalScore = state.puzzle.total_score;
    const totalBonus = state.puzzle.bonus_word_count || 0;

    const text: string =
        `${state.score} / ${totalScore}` +
        (totalBonus > 0 ? ` (+${bonus}/${totalBonus} bonus)` : "");

    const progressText = document.querySelector("#progress .progress-text") as HTMLDivElement;
    progressText.textContent = text;

    const ratio = totalScore === 0 ? 0 : (state.score / totalScore) * 100;
    const progressBar = document.querySelector("#progress .progress-bar") as HTMLDivElement;
    progressBar.style.width = `${ratio}%`;
}
