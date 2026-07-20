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
    cellUsage: Map<string, Set<string>>;
    foundWordHashes: Set<string>;
}

export interface WordGroup {
    totalCount: number;
    found: string[];
}
