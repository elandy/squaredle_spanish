import { isMuted, toggleMute } from "./audio.js";

const muteBtn = document.getElementById("mute-btn");

export function updateMuteButton() {
    muteBtn.textContent = isMuted()
        ? "🔇"
        : "🔊";
}

muteBtn.addEventListener("click", () => {
    toggleMute();
    updateMuteButton();
});
