import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  joinRoom, 
  leaveRoom, 
  getUser, 
  getRoomUsers,
  getActiveRooms
} from './rooms.js';
import { 
  initDrawingState, 
  loadRoomState, 
  getRoomOperations, 
  addOperation, 
  undoLastOperation, 
  clearRoom 
} from './drawing-state.js';
import { generateId, validateDrawingOperation } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Serve static client files
app.use(express.static(path.join(__dirname, '..', 'client')));

// Initialize drawing state worker
initDrawingState();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  socket.emit('active-rooms', getActiveRooms());

  // Room management
  socket.on('join-room', (roomId, userName, callback) => {
    // Ensure room is loaded from disk
    loadRoomState(roomId);
    
    const user = joinRoom(socket, roomId, userName);
    
    // Broadcast active rooms to all connected clients
    io.emit('active-rooms', getActiveRooms());
    
    // Broadcast user joined
    socket.to(roomId).emit('user-joined', user);
    
    // Send current canvas state and users to the joined user
    const users = getRoomUsers(roomId);
    const operations = getRoomOperations(roomId);
    
    // Use callback to send initial data
    if (typeof callback === 'function') {
      callback({
        user,
        users,
        operations
      });
    }
  });

  // Drawing Events
  socket.on('draw-start', (operation) => {
    const user = getUser(socket.id);
    if (!user) return;
    
    if (validateDrawingOperation(operation)) {
      addOperation(user.roomId, operation);
      socket.to(user.roomId).emit('draw-start', operation);
    }
  });

  socket.on('draw-move', (data) => {
    // Data is { id: operationId, points: [point1, point2, ...] }
    const user = getUser(socket.id);
    if (!user) return;
    
    socket.to(user.roomId).emit('draw-move', data);
    
    // Update the operation in the state
    const operations = getRoomOperations(user.roomId);
    const op = operations.find(o => o.id === data.id);
    if (op && data.points) {
      op.points.push(...data.points);
      // Let the worker save periodically or let the end event trigger save
    }
  });

  socket.on('draw-end', (data) => {
    const user = getUser(socket.id);
    if (!user) return;
    
    socket.to(user.roomId).emit('draw-end', data);
    
    // Trigger a save for this operation
    const operations = getRoomOperations(user.roomId);
    const op = operations.find(o => o.id === data.id);
    if (op) {
      // In our current simple state model, it's already added to array
      // Worker could be optimized to handle appends better
    }
  });

  // Cursor Tracking
  socket.on('cursor-move', (position) => {
    const user = getUser(socket.id);
    if (!user) return;
    
    socket.to(user.roomId).emit('cursor-update', {
      userId: user.id,
      position
    });
  });

  // Global Undo
  socket.on('undo', () => {
    const user = getUser(socket.id);
    if (!user) return;
    
    const undoneOp = undoLastOperation(user.roomId, user.id);
    if (undoneOp) {
      // Tell everyone to rebuild canvas without this operation
      io.to(user.roomId).emit('undo-update', {
        operations: getRoomOperations(user.roomId)
      });
    }
  });

  // Clear Canvas
  socket.on('clear-canvas', () => {
    const user = getUser(socket.id);
    if (!user) return;
    
    clearRoom(user.roomId);
    io.to(user.roomId).emit('canvas-state', {
      operations: []
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    const user = leaveRoom(socket);
    if (user) {
      socket.to(user.roomId).emit('user-left', user.id);
      io.emit('active-rooms', getActiveRooms());
    }
    console.log(`User disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
