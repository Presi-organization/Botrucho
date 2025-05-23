import { Worker } from 'worker_threads';
import path from 'path';
import { RenderParams, RenderParamsWithGif } from '@/types';

// Overload declarations
export function runRenderWorker(params: RenderParams | RenderParamsWithGif): Promise<Buffer>;
export function runRenderWorker(params: RenderParams | RenderParamsWithGif): Promise<void>;

// Implementation
export function runRenderWorker(params: RenderParams | RenderParamsWithGif): Promise<Buffer | void> {
  return new Promise((resolve, reject) => {
    const isGif = isRenderParamsWithGif(params);
    const workerPath = path.join(__dirname, `../../workers/${isGif ? 'gif-' : ''}render.worker.js`);
    const worker = new Worker(workerPath, { workerData: params });

    worker.on('message', msg => {
      if (msg.success) resolve(isGif ? null : Buffer.isBuffer(msg.buffer) ? msg.buffer : Buffer.from(msg.buffer));
      else reject(new Error(msg.error));
    });

    worker.on('error', reject);
    worker.on('exit', code => {
      if (code !== 0) reject(new Error(`Worker stopped with code ${code}`));
    });
  });
}

function isRenderParamsWithGif(params: RenderParams | RenderParamsWithGif): params is RenderParamsWithGif {
  return 'radarImages' in params && 'gifPath' in params;
}
