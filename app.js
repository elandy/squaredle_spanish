let puzzle;
let solution;

let foundWords = new Set();

let selectedCells = [];
let currentWord = "";

let dragging = false;

async function loadPuzzle() {
    const puzzleResponse =
        await fetch("daily_puzzle.json");
    puzzle = await puzzleResponse.json();
    const solutionResponse =
        await fetch("daily_solution.json");
    solution = await solutionResponse.json();
    solution.wordMap = Object.fromEntries(
        solution.words.map(w => [
            w.normalized,
            w.display
        ])
    );
    renderBoard();
    console.log(solution);
}

function updateSelectionNumbers() {
    document
        .querySelectorAll(".number")
        .forEach(el => el.remove());
    selectedCells.forEach((cell, index) => {

        const badge =
            document.createElement("div");

        badge.className = "number";
        badge.textContent = index + 1;
        cell.appendChild(badge);
    });
}

function renderBoard() {

    const board = document.getElementById("board");
    board.style.gridTemplateColumns =
        `repeat(${puzzle.size}, 70px)`;

    for (let row = 0; row < puzzle.size; row++) {
        for (let col = 0; col < puzzle.size; col++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            cell.innerHTML = `
                <span class="letter">
                    ${puzzle.board[row][col]}
                </span>
            `;
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.dataset.letter = puzzle.board[row][col];
            cell.addEventListener(
                "pointerdown",
                startSelection
            );
            board.addEventListener(
                "pointermove",
                handlePointerMove
            );
            board.appendChild(cell);
        }
    }

    window.addEventListener(
        "pointerup",
        finishSelection
    );

    document.getElementById("progress").textContent =
        `0 / ${puzzle.word_count}`;
}

function handlePointerMove(event) {
    if (!dragging) return;
    const element =
        document.elementFromPoint(
            event.clientX,
            event.clientY
        );
    const cell =
        element?.closest(".cell");
    if (!cell) return;
    if (
        !cursorNearCenter(
            cell,
            event.clientX,
            event.clientY
        )
    ) {
        return;
    }
    addCell(cell);
}

function cursorNearCenter(cell, x, y) {
    const rect =
        cell.getBoundingClientRect();
    const centerX =
        rect.left + rect.width / 2;
    const centerY =
        rect.top + rect.height / 2;
    const dx = x - centerX;
    const dy = y - centerY;
    const distance =
        Math.sqrt(dx * dx + dy * dy);
    return distance < rect.width * 0.35;
}

function isAdjacent(cellA, cellB) {

    const rowA = Number(cellA.dataset.row);
    const colA = Number(cellA.dataset.col);

    const rowB = Number(cellB.dataset.row);
    const colB = Number(cellB.dataset.col);

    const rowDiff = Math.abs(rowA - rowB);
    const colDiff = Math.abs(colA - colB);

    return rowDiff <= 1 &&
           colDiff <= 1 &&
           !(rowDiff === 0 && colDiff === 0);
}

function startSelection(event) {
    clearSelection();
    dragging = true;
    addCell(event.target.closest(".cell"));
}

function extendSelection(event) {
    if (!dragging) return;
    addCell(event.target.closest(".cell"));
}

function renderFoundWords() {
    const container =
        document.getElementById(
            "found-words"
        );

    container.innerHTML = "";
    [...foundWords]
        .sort()
        .forEach(word => {
            const div =
                document.createElement("div");
            div.textContent = word;
            container.appendChild(div);
        });
}

function updateProgress() {

    document.getElementById(
        "progress"
    ).textContent =
        `${foundWords.size} / ${puzzle.word_count}`;
}

function checkWord(word) {
    console.log("checking:", word);
    console.log("exists:", solution.wordMap[word]);

    if (!solution.wordMap[word]) {
        console.log("invalid");
        clearSelection();
        return;
    }
    if (foundWords.has(word)) {
        console.log("already found");
        clearSelection();
        return;
    }
    foundWords.add(solution.wordMap[word]);
    renderFoundWords();
    updateProgress();
    console.log("valid");
    clearSelection();
}

function finishSelection() {

    if (!dragging) return;

    dragging = false;

    checkWord(currentWord);

    clearSelection();
}

function addCell(cell) {

    const existingIndex =
        selectedCells.indexOf(cell);

    if (existingIndex !== -1) {

        if (
            existingIndex ===
            selectedCells.length - 2
        ) {

            const removed =
                selectedCells.pop();

            removed.classList.remove(
                "selected"
            );

            currentWord =
                currentWord.slice(0, -1);

            updateSelectionNumbers();

            document.getElementById(
                "current-word"
            ).textContent = currentWord;
        }

        return;
    }

    if (selectedCells.length > 0) {
        const previous =
            selectedCells[selectedCells.length - 1];
        if (!isAdjacent(previous, cell))
            return;
    }

    selectedCells.push(cell);
    cell.classList.add("selected");
    currentWord += cell.dataset.letter;
    document.getElementById(
        "current-word"
    ).textContent = currentWord;
    updateSelectionNumbers();
}

function clearSelection() {

    selectedCells.forEach(cell => {
        cell.classList.remove("selected");
    });

    selectedCells = [];

    currentWord = "";

    document.getElementById(
        "current-word"
    ).textContent = "";

    document
    .querySelectorAll(".number")
    .forEach(el => el.remove());
}

loadPuzzle();