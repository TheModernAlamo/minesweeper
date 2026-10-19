"use strict";

const ROWS = 9;
const COLUMNS = 9;
const MINE_TOTAL = 10;

const boardElement = document.querySelector("#board");
const mineCountElement = document.querySelector("#mine-count");
const timerElement = document.querySelector("#timer");
const messageElement = document.querySelector("#message");
const restartButton = document.querySelector("#restart");

let cells = [];
let flags = 0;
let revealedCount = 0;
let seconds = 0;
let timerId = null;
let started = false;
let gameOver = false;

function createEmptyBoard() {
  return Array.from({ length: ROWS * COLUMNS }, (_, index) => ({
    index,
    mine: false,
    adjacentMines: 0,
    revealed: false,
    flagged: false,
  }));
}

function getNeighbors(index) {
  const row = Math.floor(index / COLUMNS);
  const column = index % COLUMNS;
  const neighbors = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) continue;
      const neighborRow = row + rowOffset;
      const neighborColumn = column + columnOffset;
      if (
        neighborRow >= 0 &&
        neighborRow < ROWS &&
        neighborColumn >= 0 &&
        neighborColumn < COLUMNS
      ) {
        neighbors.push(neighborRow * COLUMNS + neighborColumn);
      }
    }
  }

  return neighbors;
}

function placeMines(firstIndex) {
  const available = cells
    .map((cell) => cell.index)
    .filter((index) => index !== firstIndex);

  for (let index = available.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [available[index], available[randomIndex]] = [
      available[randomIndex],
      available[index],
    ];
  }

  for (const index of available.slice(0, MINE_TOTAL)) {
    cells[index].mine = true;
  }

  for (const cell of cells) {
    if (!cell.mine) {
      cell.adjacentMines = getNeighbors(cell.index).filter(
        (neighborIndex) => cells[neighborIndex].mine,
      ).length;
    }
  }
}

function renderBoard() {
  const fragment = document.createDocumentFragment();

  for (const cell of cells) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cell";
    button.dataset.index = String(cell.index);
    button.setAttribute("role", "gridcell");
    button.setAttribute(
      "aria-label",
      `행 ${Math.floor(cell.index / COLUMNS) + 1}, 열 ${(cell.index % COLUMNS) + 1}, 닫힘`,
    );

    button.addEventListener("click", () => revealCell(cell.index));
    button.addEventListener("pointerdown", (event) => {
      const isChordClick =
        event.button === 1 || (event.buttons & 3) === 3;
      if (cell.revealed && cell.adjacentMines > 0 && isChordClick) {
        event.preventDefault();
        chordCell(cell.index);
      }
    });
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      toggleFlag(cell.index);
    });

    fragment.append(button);
  }

  boardElement.replaceChildren(fragment);
}

function updateCell(cell) {
  const button = boardElement.children[cell.index];
  button.className = "cell";
  button.removeAttribute("data-number");

  const coordinates =
    `행 ${Math.floor(cell.index / COLUMNS) + 1}, 열 ${(cell.index % COLUMNS) + 1}`;
  if (cell.flagged && !cell.revealed) {
    button.classList.add("flagged");
    button.textContent = "🚩";
    button.setAttribute("aria-label", `${coordinates}, 깃발 표시`);
  } else if (cell.revealed) {
    button.classList.add("revealed");
    if (cell.mine) {
      button.textContent = "💣";
      button.setAttribute("aria-label", `${coordinates}, 지뢰`);
    } else if (cell.adjacentMines > 0) {
      button.textContent = String(cell.adjacentMines);
      button.dataset.number = String(cell.adjacentMines);
      button.setAttribute(
        "aria-label",
        `${coordinates}, 주변 지뢰 ${cell.adjacentMines}개`,
      );
    } else {
      button.textContent = "";
      button.setAttribute("aria-label", `${coordinates}, 빈 칸`);
    }
  } else {
    button.textContent = "";
    button.setAttribute("aria-label", `${coordinates}, 닫힘`);
  }
}

function updateMineCount() {
  mineCountElement.textContent = String(MINE_TOTAL - flags).padStart(2, "0");
}

function startTimer() {
  if (timerId !== null) return;
  timerId = window.setInterval(() => {
    seconds += 1;
    timerElement.textContent = String(Math.min(seconds, 999)).padStart(3, "0");
  }, 1000);
}

function stopTimer() {
  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

function revealCell(index) {
  const cell = cells[index];
  if (gameOver || cell.revealed || cell.flagged) return;

  if (!started) {
    started = true;
    placeMines(index);
    startTimer();
    messageElement.textContent = "지뢰를 피해 모든 안전한 칸을 여세요.";
  }

  if (cell.mine) {
    cell.revealed = true;
    updateCell(cell);
    finishGame(false, index);
    return;
  }

  revealSafeCells(index);
  if (revealedCount === ROWS * COLUMNS - MINE_TOTAL) {
    finishGame(true);
  }
}

function revealSafeCells(startIndex) {
  const pending = [startIndex];

  while (pending.length > 0) {
    const index = pending.pop();
    const cell = cells[index];
    if (cell.revealed || cell.flagged || cell.mine) continue;

    cell.revealed = true;
    revealedCount += 1;
    updateCell(cell);

    if (cell.adjacentMines === 0) {
      for (const neighborIndex of getNeighbors(index)) {
        if (!cells[neighborIndex].revealed && !cells[neighborIndex].flagged) {
          pending.push(neighborIndex);
        }
      }
    }
  }
}

function chordCell(index) {
  const cell = cells[index];
  const neighbors = getNeighbors(index);
  const adjacentFlags = neighbors.filter(
    (neighborIndex) => cells[neighborIndex].flagged,
  ).length;
  if (adjacentFlags !== cell.adjacentMines) return;

  for (const neighborIndex of neighbors) {
    if (!cells[neighborIndex].flagged && !cells[neighborIndex].revealed) {
      revealCell(neighborIndex);
      if (gameOver) return;
    }
  }
}

function toggleFlag(index) {
  const cell = cells[index];
  if (gameOver || cell.revealed) return;

  cell.flagged = !cell.flagged;
  flags += cell.flagged ? 1 : -1;
  updateMineCount();
  updateCell(cell);
}

function finishGame(won, explodedIndex = -1) {
  gameOver = true;
  stopTimer();
  restartButton.textContent = won ? "😎" : "😵";

  if (won) {
    messageElement.textContent = "축하합니다! 모든 안전한 칸을 열었습니다.";
    messageElement.className = "game-message win";
    return;
  }

  messageElement.textContent = "지뢰를 밟았습니다. 다시 도전해 보세요!";
  messageElement.className = "game-message lose";
  for (const cell of cells) {
    if (cell.mine) {
      cell.revealed = true;
      updateCell(cell);
    }
  }
  boardElement.children[explodedIndex].classList.add("exploded");
}

function startNewGame() {
  stopTimer();
  cells = createEmptyBoard();
  flags = 0;
  revealedCount = 0;
  seconds = 0;
  started = false;
  gameOver = false;
  timerElement.textContent = "000";
  restartButton.textContent = "🙂";
  messageElement.textContent = "게임을 시작하세요!";
  messageElement.className = "game-message";
  updateMineCount();
  renderBoard();
}

restartButton.addEventListener("click", startNewGame);
startNewGame();
