import {GameState} from "../types/game";

export const state: GameState = {
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

export function setGameState(updates: Partial<GameState>) {
    Object.assign(state, updates);
}