import { state } from './ui.js';
import { 
  emitDrawStart, 
  emitDrawMove, 
  emitDrawEnd, 
  emitCursorMove,
  getCurrentUser 
} from './websocket.js';

const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true }); // optimize for multiple read/writes if needed, or just let it be

// We store ALL operations in memory to allow full rebuild on Undo
let operations = [];
let localActiveOperation = null;
const remoteActiveOperations = new Map(); // opId -> operation

// Setup canvas size
function resizeCanvas() {
  const container = canvas.parentElement;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  redrawAll();
}

window.addEventListener('resize', resizeCanvas);
// Call initially when DOM is ready
setTimeout(resizeCanvas, 0);

// Generate unique ID for operations
function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

// ----------------------------------------------------
// Rendering Logic
// ----------------------------------------------------

function drawPath(points, color, width, type) {
  if (!points || points.length === 0) return;
  
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  
  if (type === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = width * 2; // Make eraser slightly bigger
    ctx.strokeStyle = 'rgba(0,0,0,1)';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length < 3) {
    // Just a dot or line
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
  } else {
    // Quadratic bezier interpolation for smooth curves
    for (let i = 1; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const midPoint = {
        x: p1.x + (p2.x - p1.x) / 2,
        y: p1.y + (p2.y - p1.y) / 2
      };
      ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
    }
    // Line to the last point
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  }
  
  ctx.stroke();
  
  // Reset
  ctx.globalCompositeOperation = 'source-over';
}

function redrawAll() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw completed operations
  for (const op of operations) {
    drawPath(op.points, op.color, op.width, op.type);
  }
  
  // Draw current local operation
  if (localActiveOperation) {
    drawPath(localActiveOperation.points, localActiveOperation.color, localActiveOperation.width, localActiveOperation.type);
  }
  
  // Draw remote active operations
  for (const op of remoteActiveOperations.values()) {
    drawPath(op.points, op.color, op.width, op.type);
  }
}

// ----------------------------------------------------
// Local Input Handling
// ----------------------------------------------------

let isDrawing = false;
let batchedPoints = [];
let lastEmitTime = 0;
const BATCH_INTERVAL = 30; // ms

function getMousePos(evt) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  let clientX = evt.clientX;
  let clientY = evt.clientY;
  
  if (evt.touches && evt.touches.length > 0) {
    clientX = evt.touches[0].clientX;
    clientY = evt.touches[0].clientY;
  }
  
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function startDrawing(e) {
  const user = getCurrentUser();
  if (!user) return; // Not connected yet
  
  isDrawing = true;
  const pos = getMousePos(e);
  
  localActiveOperation = {
    id: generateId(),
    userId: user.id,
    type: state.currentTool,
    color: state.currentTool === 'eraser' ? '#000000' : state.color,
    width: state.lineWidth,
    points: [pos]
  };
  
  emitDrawStart(localActiveOperation);
  redrawAll();
  
  // Throttle cursor events on move, but can send immediately on start
  emitCursorMove(pos);
}

function moveDrawing(e) {
  const pos = getMousePos(e);
  
  // Cursor tracking
  const now = Date.now();
  if (now - lastEmitTime > BATCH_INTERVAL) {
    emitCursorMove(pos);
  }
  
  if (!isDrawing || !localActiveOperation) return;
  
  localActiveOperation.points.push(pos);
  batchedPoints.push(pos);
  
  // RequestAnimationFrame for local smooth rendering
  requestAnimationFrame(redrawAll);
  
  if (now - lastEmitTime > BATCH_INTERVAL) {
    if (batchedPoints.length > 0) {
      emitDrawMove({
        id: localActiveOperation.id,
        points: batchedPoints
      });
      batchedPoints = [];
    }
    lastEmitTime = now;
  }
}

function endDrawing(e) {
  if (!isDrawing || !localActiveOperation) return;
  isDrawing = false;
  
  // Emit remaining batched points if any
  if (batchedPoints.length > 0) {
    emitDrawMove({
      id: localActiveOperation.id,
      points: batchedPoints
    });
    batchedPoints = [];
  }
  
  emitDrawEnd({ id: localActiveOperation.id });
  
  // Move from active to history
  operations.push(localActiveOperation);
  localActiveOperation = null;
  redrawAll();
}

// Mouse events
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', moveDrawing);
window.addEventListener('mouseup', endDrawing);

// Touch events
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  startDrawing(e);
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  moveDrawing(e);
}, { passive: false });
window.addEventListener('touchend', endDrawing);
window.addEventListener('touchcancel', endDrawing);

// ----------------------------------------------------
// Remote Event Handlers
// ----------------------------------------------------

export function handleRemoteDrawStart(operation) {
  remoteActiveOperations.set(operation.id, operation);
  requestAnimationFrame(redrawAll);
}

export function handleRemoteDrawMove(data) {
  const op = remoteActiveOperations.get(data.id);
  if (op && data.points) {
    op.points.push(...data.points);
    requestAnimationFrame(redrawAll);
  }
}

export function handleRemoteDrawEnd(data) {
  const op = remoteActiveOperations.get(data.id);
  if (op) {
    remoteActiveOperations.delete(data.id);
    operations.push(op);
    requestAnimationFrame(redrawAll);
  }
}

export function setCanvasState(newOperations) {
  operations = newOperations || [];
  remoteActiveOperations.clear();
  localActiveOperation = null;
  requestAnimationFrame(redrawAll);
}
