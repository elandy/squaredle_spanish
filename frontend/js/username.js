import { createPlayer } from "./api.js";

export async function askUsername(sessionId) {
    return new Promise((resolve) => {
        const modal = document.getElementById("username-modal");
        const input = document.getElementById("username-input");
        const button = document.getElementById("username-submit");
        const error = document.getElementById("username-error");

        modal.classList.remove("hidden");
        input.focus();

        async function submit() {
            const username = input.value.trim();
            if (!username) return;

            error.textContent = "";

            try {
                const player = await createPlayer(sessionId, username);

                modal.classList.add("hidden");

                localStorage.setItem("player_id", player.id);
                localStorage.setItem("username", player.username);

                resolve(player);
            } catch (err) {
                error.textContent = err.detail ?? "Nombre no disponible";
            }
        }

        button.onclick = submit;

        input.onkeydown = (e) => {
            if (e.key === "Enter") submit();
        };
    });
}