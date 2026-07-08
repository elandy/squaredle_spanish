export const state = {
    puzzle: null,
    sessionId: null,
    normalizedFoundWords: new Set(),
    normalizedBonusWords: new Set(),
    foundWords: new Set(),
    foundBonusWords: new Set(),
    score: 0,
    currentWord: "",
    selectedCells: [],
    dragging: false
};

export function setGameState(updates) {
    Object.assign(state, updates);
}
