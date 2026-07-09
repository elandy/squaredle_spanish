import { isMuted, toggleMute } from "./audio";

const muteBtn = document.getElementById("mute-btn") as HTMLButtonElement;

export function updateMuteButton() {
    muteBtn.textContent = isMuted()
        ? "🔇"
        : "🔊";
}

muteBtn.addEventListener("click", () => {
    toggleMute();
    updateMuteButton();
});
