const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const undoBtn = document.querySelector(".undo-button");
const clearButton = document.querySelector("#clear-button");
const colorPicker = document.querySelector("#color");
const gridSizeInput = document.querySelector("#grid-size");
const tool = document.querySelector("#tool-select");
const textInputEl = document.querySelector(".container__input");
const cancelBtn = document.querySelector(".button_cancel");
const confirmBtn = document.querySelector(".button_confirm");
const modal = document.querySelector(".modal");

let isDrawing = false;
let startX, startY, currentX, currentY;
let paths = [];
let index = -1;
let rubberLinePath = null;

// Initialize Canvas
function startup() {
  canvas.width = 500;
  canvas.height = 500;
  drawGrid();
  updateUndoButton();
}

// Draw the grid on the canvas
function drawGrid() {
  const gridSize = parseInt(gridSizeInput.value);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "lightgray";
  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

// Snap coordinates to the nearest grid point
function snapToGrid(value) {
  const gridSize = parseInt(gridSizeInput.value);
  return Math.round(value / gridSize) * gridSize;
}

// Get coordinates from event (supports both mouse and touch)
function getCoordinates(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.touches ? event.touches[0].clientX : event.clientX;
  const y = event.touches ? event.touches[0].clientY : event.clientY;
  return {
    x: snapToGrid(x - rect.left),
    y: snapToGrid(y - rect.top),
  };
}

// Update the color based on user selection
function updateColor() {
  ctx.strokeStyle = colorPicker.value;
  ctx.fillStyle = colorPicker.value;
}

function addToUndoStack() {
  paths.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  index++;
  updateUndoButton();
}

// Start drawing
function startDrawing(event) {
  isDrawing = true;
  const { x, y } = getCoordinates(event);
  startX = x;
  startY = y;
  updateColor();
  if (tool.value === "gutter") {
    ctx.setLineDash([]);
  } else if (tool.value === "existing-gutter") {
    ctx.setLineDash([2, 2]);
  } else if (tool.value === "downspout" || tool.value === "drop") {
    ctx.setLineDash([]);
  }
}

// Draw a rubber line
function drawRubberLine(event) {
  if (
    !isDrawing ||
    tool.value === "downspout" ||
    tool.value === "drop" ||
    tool.value === "valley-shield" ||
    tool.value === "free-text"
  )
    return;
  const { x, y } = getCoordinates(event);
  currentX = x;
  currentY = y;

  if (rubberLinePath) {
    ctx.putImageData(rubberLinePath, 0, 0); // Clear temporary line
  } else {
    rubberLinePath = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(currentX, currentY);
  ctx.lineWidth = 2;
  ctx.stroke();
}

// Finalize the line on pointer up
function stopDrawing() {
  if (isDrawing) {
    isDrawing = false;
    rubberLinePath = null; // Clear rubber band

    if (tool.value === "downspout") {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(
        startX + gridSizeInput.value / 2.75,
        startY + gridSizeInput.value / 2.75
      );
      ctx.moveTo(startX, startY);
      ctx.lineTo(
        startX - gridSizeInput.value / 2.75,
        startY + gridSizeInput.value / 2.75
      );
      ctx.moveTo(startX, startY);
      ctx.lineTo(
        startX - gridSizeInput.value / 2.75,
        startY - gridSizeInput.value / 2.75
      );
      ctx.moveTo(startX, startY);
      ctx.lineTo(
        startX + gridSizeInput.value / 2.75,
        startY - gridSizeInput.value / 2.75
      );
      ctx.stroke();
      addToUndoStack();
    } else if (tool.value === "drop") {
      ctx.beginPath();
      ctx.arc(startX, startY, gridSizeInput.value / 4, 0, 2 * Math.PI);
      ctx.stroke();
      addToUndoStack();
    } else if (tool.value === "valley-shield") {
      ctx.beginPath();
      ctx.arc(startX, startY, gridSizeInput.value / 4, 0, 2 * Math.PI);
      ctx.fill();
      addToUndoStack();
    } else if (tool.value === "free-text") {
      modal.classList.add("modal_visible");
      // let userInput = prompt(
      //   'Type in the elbow sequence or the length of the piece. (ex: AABA, 57")'
      // );
    } else {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(currentX, currentY);
      ctx.lineWidth = 2;
      ctx.stroke();

      // Save the path state
      addToUndoStack();
    }
  }
}

// Undo the last action
undoBtn.addEventListener("click", () => {
  undo();
});

function undo() {
  if (index <= 0) {
    clearCanvas();
  } else {
    index--;
    paths.pop();
    ctx.putImageData(
      paths[index] || ctx.getImageData(0, 0, canvas.width, canvas.height),
      0,
      0
    );
    updateUndoButton();
  }
}

// Clear the canvas
function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  paths = [];
  index = -1;
  updateUndoButton();
}

clearButton.addEventListener("click", clearCanvas);

// Update the undo button
function updateUndoButton() {
  undoBtn.innerText = paths.length > 0 ? "Undo" : "Update Grid";
  undoBtn.style.backgroundColor = paths.length > 0 ? "silver" : "#d9f170";
}

function placeText(x, y) {
  const userInput = textInputEl.value;
  ctx.font = "1000 12px Arial";
  ctx.fillStyle = "black";
  ctx.textAlign = "center";
  if (!userInput) {
    return;
  } else {
    ctx.fillText(`${userInput}`, x, y);
    addToUndoStack();
  }
  textInputEl.value = "";
  modal.classList.remove("modal_visible");
}

// Add event listeners
canvas.addEventListener("pointerdown", startDrawing);
canvas.addEventListener("pointermove", drawRubberLine);
canvas.addEventListener("pointerup", stopDrawing);
canvas.addEventListener("pointerout", stopDrawing);

cancelBtn.addEventListener("click", (e) => {
  modal.classList.remove("modal_visible");
  textInputEl.value = "";
});

confirmBtn.addEventListener("click", (e) => {
  placeText(startX, startY);
});

// Add touch events for mobile and tablets
canvas.addEventListener("touchstart", (event) => {
  event.preventDefault();
  startDrawing(event);
});
canvas.addEventListener("touchmove", (event) => {
  event.preventDefault();
  drawRubberLine(event);
});
canvas.addEventListener("touchend", (event) => {
  event.preventDefault();
  stopDrawing();
});
canvas.addEventListener("touchcancel", stopDrawing);

// Initialize on DOMContentLoaded
document.addEventListener("DOMContentLoaded", startup);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    undo();
  }
});

function finish() {
  window.onbeforeprint = (event) => {
    toolsBar = document.querySelector(".tools-bar");
    toolsBar.style.display = "none";
    legendPic = document.querySelector(".legend-pic");
  };
  window.print();
}

window.onafterprint = (event) => {
  toolsBar = document.querySelector(".tools-bar");
  toolsBar.style.display = "flex";
};
