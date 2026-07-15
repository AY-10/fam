// UI Elements
export const elements = {
  roomInput: document.getElementById('room-input'),
  joinBtn: document.getElementById('join-btn'),
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

export const state = {
  currentTool: 'brush', // 'brush' | 'eraser'
  color: '#ffffff',
  lineWidth: 5,
  roomId: 'general'
};

export function initUI(callbacks) {
  // Tools
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

  elements.colorPicker.addEventListener('input', (e) => {
    state.color = e.target.value;
  });

  elements.strokeWidth.addEventListener('input', (e) => {
    state.lineWidth = parseInt(e.target.value, 10);
  });

  // Room logic
  elements.joinBtn.addEventListener('click', () => {
    const newRoom = elements.roomInput.value.trim();
    if (newRoom && newRoom !== state.roomId) {
      state.roomId = newRoom;
      callbacks.onJoinRoom(newRoom);
    }
  });

  // Actions
  elements.actionUndo.addEventListener('click', () => {
    callbacks.onUndo();
  });

  elements.actionClear.addEventListener('click', () => {
    callbacks.onClear();
  });

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') {
        e.preventDefault();
        callbacks.onUndo();
      }
    }
  });
}

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

// Remote Cursors
const activeCursors = new Map();

export function updateCursor(userId, user, position) {
  if (!activeCursors.has(userId)) {
    // Create new cursor
    const cursorEl = document.createElement('div');
    cursorEl.className = 'remote-cursor';
    cursorEl.id = `cursor-${userId}`;
    
    // SVG cursor colored to user's color
    const color = user ? user.color : '#fff';
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

export function removeCursor(userId) {
  if (activeCursors.has(userId)) {
    const el = activeCursors.get(userId);
    el.remove();
    activeCursors.delete(userId);
  }
}
