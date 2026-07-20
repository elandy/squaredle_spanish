import { getTodayPuzzle, createSession, getProgress } from "../services/api.js";
import { renderBoard } from "./board.js";
import { askUsername } from "./username.js";
import { updateProgress } from "../ui/progressUI.js";
import { renderFoundWords } from "../ui/foundWords.js";
import { setGameState } from "./state";
import {Puzzle} from "../types/api";
import {sha256} from "../utils/hash";

function buildCellUsage(puzzle: Puzzle): Map<string, Set<string>> {
    const usage = new Map<string, Set<string>>();
    for (const [hash, info] of Object.entries(puzzle.words)) {
        if (info.bonus) continue;
        for (const [row, col] of info.cells) {
            const key = `${row},${col}`;
            if (!usage.has(key)) {
                usage.set(key, new Set());
            }
            usage.get(key)!.add(hash);
        }
    }
    console.log("cellUsage", usage);
    return usage;
}

async function loadProgress(sessionId: string, puzzle: Puzzle) {
    const progress = await getProgress(sessionId);
    const foundWordHashes = new Set(
        await Promise.all(
            (progress.words ?? []).map(word =>
                sha256(word + puzzle.id)
            )
        )
    );

    setGameState({
        normalizedFoundWords: new Set(progress.words || []),
        normalizedBonusWords: new Set(progress.bonus_words || []),
        foundWords: new Set(progress.display_words || []),
        foundBonusWords: new Set(progress.display_bonus_words || []),
        score: progress.score || 0,
        foundWordHashes,
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

    setGameState({ puzzle, sessionId, cellUsage: buildCellUsage(puzzle) });
    await loadProgress(sessionId, puzzle);
    renderBoard();
}
