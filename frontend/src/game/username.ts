import { createPlayer } from "../services/api";
import {ApiError} from "../types/api.ts";

export async function askUsername(sessionId: string) {
    return new Promise((resolve) => {
        const modal = document.getElementById("username-modal") as HTMLDivElement;
        const input = document.getElementById("username-input") as HTMLInputElement;
        const button = document.getElementById("username-submit") as HTMLButtonElement;
        const error = document.getElementById("username-error") as HTMLDivElement;

        modal.classList.remove("hidden");
        input.focus();

        async function submit() {
            const username = input.value.trim();
            if (!username) return;

            error.textContent = "";
            if (!/^[A-Za-z0-9]{4,25}$/.test(username)) {
                error.textContent =
                    "El nombre debe tener entre 4 y 25 caracteres alfanuméricos.";
                return;
            }
            try {
                const player = await createPlayer(sessionId, username);

                modal.classList.add("hidden");

                localStorage.setItem("player_id", player.id);
                localStorage.setItem("username", player.username);

                resolve(player);
            } catch (err) {
                const apiError = err as ApiError;
                error.textContent = apiError.detail ?? "Nombre no disponible";
            }
        }

        button.onclick = submit;

        input.onkeydown = (e) => {
            if (e.key === "Enter") submit();
        };
    });
}