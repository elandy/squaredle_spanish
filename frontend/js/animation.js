export function spawnWordAnimation(text, type) {
    const el = document.createElement("div");

    el.textContent = text;
    el.className = `floating-word ${type}`;

    document.body.appendChild(el);
    void el.offsetWidth;

    // trigger animation
    requestAnimationFrame(() => {
        el.classList.add("active");
    });

    el.addEventListener("animationend", () => {
        el.remove();
    });
}