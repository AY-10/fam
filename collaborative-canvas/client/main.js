import { initUI, state } from './ui.js';
import { 
  initSocket, 
  joinRoom, 
  emitUndo, 
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
    onClear: () => {
      emitClear();
    }
  });

  // Initialize WebSockets
  initSocket(state.roomId, {
    onRemoteDrawStart: handleRemoteDrawStart,
    onRemoteDrawMove: handleRemoteDrawMove,
    onRemoteDrawEnd: handleRemoteDrawEnd,
    onCanvasState: setCanvasState
  });

});
