import { parentPort, workerData } from 'worker_threads';

import { createCanvas, loadImage } from 'canvas';

import { drawCroppedImage, invertCanvasImage } from '@/utils';

(async () => {
  try {
    const {
      mapPath,
      radarPath,
      legendPath,
      mapCrop,
      radarCrop,
      outputSize,
      invertRadarLegend,
      legendScale,
      radarOpacity = 0.5,
    } = workerData;

    const [mapImg, radarImgRaw, legendImgRaw] = await Promise.all([
      loadImage(mapPath),
      loadImage(radarPath),
      legendPath ? loadImage(legendPath) : null,
    ]);

    const canvas = createCanvas(outputSize, outputSize);
    const ctx = canvas.getContext('2d');

    drawCroppedImage(ctx, mapImg, mapCrop, { x: 0, y: 0, width: outputSize, height: outputSize });

    ctx.globalAlpha = radarOpacity;
    const radarImg = invertRadarLegend ? await invertCanvasImage(radarImgRaw) : radarImgRaw;
    drawCroppedImage(ctx, radarImg, radarCrop, {
      x: 0,
      y: 0,
      width: outputSize,
      height: outputSize,
    });

    if (legendImgRaw) {
      const legendImg = invertRadarLegend ? await invertCanvasImage(legendImgRaw) : legendImgRaw;
      const legendW = legendImg.width * legendScale;
      const legendH = legendImg.height * legendScale;
      const legendX = outputSize - legendW - 10;
      const legendY = outputSize - legendH - 10;
      ctx.drawImage(legendImg, legendX, legendY, legendW, legendH);
    }
    ctx.globalAlpha = 1.0;

    const buffer = ctx.canvas.toBuffer('image/png');
    parentPort?.postMessage({ success: true, buffer });
  } catch (err) {
    parentPort?.postMessage({ success: false, error: (err as Error).message });
  }
})();
