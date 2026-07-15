# System Architecture

## 1. System Design

The application follows a standard Client-Server architecture utilizing WebSockets for real-time bidirectional communication.
- **Frontend (Client):** Pure Vanilla JavaScript (`client/`) handling DOM manipulations, HTML5 Canvas rendering, and capturing high-frequency input events (mouse/touch).
- **Backend (Server):** Node.js and Express server (`server/`) serving static files and hosting a Socket.io instance for room and event management.
- **Persistence Layer:** A Node.js Worker Thread (`worker.js`) running in the background to periodically persist room states to disk (JSON files) without blocking the main event loop.

## 2. WebSocket Event Flow

When a user draws on the canvas:
1. `mousedown/touchstart`: Client captures the initial point, creates a unique `operation` object, and emits `draw-start`.
2. `mousemove/touchmove`: Client batches points locally to reduce network spam. Every ~30ms, it emits `draw-move` with the new points for the active operation.
3. `mouseup/touchend`: Client emits `draw-end` to finalize the operation.

The server receives these events and immediately broadcasts them to all other connected clients in the same Socket.io room via `socket.to(roomId).emit(...)`.

## 3. Drawing Data Model

We do NOT use image snapshots. The canvas is defined purely by an array of sequential "operations".

```json
{
  "id": "abc123x",
  "userId": "socket_xyz789",
  "type": "brush",
  "color": "#ff0000",
  "width": 5,
  "points": [
    { "x": 100, "y": 150 },
    { "x": 102, "y": 155 }
  ]
}
```

This model enables infinite redrawing, scaling, conflict resolution, and global undo functionalities.

## 4. Global Undo Strategy

Since the state is an array of operations:
- When a user triggers "Undo", the server pops the *last* operation off the room's operation stack.
- The server broadcasts an `undo-update` event to the room containing the newly truncated operations array.
- All clients receive the event, clear their local canvas (`ctx.clearRect`), and redraw the entire remaining operations array sequentially.
- This ensures perfect eventual consistency.

## 5. Conflict Resolution Strategy

By using a centralized server to manage the operation history, conflict resolution is deterministic. 
If User A and User B draw at the exact same time, the server processes their `draw-start` packets in the order they arrive via TCP. 
The canvas rendering engine draws operations in exact chronological order, inherently resolving overlapping strokes (the later operation draws on top of the earlier one).

## 6. Performance Optimizations

- **Point Batching:** `draw-move` events are batched every 30ms instead of firing on every single mouse event, drastically reducing network overhead.
- **requestAnimationFrame:** Canvas redrawing is decoupled from input event listeners and tied to the browser's display refresh rate to prevent frame drops and jank.
- **Quadratic Bezier Interpolation:** Raw mouse points are often jagged. We use bezier curves between midpoints to create smooth strokes even when points are sparse due to fast mouse movement.

## 7. Persistence Design

Node.js is single-threaded. JSON serialization of a massive operations array for a busy room could block the event loop, causing lag for real-time users. 
To prevent this, persistence is offloaded to a Node.js Worker Thread (`worker.js`). The main thread passes the operations to the worker, and the worker handles file system writes asynchronously.

## 8. Scaling Strategy (1000+ Concurrent Users)

To scale this beyond a single Node.js instance:
1.  **Redis Pub/Sub:** Introduce a Redis adapter for Socket.io. This allows multiple Node.js instances to share rooms and broadcast events across servers.
2.  **Database Storage:** Replace the file-system worker with a proper document database (like MongoDB or PostgreSQL with JSONB) to store room operations permanently.
3.  **Operation Compaction (Snapshotting):** An array of 100,000 operations is too large to send to a newly joining client. We would periodically generate a rasterized image "snapshot" of the canvas up to a certain point in time, and only store/transmit the operations that occurred *after* that snapshot.
