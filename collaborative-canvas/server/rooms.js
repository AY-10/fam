// Manage active users and their rooms
const activeUsers = new Map(); // socketId -> { id, name, color, roomId }
const rooms = new Map(); // roomId -> Set of socketIds

// Predefined colors for users
const USER_COLORS = [
  '#FF3B30', '#FF9500', '#FFCC00', '#4CD964', 
  '#5AC8FA', '#007AFF', '#5856D6', '#FF2D55'
];

export function joinRoom(socket, roomId, userName) {
  // Leave current room if any
  leaveRoom(socket);

  const color = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
  const user = {
    id: socket.id,
    name: userName || `User-${socket.id.substring(0, 4)}`,
    color: color,
    roomId: roomId
  };

  activeUsers.set(socket.id, user);

  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId).add(socket.id);

  socket.join(roomId);
  return user;
}

export function leaveRoom(socket) {
  const user = activeUsers.get(socket.id);
  if (user) {
    const roomId = user.roomId;
    if (rooms.has(roomId)) {
      rooms.get(roomId).delete(socket.id);
      if (rooms.get(roomId).size === 0) {
        rooms.delete(roomId);
      }
    }
    activeUsers.delete(socket.id);
    socket.leave(roomId);
    return user;
  }
  return null;
}

export function getUser(socketId) {
  return activeUsers.get(socketId);
}

export function getRoomUsers(roomId) {
  if (!rooms.has(roomId)) return [];
  const userIds = Array.from(rooms.get(roomId));
  return userIds.map(id => activeUsers.get(id));
}
