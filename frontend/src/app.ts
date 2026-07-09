import { getLeaderboard } from "./services/api";
import { hideTooltip } from "./ui/tooltip";
import { init } from "./game/gameInit";
import { showLeaderboardModal } from "./ui/leaderboard";
import { updateMuteButton } from "./audio/control";

document.addEventListener("click", (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (!target.closest(".word-chip")) {
        hideTooltip();
    }
});

const leaderboardButton = document.getElementById("leaderboard-btn") as HTMLButtonElement;
leaderboardButton.addEventListener("click", async () => {
    const data = await getLeaderboard()
    showLeaderboardModal(data);
});

// ==========================================================
// INIT
// ==========================================================

updateMuteButton();
await init();
