export interface WordInfo {
    bonus: boolean;
    cells: [number, number][];
}

export interface Puzzle {
    id: string;
    size: number;
    board: string[][];
    word_count: number;
    bonus_word_count: number;
    total_score: number;
    word_lengths: Record<string, number>;
    words: Record<string, WordInfo>;
}

export interface Session {
    session_id: string;
}

export interface Progress {
    session_id: string;
    username: string | null;

    found_words: number;
    bonus_found_words: number;

    score: number;
    bonus_score: number;

    completed: boolean;

    words: string[];
    bonus_words: string[];

    display_words: string[];
    display_bonus_words: string[];

    puzzle_id: string;

    total_words: number;
    total_score: number;
    total_bonus_words: number;
}

export interface SubmitWordSuccess {
    success: true;
    normalized: string;
    display: string;
    score_added: number;
    total_score: number;
    found_count: number;
    total_words: number;
    completion: number;
}

export interface SubmitWordFailure {
    success: false;
    reason:
        | "session_not_found"
        | "puzzle_not_found"
        | "invalid_word"
        | "already_found";
}

export type SubmitWordResponse =
    | SubmitWordSuccess
    | SubmitWordFailure;

export interface ApiError {
    detail: string;
}

export interface LeaderboardStats {
    found_words: number;
    bonus_found_words: number;
    score: number;
    bonus_score: number;
}

export interface LeaderboardRow {
    session_id: string;
    username: string | null;
    stats: LeaderboardStats;
}

export interface Leaderboards {
    score: LeaderboardRow[];
    score_bonus: LeaderboardRow[];
    words: LeaderboardRow[];
    words_bonus: LeaderboardRow[];
}

export interface LeaderboardData {
    date: string;
    leaderboards: Leaderboards;
}

export type LeaderboardKey =
    | "score"
    | "score_bonus"
    | "words"
    | "words_bonus";