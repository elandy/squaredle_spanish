import {fetchDefinition} from "./api.js";

function getTooltip() {
    return document.getElementById("definition-tooltip");
}

export function showTooltip(word, rect) {
    const tooltip = getTooltip();
    tooltip.textContent = "Cargando...";

    tooltip.style.left = `${rect.left}px`;
    tooltip.style.top = `${rect.bottom + 8}px`;

    tooltip.classList.add("active");

    fetchDefinition(word).then(data => {
        tooltip.innerHTML = "";

        const title = document.createElement("div");
        title.className = "tooltip-word";
        title.textContent = data.word;

        tooltip.appendChild(title);

        data.definitions.forEach(definition => {
            const item = document.createElement("div");
            item.className = "tooltip-definition";
            item.textContent = definition;

            tooltip.appendChild(item);
        });
    });
}

export function hideTooltip() {
    const tooltip = getTooltip();
    tooltip.classList.remove("active");
}
