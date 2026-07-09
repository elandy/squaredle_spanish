export function showVictoryModal() {
    const modal = document.getElementById("victory-modal") as HTMLDivElement;
    const card = modal.querySelector(".victory-card") as HTMLDivElement;

    card.classList.remove("victory-card");

    // force browser to recalculate styles
    void card.offsetWidth;

    card.classList.add("victory-card");
    modal.classList.remove("hidden");
}

function hideVictoryModal() {
    const modal = document.getElementById("victory-modal") as HTMLDivElement;
    modal.classList.add("hidden");
}

const closeButton = document.getElementById("close-victory") as HTMLButtonElement;

closeButton.onclick = hideVictoryModal;