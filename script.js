"use strict";

const DIFFICULTIES = {
  beginner: { rows: 9, columns: 9, mines: 10 },
  intermediate: { rows: 16, columns: 16, mines: 40 },
  advanced: { rows: 16, columns: 30, mines: 99 },
};

const customSettings = { rows: 9, columns: 9, mines: 10 };
const gameShellElement = document.querySelector(".game-shell");
const difficultyElement = document.querySelector("#difficulty");
const customSettingsElement = document.querySelector("#custom-settings");
const customRowsElement = document.querySelector("#custom-rows");
const customColumnsElement = document.querySelector("#custom-columns");
const customMinesElement = document.querySelector("#custom-mines");
const customErrorElement = document.querySelector("#custom-error");
const boardElement = document.querySelector("#board");
const mineCountElement = document.querySelector("#mine-count");
const timerElement = document.querySelector("#timer");
const gameFaceElement = document.querySelector("#game-face");
const messageElement = document.querySelector("#game-message");
const restartButton = document.querySelector("#restart");

let rows = DIFFICULTIES.beginner.rows;
let columns = DIFFICULTIES.beginner.columns;
let mineCount = DIFFICULTIES.beginner.mines;
let cells = [];
let firstClick = true;
let gameState = "ready";
let elapsedSeconds = 0;
let timerId = null;
let flagsPlaced = 0;
let openedSafeCells = 0;

function createCell(row, column) {
  return {
    row,
    column,
    isMine: false,
    adjacentMines: 0,
    isRevealed: false,
    mark: "none",
    isExploded: false,
  };
}

function resetGame() {
  window.clearInterval(timerId);
  timerId = null;
  const difficulty = difficultyElement.value;
  const settings = difficulty === "custom" ? customSettings : DIFFICULTIES[difficulty];
  rows = settings.rows;
  columns = settings.columns;
  mineCount = settings.mines;
  gameShellElement.className = `game-shell difficulty-${difficulty}`;
  customSettingsElement.hidden = difficulty !== "custom";
  boardElement.setAttribute("aria-label", `${rows}행 ${columns}열 지뢰찾기 보드`);
  boardElement.style.setProperty("--columns", columns);
  cells = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) => createCell(row, column)),
  );
  firstClick = true;
  gameState = "ready";
  elapsedSeconds = 0;
  flagsPlaced = 0;
  openedSafeCells = 0;
  mineCountElement.value = formatCounter(mineCount);
  timerElement.value = formatTimer(0);
  gameFaceElement.textContent = "🙂";
  messageElement.textContent = "칸을 열어 게임을 시작하세요.";
  messageElement.className = "game-message";
  renderBoard();
}

function formatCounter(value) {
  if (value < 0) return `-${String(Math.abs(value)).padStart(2, "0")}`;
  return String(Math.min(value, 999)).padStart(3, "0");
}

function formatTimer(seconds) {
  return String(seconds).padStart(3, "0");
}

function getNeighbors(row, column) {
  const neighbors = [];
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) continue;
      const neighborRow = row + rowOffset;
      const neighborColumn = column + columnOffset;
      if (
        neighborRow >= 0 &&
        neighborRow < rows &&
        neighborColumn >= 0 &&
        neighborColumn < columns
      ) {
        neighbors.push(cells[neighborRow][neighborColumn]);
      }
    }
  }
  return neighbors;
}

function placeMines(safeRow, safeColumn) {
  const safeCells = new Set([`${safeRow},${safeColumn}`]);
  for (const neighbor of getNeighbors(safeRow, safeColumn)) {
    safeCells.add(`${neighbor.row},${neighbor.column}`);
  }

  const availableCells = cells.flat().filter(
    (cell) => !safeCells.has(`${cell.row},${cell.column}`),
  );

  for (let index = 0; index < mineCount; index += 1) {
    const randomIndex = Math.floor(Math.random() * availableCells.length);
    const [mine] = availableCells.splice(randomIndex, 1);
    mine.isMine = true;
  }

  for (const row of cells) {
    for (const cell of row) {
      if (!cell.isMine) {
        cell.adjacentMines = getNeighbors(cell.row, cell.column)
          .filter((neighbor) => neighbor.isMine).length;
      }
    }
  }
}

function startTimer() {
  if (timerId !== null) return;
  gameState = "playing";
  timerId = window.setInterval(() => {
    elapsedSeconds += 1;
    timerElement.value = formatTimer(elapsedSeconds);
  }, 1000);
}

function revealCell(row, column) {
  if (gameState === "won" || gameState === "lost") return;
  const cell = cells[row][column];
  if (cell.isRevealed || cell.mark === "flag") return;

  if (firstClick) {
    firstClick = false;
    placeMines(row, column);
    startTimer();
  }

  if (cell.isMine) {
    cell.isExploded = true;
    finishGame("lost");
    return;
  }

  openSafeCell(cell);
  if (openedSafeCells === rows * columns - mineCount) {
    finishGame("won");
  }
}

function openSafeCell(startCell) {
  const pending = [startCell];

  while (pending.length > 0) {
    const cell = pending.pop();
    if (cell.isRevealed || cell.isMine || cell.mark === "flag") continue;
    cell.isRevealed = true;
    openedSafeCells += 1;

    if (cell.adjacentMines === 0) {
      for (const neighbor of getNeighbors(cell.row, cell.column)) {
        if (!neighbor.isRevealed && neighbor.mark !== "flag" && !neighbor.isMine) {
          pending.push(neighbor);
        }
      }
    }
  }
}

