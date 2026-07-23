import {APP_CONFIG} from "../config";
import {
    Puzzle,
    Session,
    Progress,
    SubmitWordResponse,
    LeaderboardData, PlayerStatistics
} from "../types/api";

const API_BASE = APP_CONFIG.API_BASE;

export async function getTodayPuzzle(): Promise<Puzzle> {
    const res = await fetch(`${API_BASE}/puzzle/today`);
    return await res.json();
}

export async function createSession(
    puzzleId: string,
    playerId: string | null = null
): Promise<Session> {
    const res = await fetch(`${API_BASE}/session`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            puzzle_id: puzzleId,
            player_id: playerId
        })
    });

    return await res.json();
}

export async function getSession(sessionId: string) {
    const res = await fetch(`${API_BASE}/session/${sessionId}`);
    return await res.json();
}

export async function submitWord(
    sessionId: string,
    puzzleId: string,
    word: string
): Promise<SubmitWordResponse> {
    const res = await fetch(`${API_BASE}/submit-word`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            session_id: sessionId,
            puzzle_id: puzzleId,
            word
        })
    });

    return await res.json();
}

export async function getProgress(
    sessionId: string
): Promise<Progress> {
    const res = await fetch(`${API_BASE}/progress/${sessionId}`);
    return await res.json();
}

export async function fetchDefinition(word: string) {
    const res = await fetch(
        `${API_BASE}/dictionary/rae?q=${encodeURIComponent(word)}`
    );
    return res.json();
}

export async function getLeaderboard(): Promise<LeaderboardData> {
    const res = await fetch(`${API_BASE}/leaderboard/today`);
    return await res.json();
}

export async function createPlayer(sessionId: string, username: string) {
    const res = await fetch(`${API_BASE}/player`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            session_id: sessionId,
            username
        })
    });

    if (!res.ok) {
        throw await res.json();
    }

    return await res.json();
}

export async function getPlayerStatistics(
    playerId: string
): Promise<PlayerStatistics> {
    const res = await fetch(
        `${API_BASE}/player/${playerId}/statistics`
    );

    return await res.json();
}