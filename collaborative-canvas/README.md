# Real-Time Collaborative Drawing Canvas

A production-ready collaborative whiteboard application built with Vanilla JS, Node.js, and Socket.io.

## Features

*   **Drawing Tools**: Brush, Eraser, color picker, stroke width adjustment.
*   **Real-time Collaboration**: Synchronized drawing strokes and remote cursors.
*   **Rooms**: Isolated collaborative sessions. Join different rooms to separate your drawings.
*   **User Presence**: Live online user counts with distinct colors and names.
*   **Global Undo/Redo**: Operation-based history allows global undo, keeping everyone's canvas perfectly synced.
*   **Persistence**: Server-side disk persistence saves drawing states automatically per room.
*   **Performance**: Utilizes `requestAnimationFrame` and point batching for smooth rendering of thousands of points.
*   **Premium Aesthetics**: Default Dark Mode with glassmorphism UI elements and smooth interactions.

## Setup Instructions

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Start the Server:**
    ```bash
    # For production
    npm start
    
    # For development (with hot reload)
    npm run dev
    ```

3.  **Open the Application:**
    Open `http://localhost:3000` in multiple browser windows to test real-time collaboration.

## Testing Instructions

1.  Open two or more browser windows side-by-side to `http://localhost:3000`.
2.  Draw in one window and observe the real-time syncing in the other.
3.  Change the room name in the sidebar of one window and click "Join". Notice that the canvas is isolated.
4.  Test the Global Undo (Ctrl+Z or the Undo button in the UI) to verify operations are removed for everyone in the room.

## Deployment Instructions (Render/Railway)

1.  Push the repository to GitHub.
2.  Connect the repository to Render or Railway.
3.  Set the Build Command to: `npm install`
4.  Set the Start Command to: `npm start`
5.  Ensure the deployment environment supports Node.js (v16+) and WebSocket connections.
6.  *Note:* Because the application uses disk-based JSON persistence in the `storage/` directory, ensure the host provides a persistent disk/volume mounted at that path if you want data to survive container restarts.

## Future Improvements

*   Support for drawing shapes (rectangles, circles, straight lines).
*   Ability to export the canvas as a PNG or SVG.
*   Full touch/stylus pressure support for variable line widths.
*   User authentication for saving personal drawing histories.
