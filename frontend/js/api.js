const API_BASE = window.APP_CONFIG.API_BASE;

export async function getTodayPuzzle() {
    const res = await fetch(`${API_BASE}/puzzle/today`);
    return await res.json();
}

export async function createSession(puzzleId) {
    const res = await fetch(`${API_BASE}/session`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ puzzle_id: puzzleId })
    });

    return await res.json();
}

export async function getSession(sessionId) {
    const res = await fetch(`${API_BASE}/session/${sessionId}`);
    return await res.json();
}

export async function submitWord(sessionId, puzzleId, word) {
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

export async function getProgress(sessionId) {
    const res = await fetch(`${API_BASE}/progress/${sessionId}`);
    return await res.json();
}

export async function fetchDefinition(word) {
    const res = await fetch(
        `${API_BASE}/dictionary/rae?q=${encodeURIComponent(word)}`
    );
    return res.json();
}