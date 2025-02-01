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
const eraserBtn = document.querySelector(".eraser-btn");

let isDrawing = false;
let startX, startY, currentX, currentY;
let lines = []; // Store start and end coordinates for lines
let index = -1;
let rubberLinePath = null;
let history = []; // History to store previous states of the canvas
let isEraserOn = false;

// Initialize Canvas
function startup() {
  canvas.width = 500;
  canvas.height = 500;
  drawGrid();
  updateUndoButton();
}

// Draw the grid on the canvas
function drawGrid() {
  ctx.setLineDash([]);
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

// Start drawing
function startDrawing(event) {
  isDrawing = true;
  const { x, y } = getCoordinates(event);
  startX = x;
  startY = y;
  ctx.lineWidth = 2;
  updateColor();
  if (isEraserOn === true) {
    eraseNearestLine();
    return;
  }

  if (tool.value === "gutter") {
    ctx.moveTo(x, y);
    ctx.setLineDash([]);
  } else if (tool.value === "existing-gutter") {
    ctx.setLineDash([2, 2]);
  } else if (tool.value === "downspout" || tool.value === "drop") {
    ctx.setLineDash([]);
  }
}

// Draw a rubber line (for both drawing and erasing)
function drawRubberLine(event) {
  if (
    !isDrawing ||
    tool.value === "downspout" ||
    tool.value === "free-text" ||
    tool.value === "drop" ||
    tool.value === "valley-shield" ||
    isEraserOn === true
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
function stopDrawing(event) {
  if (isDrawing) {
    isDrawing = false;
    rubberLinePath = null; // Clear rubber band

    if (isEraserOn === true) {
      eraseNearestLine();
      return;
    }

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
      // Add line coordinates instead of ImageData
      lines.push({
        startX,
        startY,
        endX: startX,
        endY: startY,
        tool: tool.value,
        color: colorPicker.value,
      });
      updateUndoButton();
    } else if (tool.value === "drop") {
      ctx.beginPath();
      ctx.arc(startX, startY, gridSizeInput.value / 4, 0, 2 * Math.PI);
      ctx.stroke();
      // Add line coordinates instead of ImageData
      lines.push({
        startX,
        startY,
        endX: startX,
        endY: startY,
        tool: tool.value,
        color: colorPicker.value,
      });
      updateUndoButton();
    } else if (tool.value === "valley-shield") {
      ctx.beginPath();
      ctx.arc(startX, startY, gridSizeInput.value / 4, 0, 2 * Math.PI);
      ctx.fill();
      // Add line coordinates instead of ImageData
      lines.push({
        startX,
        startY,
        endX: startX,
        endY: startY,
        tool: tool.value,
        color: colorPicker.value,
      });
      updateUndoButton();
    } else if (tool.value === "free-text") {
      if (isEraserOn === true) {
        return;
      } else {
        modal.classList.add("modal_visible");
      }
    } else {
      ctx.beginPath();
      // ctx.moveTo(startX, startY);
      ctx.lineTo(currentX, currentY);
      ctx.lineWidth = 2;
      if (!currentX || !currentY) {
        return;
      }
      if (startX === currentX && startY === currentY) {
        return;
      }
      ctx.stroke();
      // Add line coordinates instead of ImageData
      lines.push({
        startX,
        startY,
        endX: currentX,
        endY: currentY,
        tool: tool.value,
        color: colorPicker.value,
      });
      updateUndoButton();
      currentX = null;
      currentY = null;
    }
    if (tool.value !== "free-text") {
      saveState();
    }
  }
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
    lines.push({
      startX,
      startY,
      endX: startX,
      endY: startY,
      tool: tool.value,
      content: userInput,
      color: colorPicker.value,
    });
    saveState();
  }
  textInputEl.value = "";
  modal.classList.remove("modal_visible");
}

function eraseNearestLine() {
  const tolerance = 10; // Tolerance in pixels for erasing (you can adjust this)

  // Loop through the stored lines and check if they intersect with the eraser area
  for (let i = lines.length - 1; i >= 0; i--) {
    let line = lines[i];

    // Check if the line is within the eraser's tolerance
    if (
      isLineCloseToCursor(
        line.startX,
        line.startY,
        line.endX,
        line.endY,
        startX,
        startY,
        tolerance
      )
    ) {
      lines.splice(i, 1); // Remove the line from lines
      redrawCanvas(); // Redraw canvas with updated lines
      break;
    }
    if (
      line.tool === "downspout" ||
      line.tool === "drop" ||
      line.tool === "valley-shield" ||
      line.tool === "free-text"
    ) {
      if (
        distanceToPoint(line.startX, line.startY, startX, startY) < tolerance
      ) {
        lines.splice(i, 1); // Remove the line from lines
        redrawCanvas(); // Redraw canvas with updated lines
        break;
      }
    }
  }
  updateUndoButton(); // Keep track of the undo stack after erasing a line
}

function isLineCloseToCursor(x1, y1, x2, y2, mouseX, mouseY, radius) {
  // Calculate the perpendicular distance from the mouse to the line
  const distance = pointToLineDistance(x1, y1, x2, y2, mouseX, mouseY);

  // Check if the mouse is within the radius of the line
  if (distance <= radius) {
    // Check if the perpendicular projection falls within the segment bounds
    const projection = projectPointOntoLine(x1, y1, x2, y2, mouseX, mouseY);
    const px = projection.x;
    const py = projection.y;

    // Check if the projected point is on the segment (within bounds of the endpoints)
    const dot1 = (px - x1) * (x2 - x1) + (py - y1) * (y2 - y1); // Dot product to check if projection is within the segment
    const dot2 = (px - x2) * (x1 - x2) + (py - y2) * (y1 - y2); // Dot product for the other side

    if (dot1 >= 0 && dot2 >= 0) {
      return true;
    }
  }

  // If the perpendicular projection doesn't fall on the segment, check distance to the endpoints
  const distToEnd1 = distanceToPoint(mouseX, mouseY, x1, y1);
  const distToEnd2 = distanceToPoint(mouseX, mouseY, x2, y2);

  return distToEnd1 <= radius || distToEnd2 <= radius;
}

// Function to calculate the perpendicular distance from a point to a line
function pointToLineDistance(x1, y1, x2, y2, px, py) {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  const param = lenSq === 0 ? -1 : dot / lenSq;

  let closestX, closestY;

  if (param < 0) {
    closestX = x1;
    closestY = y1;
  } else if (param > 1) {
    closestX = x2;
    closestY = y2;
  } else {
    closestX = x1 + param * C;
    closestY = y1 + param * D;
  }

  const dx = px - closestX;
  const dy = py - closestY;

  return Math.sqrt(dx * dx + dy * dy);
}

function distanceToPoint(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function projectPointOntoLine(x1, y1, x2, y2, px, py) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;

  return { x: closestX, y: closestY };
}

// Redraw the entire canvas based on stored lines
function redrawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setLineDash([]);
  drawGrid();
  updateColor();
  lines.forEach((line) => {
    ctx.strokeStyle = line.color;
    ctx.fillStyle = line.color;
    if (line.tool === "downspout") {
      ctx.beginPath();
      ctx.moveTo(line.startX, line.startY);
      ctx.lineTo(
        line.startX + gridSizeInput.value / 2.75,
        line.startY + gridSizeInput.value / 2.75
      );
      ctx.moveTo(line.startX, line.startY);
      ctx.lineTo(
        line.startX - gridSizeInput.value / 2.75,
        line.startY + gridSizeInput.value / 2.75
      );
      ctx.moveTo(line.startX, line.startY);
      ctx.lineTo(
        line.startX - gridSizeInput.value / 2.75,
        line.startY - gridSizeInput.value / 2.75
      );
      ctx.moveTo(line.startX, line.startY);
      ctx.lineTo(
        line.startX + gridSizeInput.value / 2.75,
        line.startY - gridSizeInput.value / 2.75
      );
      ctx.setLineDash([]);
      ctx.stroke();
    } else if (line.tool === "drop") {
      ctx.beginPath();
      ctx.arc(
        line.startX,
        line.startY,
        gridSizeInput.value / 4,
        0,
        2 * Math.PI
      );
      ctx.setLineDash([]);
      ctx.stroke();
    } else if (line.tool === "valley-shield") {
      ctx.beginPath();
      ctx.arc(
        line.startX,
        line.startY,
        gridSizeInput.value / 4,
        0,
        2 * Math.PI
      );
      ctx.setLineDash([]);
      ctx.fill();
    } else if (line.tool === "existing-gutter") {
      ctx.beginPath();
      ctx.moveTo(line.startX, line.startY);
      ctx.lineTo(line.endX, line.endY);
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 2]);
      ctx.stroke();
    } else if (line.tool === "free-text") {
      ctx.font = "1000 12px Arial";
      ctx.fillStyle = "black";
      ctx.textAlign = "center";
      ctx.fillText(line.content, line.startX, line.startY);
    } else {
      ctx.beginPath();
      ctx.moveTo(line.startX, line.startY);
      ctx.lineTo(line.endX, line.endY);
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.stroke();
    }
  });
}