function toggleMark(row, column) {
  if (gameState === "won" || gameState === "lost") return;
  const cell = cells[row][column];
  if (cell.isRevealed) return;

  if (cell.mark === "none") {
    cell.mark = "flag";
    flagsPlaced += 1;
  } else if (cell.mark === "flag") {
    cell.mark = "question";
    flagsPlaced -= 1;
  } else {
    cell.mark = "none";
  }

  mineCountElement.value = formatCounter(mineCount - flagsPlaced);
  renderBoard();
}

function finishGame(result) {
  gameState = result;
  window.clearInterval(timerId);
  timerId = null;

  if (result === "won") {
    gameFaceElement.textContent = "😎";
    messageElement.textContent = `모든 안전한 칸을 열었습니다! ${elapsedSeconds}초 만에 성공했어요.`;
    messageElement.className = "game-message win";
  } else {
    gameFaceElement.textContent = "😵";
    messageElement.textContent = "지뢰를 밟았습니다. 새 게임으로 다시 도전해보세요.";
    messageElement.className = "game-message lose";
  }
  renderBoard();
}

function renderBoard() {
  const fragment = document.createDocumentFragment();

  for (const row of cells) {
    for (const cell of row) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cell";
      button.dataset.row = String(cell.row);
      button.dataset.column = String(cell.column);
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", getCellDescription(cell));

      if (cell.isRevealed) {
        button.classList.add("revealed");
        if (cell.isMine) {
          button.textContent = "💣";
          button.classList.add("mine");
          if (cell.isExploded) button.classList.add("exploded");
        } else if (cell.adjacentMines > 0) {
          button.textContent = String(cell.adjacentMines);
          button.classList.add(`number-${cell.adjacentMines}`);
        } else {
          button.classList.add("empty");
        }
      } else if (cell.mark === "flag") {
        button.textContent = "🚩";
        button.classList.add("flagged");
      } else if (cell.mark === "question") {
        button.textContent = "❓";
        button.classList.add("questioned");
      }

      if (gameState === "lost" && cell.isMine) {
        button.classList.add("revealed", "mine");
        button.textContent = "💣";
        if (cell.isExploded) button.classList.add("exploded");
        button.setAttribute("aria-label", cell.isExploded ? "폭발한 지뢰" : "지뢰");
      }
      if (gameState === "lost" && cell.mark === "flag" && !cell.isMine) {
        button.classList.add("wrong-flag");
        button.textContent = "❌";
        button.setAttribute("aria-label", "잘못 표시한 깃발");
      }

      fragment.append(button);
    }
  }

  boardElement.replaceChildren(fragment);
}

function getCellDescription(cell) {
  if (cell.isRevealed) {
    if (cell.isMine) return cell.isExploded ? "폭발한 지뢰" : "지뢰";
    return cell.adjacentMines === 0
      ? "열린 빈 칸"
      : `주변 지뢰 ${cell.adjacentMines}개`;
  }
  if (cell.mark === "flag") return "깃발 표시된 닫힌 칸";
  if (cell.mark === "question") return "물음표 표시된 닫힌 칸";
  return `닫힌 칸 ${cell.row + 1}행 ${cell.column + 1}열`;
}

function updateCustomMineLimit() {
  if (!customRowsElement.checkValidity() || !customColumnsElement.checkValidity()) return;
  const maxMines = Number(customRowsElement.value) * Number(customColumnsElement.value) - 9;
  customMinesElement.max = String(maxMines);
  customErrorElement.textContent = Number(customMinesElement.value) > maxMines
    ? `첫 클릭 주변을 비우려면 지뢰를 최대 ${maxMines}개까지 설정할 수 있습니다.`
    : "";
}

boardElement.addEventListener("click", (event) => {
  const button = event.target.closest(".cell");
  if (!button || !boardElement.contains(button)) return;
  revealCell(Number(button.dataset.row), Number(button.dataset.column));
  renderBoard();
});

boardElement.addEventListener("contextmenu", (event) => {
  const button = event.target.closest(".cell");
  if (!button || !boardElement.contains(button)) return;
  event.preventDefault();
  toggleMark(Number(button.dataset.row), Number(button.dataset.column));
});

restartButton.addEventListener("click", resetGame);
difficultyElement.addEventListener("change", () => {
  if (difficultyElement.value === "custom") {
    customRowsElement.value = String(customSettings.rows);
    customColumnsElement.value = String(customSettings.columns);
    customMinesElement.value = String(customSettings.mines);
    customMinesElement.max = String(customSettings.rows * customSettings.columns - 9);
    customErrorElement.textContent = "";
  }
  resetGame();
});
customRowsElement.addEventListener("input", updateCustomMineLimit);
customColumnsElement.addEventListener("input", updateCustomMineLimit);
customMinesElement.addEventListener("input", updateCustomMineLimit);
customSettingsElement.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!customSettingsElement.reportValidity()) {
    customErrorElement.textContent = "";
    return;
  }

  const nextSettings = {
    rows: Number(customRowsElement.value),
    columns: Number(customColumnsElement.value),
    mines: Number(customMinesElement.value),
  };
  const maxMines = nextSettings.rows * nextSettings.columns - 9;
  if (nextSettings.mines > maxMines) {
    customErrorElement.textContent =
      `첫 클릭 주변을 비우려면 지뢰를 최대 ${maxMines}개까지 설정할 수 있습니다.`;
    customMinesElement.max = String(Math.max(1, maxMines));
    return;
  }

  customErrorElement.textContent = "";
  Object.assign(customSettings, nextSettings);
  customMinesElement.max = String(nextSettings.rows * nextSettings.columns - 9);
  resetGame();
});

resetGame();
