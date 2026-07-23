import {LeaderboardData, LeaderboardKey, LeaderboardRow} from "../types/api";

let leaderboardData: LeaderboardData | null = null;

type LeaderboardMetric = "score" | "words";
let leaderboardMetric: LeaderboardMetric = "score";
let includeBonus = false;

function renderLeaderboard() {
    if (!leaderboardData) {
        return;
    }

    const list = document.getElementById("leaderboard-list") as HTMLDivElement;
    list.innerHTML = "";
    
    const key: LeaderboardKey =
        leaderboardMetric === "score"
            ? (includeBonus ? "score_bonus" : "score")
            : (includeBonus ? "words_bonus" : "words");

    leaderboardData.leaderboards[key].forEach((row: LeaderboardRow, i: number) => {
        const value =
            leaderboardMetric === "score"
                ? (includeBonus
                    ? row.score + row.bonus_score
                    : row.score)
                : (includeBonus
                    ? row.found_words + row.bonus_found_words
                    : row.found_words);

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

function setLeaderboardMetric(metric: LeaderboardMetric) {
    leaderboardMetric = metric;

    document
        .querySelectorAll(".leaderboard-tabs button")
        .forEach(btn => btn.classList.remove("active"));

    const tabToShow = document.getElementById(`tab-${metric}`) as HTMLButtonElement;
    tabToShow.classList.add("active");

    renderLeaderboard();
}

export function showLeaderboardModal(data: LeaderboardData) {
    leaderboardData = data;

    const leaderboardDate = document.getElementById("leaderboard-date") as HTMLDivElement;
    leaderboardDate.textContent = data.date;

    setLeaderboardMetric("score");

    const leaderboardModal = document.getElementById("leaderboard-modal") as HTMLDivElement;
    leaderboardModal.classList.remove("hidden");
}

const tabScore = document.getElementById("tab-score") as HTMLButtonElement;
tabScore.onclick = () => setLeaderboardMetric("score");

const tabWords = document.getElementById("tab-words") as HTMLButtonElement;
tabWords.onclick = () => setLeaderboardMetric("words");

const leaderboardBonus = document.getElementById("leaderboard-bonus") as HTMLInputElement;
leaderboardBonus.onchange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    includeBonus = target.checked;
    renderLeaderboard();
};

const closeLeaderboard = document.getElementById("close-leaderboard") as HTMLButtonElement;
closeLeaderboard.onclick = () => {
    const leaderboardModal = document.getElementById("leaderboard-modal") as HTMLDivElement;
    leaderboardModal.classList.add("hidden");
};