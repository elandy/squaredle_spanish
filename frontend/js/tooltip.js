import { fetchDefinition } from "./api.js";

function getTooltip() {
    return document.getElementById("definition-tooltip");
}

export function showTooltip(word, rect) {
    const tooltip = getTooltip();

    tooltip.textContent = "Cargando...";
    tooltip.classList.add("active");

    // Initial position
    tooltip.style.left = `${rect.left}px`;
    tooltip.style.top = `${rect.bottom + 8}px`;

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

        // ---- Reposition after content is rendered ----

        const margin = 8;

        const tooltipRect = tooltip.getBoundingClientRect();

        let left = rect.left;
        let top = rect.bottom + margin;

        // Clamp horizontally
        if (left + tooltipRect.width > window.innerWidth - margin) {
            left = window.innerWidth - tooltipRect.width - margin;
        }

        if (left < margin) {
            left = margin;
        }

        // If it doesn't fit below, place above
        if (top + tooltipRect.height > window.innerHeight - margin) {
            top = rect.top - tooltipRect.height - margin;
        }

        // If it still doesn't fit (very tall tooltip), clamp to viewport
        if (top < margin) {
            top = margin;
        }

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    });
}

export function hideTooltip() {
    getTooltip().classList.remove("active");
}
