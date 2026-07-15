import { initUI, state, updateActiveRooms } from './ui.js';
import { 
  initSocket, 
  joinRoom, 
  emitUndo, 
  emitRedo,
  emitClear 
} from './websocket.js';
import { 
  handleRemoteDrawStart, 
  handleRemoteDrawMove, 
  handleRemoteDrawEnd, 
  setCanvasState 
} from './canvas.js';

document.addEventListener('DOMContentLoaded', () => {
  
  // Initialize UI events
  initUI({
    onJoinRoom: (roomId) => {
      joinRoom(roomId);
    },
    onUndo: () => {
      emitUndo();
    },
    onRedo: () => {
      emitRedo();
    },
    onClear: () => {
      emitClear();
    }
  });

  // Initialize WebSockets
  initSocket(state.roomId, {
    onRemoteDrawStart: handleRemoteDrawStart,
    onRemoteDrawMove: handleRemoteDrawMove,
    onRemoteDrawEnd: handleRemoteDrawEnd,
    onCanvasState: setCanvasState,
    onActiveRooms: (rooms) => {
      updateActiveRooms(rooms, (roomId) => {
        joinRoom(roomId);
      });
    }
  });

});
