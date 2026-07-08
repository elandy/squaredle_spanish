let leaderboardData = null;
let leaderboardMetric = "score";
let includeBonus = false;

function renderLeaderboard() {
    const list = document.getElementById("leaderboard-list");
    list.innerHTML = "";

    const key =
        leaderboardMetric +
        (includeBonus ? "_bonus" : "");

    leaderboardData.leaderboards[key].forEach((row, i) => {
        const stats = row.stats;

        const value =
            leaderboardMetric === "score"
                ? (includeBonus
                    ? stats.score + stats.bonus_score
                    : stats.score)
                : (includeBonus
                    ? stats.found_words + stats.bonus_found_words
                    : stats.found_words);

        const suffix =
            leaderboardMetric === "score"
                ? " pts"
                : " palabras";

        const div = document.createElement("div");
        div.className = "word-chip";
        div.textContent =
            `${i + 1}. ${row.username ?? "Anónimo"} — ${value}${suffix}`;

        list.appendChild(div);
    });
}

function setLeaderboardMetric(metric) {
    leaderboardMetric = metric;

    document
        .querySelectorAll(".leaderboard-tabs button")
        .forEach(btn => btn.classList.remove("active"));

    document
        .getElementById(`tab-${metric}`)
        .classList.add("active");

    renderLeaderboard();
}

export function showLeaderboardModal(data) {
    leaderboardData = data;

    document.getElementById("leaderboard-date").textContent = data.date;

    setLeaderboardMetric("score");

    document.getElementById("leaderboard-modal").classList.remove("hidden");
}

document.getElementById("tab-score").onclick = () =>
    setLeaderboardMetric("score");

document.getElementById("tab-words").onclick = () =>
    setLeaderboardMetric("words");

document.getElementById("leaderboard-bonus").onchange = e => {
    includeBonus = e.target.checked;
    renderLeaderboard();
};

document.getElementById("close-leaderboard").onclick = () => {
    document.getElementById("leaderboard-modal").classList.add("hidden");
};