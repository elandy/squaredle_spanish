import {
    LeaderboardData,
    LeaderboardKey,
    LeaderboardRow,
    PlayerStatistics
} from "../types/api";

import {
    getPlayerStatistics
} from "../services/api";


let leaderboardData: LeaderboardData | null = null;
let currentPlayerStats: PlayerStatistics | null = null;

type LeaderboardMetric = "score" | "words";

let leaderboardMetric: LeaderboardMetric = "score";
let includeBonus = false;

const rankingView = document.getElementById("ranking-view") as HTMLDivElement;
const statisticsView = document.getElementById("statistics-view") as HTMLDivElement;
const leaderboardList = document.getElementById("leaderboard-list") as HTMLDivElement;
const statisticsList = document.getElementById("statistics-list") as HTMLDivElement;

function setMainTab(tab: "ranking" | "stats") {
    const rankingButton = document.getElementById("main-tab-ranking") as HTMLButtonElement;
    const statsButton = document.getElementById("main-tab-stats") as HTMLButtonElement;

    rankingButton.classList.remove("active");
    statsButton.classList.remove("active");


    if (tab === "ranking") {
        rankingButton.classList.add("active");
        rankingView.classList.remove("hidden");
        statisticsView.classList.add("hidden");

    } else {
        statsButton.classList.add("active");
        rankingView.classList.add("hidden");
        statisticsView.classList.remove("hidden");
    }
}

function renderStatistics() {
    statisticsList.innerHTML = "";
    if (!currentPlayerStats) {
        statisticsList.textContent = "No hay estadísticas disponibles.";
        return;
    }

    const stats = [
        ["Días jugados", currentPlayerStats.played],
        ["Partidas completadas", currentPlayerStats.completed],
        ["Porcentaje completado", `${currentPlayerStats.completion_rate}%`],
        ["Puntaje promedio", currentPlayerStats.average_score],
        ["Palabras encontradas", currentPlayerStats.words_found],
        ["Palabras bonus", currentPlayerStats.bonus_words_found],
        ["Puntos totales", currentPlayerStats.total_points],
        ["Racha máxima", currentPlayerStats.longest_streak],
        ["Racha actual", currentPlayerStats.current_streak]
    ];

    for (const [label, value] of stats) {
        const row = document.createElement("div");
        row.className = "word-chip";
        row.textContent = `${label}: ${value}`;
        statisticsList.appendChild(row);
    }
}


function renderLeaderboard() {
    if (!leaderboardData) { return; }
    leaderboardList.innerHTML = "";
    const key: LeaderboardKey =
        leaderboardMetric === "score"
            ? (
                includeBonus
                    ? "score_bonus"
                    : "score"
            )
            : (
                includeBonus
                    ? "words_bonus"
                    : "words"
            );

    leaderboardData.leaderboards[key]
        .forEach(
            (row: LeaderboardRow, i: number) => {
                const value =
                    leaderboardMetric === "score"
                        ? (
                            includeBonus
                                ? row.score + row.bonus_score
                                : row.score
                        )
                        : (
                            includeBonus
                                ? row.found_words + row.bonus_found_words
                                : row.found_words
                        );

                const suffix =
                    leaderboardMetric === "score"
                        ? " pts"
                        : " palabras";

                const div = document.createElement("div");
                div.className = "word-chip";
                div.textContent = `${i + 1}. ${row.username ?? "Anónimo"} — ${value}${suffix}`;
                leaderboardList.appendChild(div);
            }
        );
}


function setLeaderboardMetric(metric: LeaderboardMetric) {
    leaderboardMetric = metric;

    document
        .querySelectorAll(".leaderboard-controls .leaderboard-tabs button")
        .forEach(btn =>
            btn.classList.remove("active")
        );

    const button =
        document.getElementById(
            `tab-${metric}`
        ) as HTMLButtonElement;
    button.classList.add("active");
    renderLeaderboard();
}

export function showLeaderboardModal(data: LeaderboardData) {
    leaderboardData = data;
    // reset previous state
    currentPlayerStats = null;
    statisticsList.innerHTML = "";
    const date = document.getElementById("leaderboard-date") as HTMLDivElement;
    date.textContent = data.date;

    includeBonus = false;
    const checkbox = document.getElementById("leaderboard-bonus") as HTMLInputElement;
    checkbox.checked = false;

    setLeaderboardMetric("score");
    setMainTab("ranking");
    const modal = document.getElementById("leaderboard-modal") as HTMLDivElement;
    modal.classList.remove("hidden");
}

const tabScore = document.getElementById("tab-score") as HTMLButtonElement;
tabScore.onclick = () => setLeaderboardMetric("score");

const tabWords = document.getElementById("tab-words") as HTMLButtonElement;
tabWords.onclick = () => setLeaderboardMetric("words");

const leaderboardBonus = document.getElementById("leaderboard-bonus") as HTMLInputElement;
leaderboardBonus.onchange =
    (e: Event) => {
        const target = e.target as HTMLInputElement;
        includeBonus = target.checked;
        renderLeaderboard();
    };

const mainRanking = document.getElementById("main-tab-ranking") as HTMLButtonElement;
mainRanking.onclick = () =>setMainTab("ranking");

const mainStats = document.getElementById("main-tab-stats") as HTMLButtonElement;
mainStats.onclick =
    async () => {
        const playerId = localStorage.getItem("player_id");
        if (!playerId) { return; }
        currentPlayerStats = await getPlayerStatistics(playerId);
        renderStatistics();
        setMainTab("stats");
    };

const closeLeaderboard = document.getElementById("close-leaderboard") as HTMLButtonElement;
closeLeaderboard.onclick =
    () => {
        const modal = document.getElementById("leaderboard-modal") as HTMLDivElement;
        modal.classList.add("hidden");
        // clean state
        currentPlayerStats = null;
        statisticsList.innerHTML = "";
    };