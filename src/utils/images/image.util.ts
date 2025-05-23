import { Canvas, CanvasRenderingContext2D, createCanvas, Image } from 'canvas';
import { CropInfo } from '@/types';

export function computeTopLeftCrop(crop: CropInfo): CropInfo {
  return {
    x: crop.x - crop.width / 2,
    y: crop.y - crop.height / 2,
    width: crop.width,
    height: crop.height
  };
}

export function drawCroppedImage(
  ctx: CanvasRenderingContext2D,
  image: Image | Canvas,
  crop: CropInfo,
  drawTo: CropInfo
): void {
  const source = computeTopLeftCrop(crop);
  ctx.drawImage(
    image,
    source.x, source.y, source.width, source.height,
    drawTo.x, drawTo.y, drawTo.width, drawTo.height
  );
}

export async function invertCanvasImage(image: Image): Promise<Canvas> {
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);

  const imageData = ctx.getImageData(0, 0, image.width, image.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];       // R
    data[i + 1] = 255 - data[i + 1]; // G
    data[i + 2] = 255 - data[i + 2]; // B
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
