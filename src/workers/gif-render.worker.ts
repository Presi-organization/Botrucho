import fsCallback from 'fs';
import { parentPort, workerData } from 'worker_threads';
import { createCanvas, loadImage } from 'canvas';
// @ts-expect-error: No types
import GIFEncoder from 'gif-encoder-2';
import { drawCroppedImage, invertCanvasImage } from '@/utils';

(async () => {
  try {
    const {
      radarImages,
      mapPath,
      mapCrop,
      radarCrop,
      outputSize,
      gifPath,
      invertRadar,
      showProgress
    } = workerData;

    const mapImg = await loadImage(mapPath);
    const canvas = createCanvas(outputSize, outputSize);
    const ctx = canvas.getContext('2d');

    const encoder = new GIFEncoder(outputSize, outputSize);
    const gifStream = fsCallback.createWriteStream(gifPath);
    encoder.createReadStream().pipe(gifStream);

    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(500);
    encoder.setQuality(10);

    for (let i = 0; i < radarImages.length; i++) {
      const radarRaw = await loadImage(radarImages[i]);
      const radarImg = invertRadar ? await invertCanvasImage(radarRaw) : radarRaw;

      ctx.clearRect(0, 0, outputSize, outputSize);
      drawCroppedImage(ctx, mapImg, mapCrop, { x: 0, y: 0, width: outputSize, height: outputSize });

      ctx.globalAlpha = 0.5;
      drawCroppedImage(ctx, radarImg, radarCrop, { x: 0, y: 0, width: outputSize, height: outputSize });

      if (showProgress) {
        ctx.fillStyle = invertRadar ? '#ff0084' : '#ff6a00';
        ctx.fillRect(0, outputSize - 10, ((outputSize * (i + 1)) / radarImages.length), 10);
      }
      ctx.globalAlpha = 1.0;

      encoder.addFrame(ctx);
    }

    encoder.finish();

    gifStream.on('finish', () => {
      parentPort?.postMessage({ success: true });
    });
  } catch (error) {
    parentPort?.postMessage({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
})();
