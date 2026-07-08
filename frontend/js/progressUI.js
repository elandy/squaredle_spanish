import { state } from "./state.js";

export function updateProgress() {
    const bonus = state.normalizedBonusWords.size;

    const totalScore = state.puzzle.total_score;
    const totalBonus = state.puzzle.bonus_word_count || 0;

    const text =
        `${state.score} / ${totalScore}` +
        (totalBonus > 0 ? ` (+${bonus}/${totalBonus} bonus)` : "");

    document.querySelector("#progress .progress-text").textContent = text;

    const ratio = totalScore === 0 ? 0 : (state.score / totalScore) * 100;
    document.querySelector("#progress .progress-bar").style.width = `${ratio}%`;
}
