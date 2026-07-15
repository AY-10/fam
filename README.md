# Real-Time Collaborative Drawing Canvas

A production-ready multi-user collaborative whiteboard built with **HTML5 Canvas**, **Vanilla JavaScript**, **Node.js**, and **Socket.io**.

> **Live Demo:** [https://collaborative-canvas-3exn.onrender.com](https://collaborative-canvas-3exn.onrender.com)

---

## Features

| Feature | Description |
|---|---|
| **Real-Time Drawing** | Synchronized brush strokes across all connected users — updates stream continuously, not just on mouseup |
| **Drawing Tools** | Brush, Eraser, Color Picker, Stroke Width adjustment |
| **Room System** | Create or join isolated rooms — each room has its own canvas and user list |
| **Live Cursors** | See where other users are drawing in real-time with color-coded cursor labels |
| **User Presence** | Online user count with unique assigned colors and names |
| **Global Undo & Redo** | Operation-based undo removes the last stroke for all users. Redo restores it. Both rebuild the canvas in real-time |
| **Persistence** | Drawing operations are saved to disk as JSON — survives server restarts |
| **Performance** | `requestAnimationFrame` rendering, point batching, and quadratic bezier curve smoothing |
| **Mobile Support** | Touch events (`touchstart`, `touchmove`, `touchend`) with responsive layout, and fully functional mobile toolbar |
| **Keyboard Shortcuts** | `Ctrl+Z` undo, `Ctrl+Y` redo, `B` brush, `E` eraser |

## Tech Stack

- **Frontend:** Vanilla JavaScript, HTML5 Canvas API, CSS3
- **Backend:** Node.js, Express.js, Socket.io
- **Persistence:** JSON file storage via Node.js Worker Threads
- **Deployment:** Render

## Getting Started

```bash
# Install dependencies
npm install

# Start the server
npm start

# Development mode (hot reload)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in multiple browser windows to test real-time collaboration.

## Architecture

The system uses an **operation-based data model** instead of image snapshots. Every brush stroke is stored as a structured operation:

```json
{
  "id": "abc123x",
  "userId": "socket_xyz",
  "type": "brush",
  "color": "#818cf8",
  "width": 5,
  "points": [{ "x": 100, "y": 150 }, { "x": 102, "y": 155 }]
}
```

This enables deterministic conflict resolution (server-ordered operations), global undo (pop from operation stack + full canvas rebuild), and efficient persistence.

> For the full system design, WebSocket protocol, scaling strategy, and performance optimizations, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Project Structure

```
├── client/
│   ├── index.html          # Application shell
│   ├── style.css           # Design system and theming
│   ├── canvas.js           # Canvas rendering, bezier interpolation, input handling
│   ├── websocket.js        # Socket.io client and event management
│   ├── ui.js               # Toolbar, room controls, cursor overlays
│   └── main.js             # Application entry point and orchestration
├── server/
│   ├── server.js           # Express + Socket.io server
│   ├── rooms.js            # Room lifecycle and user management
│   ├── drawing-state.js    # Operation history and state synchronization
│   ├── worker.js           # Background worker for disk persistence
│   └── utils.js            # Validation and helper utilities
├── storage/                # Persisted room state (JSON files)
├── package.json
├── ARCHITECTURE.md
└── README.md
```
