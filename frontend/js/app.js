import { getLeaderboard } from "./api.js";
import { hideTooltip } from "./tooltip.js";
import { init } from "./gameInit.js";
import { showLeaderboardModal } from "./leaderboard.js";
import { updateMuteButton } from "./control.js";

document.addEventListener("click", (e) => {
    if (!e.target.closest(".word-chip")) {
        hideTooltip();
    }
});

document.getElementById("leaderboard-btn").addEventListener("click", async () => {
    const data = await getLeaderboard()
    showLeaderboardModal(data);
});

// ==========================================================
// INIT
// ==========================================================

updateMuteButton();
await init();