// Undo the last action
undoBtn.addEventListener("click", () => {
  undo();
});

function undo() {
  // debugger;
  if (history.length > 0) {
    // Pop the last saved state and restore the lines array
    history.pop();
    lines = history[history.length - 1];
    redrawCanvas(); // Redraw canvas with the previous state
    updateUndoButton(); // Update undo button state
  } else {
    clearCanvas(); // If no history, clear the canvas
  }
  updateUndoButton();
}

function saveState() {
  history.push([...lines]); // Copy the current lines array to preserve the state
}

// Clear the canvas
function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  lines = []; // Clear current lines
  history = []; // Clear history
  index = -1; // Reset the index (this is unnecessary)
  updateUndoButton(); // Update the undo button state
}

clearButton.addEventListener("click", clearCanvas);

// Update the undo button
function updateUndoButton() {
  if (lines && history) {
    // undoBtn.innerText =
    //   lines.length > 0 && history.length > 0 ? "Undo" : "Set Grid";
    // undoBtn.style.backgroundColor =
    //   lines.length > 0 && history.length > 0 ? "silver" : "#d9f170";
    if (lines.length > 0 && history.length > 0) {
      undoBtn.style.display = "none";
      gridSizeInput.style.display = "none";
    } else if (lines.length === 0) {
      undoBtn.style.display = "inline-block";
      gridSizeInput.style.display = "inline-block";
    }
  } else {
    return;
  }
}

function toggleEraser(status) {
  eraserBtn.classList.toggle("eraser-btn_on");
  isEraserOn = !status;
}

// Add event listeners
canvas.addEventListener("pointerdown", startDrawing);
canvas.addEventListener("pointermove", drawRubberLine);
canvas.addEventListener("pointerup", () => {
  stopDrawing();
  updateUndoButton();
});
canvas.addEventListener("pointerout", stopDrawing);

cancelBtn.addEventListener("click", () => {
  modal.classList.remove("modal_visible");
  textInputEl.value = "";
});

confirmBtn.addEventListener("click", () => {
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
  updateUndoButton();
});
canvas.addEventListener("touchcancel", stopDrawing);

eraserBtn.addEventListener("click", () => {
  toggleEraser(isEraserOn);
});

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
