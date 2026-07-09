import {Puzzle} from "./api";

interface CellPosition {
    row: number;
    col: number;
}

export interface GameState {
    puzzle: Puzzle | null;
    sessionId: string | null;
    normalizedFoundWords: Set<string>;
    normalizedBonusWords: Set<string>;
    foundWords: Set<string>;
    foundBonusWords: Set<string>;
    score: number;
    currentWord: string;
    selectedCells: HTMLElement[];
    dragging: boolean;
}

export interface WordGroup {
    totalCount: number;
    found: string[];
}
