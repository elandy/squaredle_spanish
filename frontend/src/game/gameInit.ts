import { getTodayPuzzle, createSession, getProgress } from "../services/api.js";
import { renderBoard } from "./board.js";
import { askUsername } from "./username.js";
import { updateProgress } from "../ui/progressUI.js";
import { renderFoundWords } from "../ui/foundWords.js";
import { setGameState } from "./state.ts";

async function loadProgress(sessionId: string) {
    const progress = await getProgress(sessionId);

    setGameState({
        normalizedFoundWords: new Set(progress.words || []),
        normalizedBonusWords: new Set(progress.bonus_words || []),
        foundWords: new Set(progress.display_words || []),
        foundBonusWords: new Set(progress.display_bonus_words || []),
        score: progress.score || 0
    });

    updateProgress();
    renderFoundWords();

    const username = progress.username || "Anonimo";
    const playerInfo = document.getElementById("player-info");

    if (playerInfo) {
        playerInfo.textContent = username;
    }
}

export async function init() {
    const puzzle = await getTodayPuzzle();
    let sessionId: string | null = null;
    const savedSession = localStorage.getItem("session_id");
    const savedPuzzle = localStorage.getItem("session_puzzle_id");

    if (!savedSession || savedPuzzle !== puzzle.id) {
        const session = await createSession(
            puzzle.id,
            localStorage.getItem("player_id")
        );

        sessionId = session.session_id;

        localStorage.setItem("session_id", sessionId);
        localStorage.setItem("session_puzzle_id", puzzle.id);
    } else {
        sessionId = savedSession;
    }

    const playerId = localStorage.getItem("player_id");

    if (!playerId) {
        await askUsername(sessionId);
    }
    if (!sessionId) {
        throw new Error("Session ID was not created");
    }

    setGameState({ puzzle, sessionId });
    await loadProgress(sessionId);
    renderBoard();
}
