import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory store of drawing operations per room
const roomStates = new Map(); // roomId -> { operations: [], redoStack: [] }

// Background worker for persistence
let persistenceWorker;

export function initDrawingState() {
  persistenceWorker = new Worker(path.join(__dirname, 'worker.js'));
  
  persistenceWorker.on('message', (msg) => {
    if (msg.type === 'LOAD_ROOM_SUCCESS') {
      roomStates.set(msg.roomId, { operations: msg.operations, redoStack: [] });
      console.log(`Loaded ${msg.operations.length} operations for room ${msg.roomId}`);
    } else if (msg.type === 'LOAD_ROOM_ERROR') {
      console.log(`Initialized empty state for room ${msg.roomId} (${msg.error})`);
      roomStates.set(msg.roomId, { operations: [], redoStack: [] });
    }
  });

  persistenceWorker.on('error', (err) => {
    console.error('Persistence Worker Error:', err);
  });
}

export function loadRoomState(roomId) {
  if (!roomStates.has(roomId)) {
    // Initial empty state until worker loads it
    roomStates.set(roomId, { operations: [], redoStack: [] });
    persistenceWorker.postMessage({ type: 'LOAD_ROOM', roomId });
  }
}

export function getRoomOperations(roomId) {
  const state = roomStates.get(roomId);
  return state ? state.operations : [];
}

export function addOperation(roomId, operation) {
  const state = roomStates.get(roomId);
  if (state) {
    state.operations.push(operation);
    state.redoStack = []; // Clear redo stack on new operation
    // Send to worker to save to disk asynchronously
    persistenceWorker.postMessage({ type: 'SAVE_OPERATION', roomId, operation });
  }
}

export function undoLastOperation(roomId, userId) {
  const state = roomStates.get(roomId);
  if (!state) return null;
  
  // Find the last operation by this user (or just the absolute last operation)
  // Global undo usually removes the very last operation on the canvas, regardless of user
  // Let's implement absolute global undo (removes the top of the stack)
  if (state.operations.length > 0) {
    const undoneOp = state.operations.pop();
    state.redoStack.push(undoneOp);
    
    // We also need to tell the worker to save the entire new state or handle undo in worker
    persistenceWorker.postMessage({ type: 'UNDO_OPERATION', roomId });
    
    return undoneOp;
  }
  return null;
}

export function redoLastOperation(roomId, userId) {
  const state = roomStates.get(roomId);
  if (!state) return null;
  
  if (state.redoStack && state.redoStack.length > 0) {
    const redoneOp = state.redoStack.pop();
    state.operations.push(redoneOp);
    
    // Send to worker to save
    persistenceWorker.postMessage({ type: 'SAVE_OPERATION', roomId, operation: redoneOp });
    
    return redoneOp;
  }
  return null;
}

export function clearRoom(roomId) {
  const state = roomStates.get(roomId);
  if (state) {
    state.operations = [];
    state.redoStack = [];
    persistenceWorker.postMessage({ type: 'CLEAR_ROOM', roomId });
  }
}
