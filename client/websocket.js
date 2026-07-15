import { updateUserList, updateCursor, removeCursor } from './ui.js';

let socket;
let currentUser;
let usersMap = new Map();
let canvasCallbacks = {};

export function initSocket(roomId, callbacks) {
  canvasCallbacks = callbacks;
  
  // Use current host for socketio connection
  socket = io();

  socket.on('connect', () => {
    console.log('Connected to server');
    joinRoom(roomId);
  });

  socket.on('user-joined', (user) => {
    usersMap.set(user.id, user);
    updateUserList(Array.from(usersMap.values()));
  });

  socket.on('user-left', (userId) => {
    usersMap.delete(userId);
    updateUserList(Array.from(usersMap.values()));
    removeCursor(userId);
  });

  socket.on('active-rooms', (rooms) => {
    if (canvasCallbacks.onActiveRooms) {
      canvasCallbacks.onActiveRooms(rooms);
    }
  });

  // Canvas Drawing Events
  socket.on('draw-start', (operation) => {
    canvasCallbacks.onRemoteDrawStart(operation);
  });

  socket.on('draw-move', (data) => {
    canvasCallbacks.onRemoteDrawMove(data);
  });

  socket.on('draw-end', (data) => {
    canvasCallbacks.onRemoteDrawEnd(data);
  });

  socket.on('cursor-update', (data) => {
    const user = usersMap.get(data.userId);
    if (user) {
      updateCursor(data.userId, user, data.position);
    }
  });

  // Undo / State Replace
  socket.on('undo-update', (data) => {
    canvasCallbacks.onCanvasState(data.operations);
  });

  socket.on('canvas-state', (data) => {
    canvasCallbacks.onCanvasState(data.operations);
  });
}

export function joinRoom(roomId) {
  // Generate a random username or use a prompt
  const userName = `User-${Math.floor(Math.random() * 1000)}`;
  
  socket.emit('join-room', roomId, userName, (data) => {
    currentUser = data.user;
    
    // Update users
    usersMap.clear();
    data.users.forEach(u => usersMap.set(u.id, u));
    updateUserList(Array.from(usersMap.values()));
    
    // Apply canvas state
    canvasCallbacks.onCanvasState(data.operations);
  });
}

// Emitting events
export function emitDrawStart(operation) {
  if (socket && socket.connected) {
    socket.emit('draw-start', operation);
  }
}

export function emitDrawMove(data) {
  if (socket && socket.connected) {
    socket.emit('draw-move', data);
  }
}

export function emitDrawEnd(data) {
  if (socket && socket.connected) {
    socket.emit('draw-end', data);
  }
}

export function emitCursorMove(position) {
  if (socket && socket.connected) {
    socket.emit('cursor-move', position);
  }
}

export function emitUndo() {
  if (socket && socket.connected) {
    socket.emit('undo');
  }
}

export function emitClear() {
  if (socket && socket.connected) {
    socket.emit('clear-canvas');
  }
}

export function getCurrentUser() {
  return currentUser;
}
