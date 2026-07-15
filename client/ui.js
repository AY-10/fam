/**
 * @fileoverview UI state management and DOM interactions.
 * Handles toolbar controls, room management UI, and remote cursor rendering.
 */

// ─── DOM Elements ───────────────────────────────────────
export const elements = {
  roomInput: document.getElementById('room-input'),
  joinBtn: document.getElementById('join-btn'),
  createBtn: document.getElementById('create-btn'),
  activeRoomsList: document.getElementById('active-rooms-list'),
  userCount: document.getElementById('user-count'),
  userList: document.getElementById('user-list'),
  toolBrush: document.getElementById('tool-brush'),
  toolEraser: document.getElementById('tool-eraser'),
  colorPicker: document.getElementById('color-picker'),
  strokeWidth: document.getElementById('stroke-width'),
  actionUndo: document.getElementById('action-undo'),
  actionClear: document.getElementById('action-clear'),
  cursorsContainer: document.getElementById('cursors-container')
};

// ─── Application State ──────────────────────────────────
export const state = {
  currentTool: 'brush',
  color: '#818cf8',
  lineWidth: 5,
  roomId: 'room-0'
};

/**
 * Initialize all UI event listeners.
 * @param {Object} callbacks - Event callbacks for socket communication.
 */
export function initUI(callbacks) {
  // Tool selection
  elements.toolBrush.addEventListener('click', () => {
    state.currentTool = 'brush';
    elements.toolBrush.classList.add('active');
    elements.toolEraser.classList.remove('active');
  });

  elements.toolEraser.addEventListener('click', () => {
    state.currentTool = 'eraser';
    elements.toolEraser.classList.add('active');
    elements.toolBrush.classList.remove('active');
  });

  // Color and stroke
  elements.colorPicker.addEventListener('input', (e) => {
    state.color = e.target.value;
  });

  elements.strokeWidth.addEventListener('input', (e) => {
    state.lineWidth = parseInt(e.target.value, 10);
  });

  // Join room
  elements.joinBtn.addEventListener('click', () => {
    const newRoom = elements.roomInput.value.trim();
    if (newRoom && newRoom !== state.roomId) {
      state.roomId = newRoom;
      callbacks.onJoinRoom(newRoom);
    }
  });

  // Create room (generates a new room name if input matches current)
  elements.createBtn.addEventListener('click', () => {
    let newRoom = elements.roomInput.value.trim();
    if (!newRoom || newRoom === state.roomId) {
      newRoom = `room-${Math.floor(Math.random() * 9000) + 1000}`;
      elements.roomInput.value = newRoom;
    }
    state.roomId = newRoom;
    callbacks.onJoinRoom(newRoom);
  });

  // Enter key to join room
  elements.roomInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      elements.joinBtn.click();
    }
  });

  // Undo / Clear
  elements.actionUndo.addEventListener('click', () => callbacks.onUndo());
  elements.actionClear.addEventListener('click', () => callbacks.onClear());

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') {
        e.preventDefault();
        callbacks.onUndo();
      }
    }
    // Tool shortcuts
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      if (e.key === 'b') elements.toolBrush.click();
      if (e.key === 'e') elements.toolEraser.click();
    }
  });
}

// ─── Active Rooms List ──────────────────────────────────

/**
 * Render the list of active rooms in the sidebar.
 * @param {string[]} rooms - Array of active room IDs.
 * @param {Function} onJoinRoom - Callback when a room is clicked.
 */
export function updateActiveRooms(rooms, onJoinRoom) {
  elements.activeRoomsList.innerHTML = '';
  
  if (rooms.length === 0) {
    const li = document.createElement('li');
    li.className = 'no-rooms';
    li.textContent = 'No active rooms';
    elements.activeRoomsList.appendChild(li);
    return;
  }
  
  rooms.forEach(room => {
    const li = document.createElement('li');
    li.className = `room-item${room === state.roomId ? ' active' : ''}`;
    
    li.innerHTML = `
      <span class="room-item-name">
        <span class="room-dot"></span>
        ${room}
      </span>
      ${room === state.roomId ? '<span class="room-badge">Current</span>' : ''}
    `;
    
    li.addEventListener('click', () => {
      elements.roomInput.value = room;
      if (room !== state.roomId) {
        state.roomId = room;
        onJoinRoom(room);
      }
    });
    
    elements.activeRoomsList.appendChild(li);
  });
}

// ─── User List ──────────────────────────────────────────

/**
 * Render the online users list in the sidebar.
 * @param {Object[]} users - Array of user objects.
 */
export function updateUserList(users) {
  elements.userCount.textContent = users.length;
  elements.userList.innerHTML = '';
  
  users.forEach(user => {
    const li = document.createElement('li');
    li.className = 'user-item';
    li.id = `user-item-${user.id}`;
    
    li.innerHTML = `
      <div class="user-color" style="background-color: ${user.color}; color: ${user.color}"></div>
      <div class="user-name">${user.name}</div>
    `;
    elements.userList.appendChild(li);
  });
}

// ─── Remote Cursors ─────────────────────────────────────
const activeCursors = new Map();

/**
 * Create or update a remote user's cursor position.
 * @param {string} userId - Socket ID of the remote user.
 * @param {Object} user - User object with name and color.
 * @param {Object} position - { x, y } coordinates.
 */
export function updateCursor(userId, user, position) {
  if (!activeCursors.has(userId)) {
    const cursorEl = document.createElement('div');
    cursorEl.className = 'remote-cursor';
    cursorEl.id = `cursor-${userId}`;
    
    const color = user ? user.color : '#818cf8';
    const name = user ? user.name : 'Unknown';
    
    cursorEl.innerHTML = `
      <div class="cursor-icon" style="background-color: ${color}"></div>
      <div class="cursor-name" style="background-color: ${color}">${name}</div>
    `;
    
    elements.cursorsContainer.appendChild(cursorEl);
    activeCursors.set(userId, cursorEl);
  }
  
  const cursor = activeCursors.get(userId);
  cursor.style.transform = `translate(${position.x}px, ${position.y}px)`;
}

/**
 * Remove a remote user's cursor from the DOM.
 * @param {string} userId - Socket ID of the user who left.
 */
export function removeCursor(userId) {
  if (activeCursors.has(userId)) {
    const el = activeCursors.get(userId);
    el.remove();
    activeCursors.delete(userId);
  }
}
