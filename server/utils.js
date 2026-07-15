export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function validateDrawingOperation(op) {
  if (!op || typeof op !== 'object') return false;
  if (!op.id || !op.userId || !op.type) return false;
  if (op.type !== 'brush' && op.type !== 'eraser' && op.type !== 'clear') return false;
  if (op.type === 'clear') return true;
  
  if (!Array.isArray(op.points)) return false;
  
  // Basic validation of point structures
  for (const p of op.points) {
    if (typeof p.x !== 'number' || typeof p.y !== 'number') {
      return false;
    }
  }
  
  return true;
}
