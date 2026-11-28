import type { Canvas } from 'canvas';

// The sync toBuffer blocks the event loop for the whole encode; this runs it on the threadpool.
export const encodePng = (canvas: Canvas): Promise<Buffer> =>
  new Promise((resolve, reject) =>
    canvas.toBuffer((error, buffer) => (error ? reject(error) : resolve(buffer)), 'image/png'),
  );
