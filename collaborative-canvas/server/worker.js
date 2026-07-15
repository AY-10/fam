import { parentPort } from 'worker_threads';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.join(__dirname, '..', 'storage');

// Maintain the state in the worker as well to easily serialize
const roomStates = new Map();

async function initStorage() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating storage directory:', err);
  }
}

initStorage();

function getFilePath(roomId) {
  return path.join(STORAGE_DIR, `room-${roomId}.json`);
}

async function loadRoom(roomId) {
  try {
    const filePath = getFilePath(roomId);
    const data = await fs.readFile(filePath, 'utf-8');
    const operations = JSON.parse(data);
    roomStates.set(roomId, operations);
    parentPort.postMessage({ type: 'LOAD_ROOM_SUCCESS', roomId, operations });
  } catch (err) {
    // If file doesn't exist, it's a new room
    roomStates.set(roomId, []);
    parentPort.postMessage({ type: 'LOAD_ROOM_ERROR', roomId, error: err.code === 'ENOENT' ? 'Not found' : err.message });
  }
}

async function saveRoom(roomId) {
  try {
    const operations = roomStates.get(roomId) || [];
    const filePath = getFilePath(roomId);
    await fs.writeFile(filePath, JSON.stringify(operations), 'utf-8');
  } catch (err) {
    console.error(`Failed to save room ${roomId}:`, err);
  }
}

parentPort.on('message', async (msg) => {
  switch (msg.type) {
    case 'LOAD_ROOM':
      await loadRoom(msg.roomId);
      break;
      
    case 'SAVE_OPERATION':
      if (!roomStates.has(msg.roomId)) {
        roomStates.set(msg.roomId, []);
      }
      roomStates.get(msg.roomId).push(msg.operation);
      await saveRoom(msg.roomId);
      break;
      
    case 'UNDO_OPERATION':
      if (roomStates.has(msg.roomId)) {
        const ops = roomStates.get(msg.roomId);
        ops.pop();
        await saveRoom(msg.roomId);
      }
      break;
      
    case 'CLEAR_ROOM':
      roomStates.set(msg.roomId, []);
      await saveRoom(msg.roomId);
      break;
  }
});
