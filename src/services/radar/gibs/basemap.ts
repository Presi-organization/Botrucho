import { createCanvas, loadImage } from 'canvas';

import { encodePng } from './png';
import {
  IMAGE_SIZE,
  MARKER_RADIUS_METERS,
  MARKERS,
  metersPerPixel,
  tilePlan,
  TILE_SIZE,
  worldPixels,
} from './view';

const TILE_CONCURRENCY = 8;

export type BasemapTheme = 'google' | 'dark';

// Google now adds POIs and the airport icon that the 2023 export lacked, so hide those labels.
const GOOGLE_HIDE = 's.t%3A2%7Cs.e%3Al%7Cp.v%3Aoff%2Cs.t%3A4%7Cs.e%3Al%7Cp.v%3Aoff';

// Inverting lightness and muting saturation gives a dark map with the same framing and
// labels, and unlike Stadia or CARTO it needs no tile provider key.
const GOOGLE_DARK = 's.e%3Aall%7Cp.il%3Atrue%2Cs.e%3Aall%7Cp.s%3A-60%2C';

export const basemapUrl = (
  zoom: number,
  x: number,
  y: number,
  theme: BasemapTheme = 'google',
): string =>
  `https://mt${(x + y) % 4}.google.com/vt/lyrs=m&x=${x}&y=${y}&z=${zoom}&apistyle=${theme === 'dark' ? GOOGLE_DARK : ''}${GOOGLE_HIDE}`;

export async function stitchBasemap(
  fetchImage: (url: string) => Promise<Buffer>,
  circles: number,
  theme: BasemapTheme,
  markers: boolean,
): Promise<Buffer> {
  const plan = tilePlan(circles);
  const canvas = createCanvas(IMAGE_SIZE, IMAGE_SIZE);
  const ctx = canvas.getContext('2d');
  const scale = IMAGE_SIZE / plan.size;
  ctx.scale(scale, scale);

  const queue = [...plan.tiles];
  const worker = async () => {
    for (let tile = queue.shift(); tile; tile = queue.shift()) {
      const image = await loadImage(await fetchImage(basemapUrl(plan.zoom, tile.x, tile.y, theme)));
      // 1px overlap hides the hairline seams left by fractional tile offsets
      ctx.drawImage(
        image,
        tile.x * TILE_SIZE - plan.left,
        tile.y * TILE_SIZE - plan.top,
        TILE_SIZE + 1,
        TILE_SIZE + 1,
      );
    }
  };
  await Promise.all(Array.from({ length: TILE_CONCURRENCY }, worker));

  if (markers)
    for (const { lat, lon } of MARKERS) {
      const { x, y } = worldPixels(lat, lon, plan.zoom);
      ctx.beginPath();
      ctx.arc(
        x - plan.left,
        y - plan.top,
        MARKER_RADIUS_METERS / metersPerPixel(lat, plan.zoom),
        0,
        2 * Math.PI,
      );
      ctx.fillStyle = 'rgba(165, 42, 42, 0.2)';
      ctx.fill();
      ctx.lineWidth = 3 / scale;
      ctx.strokeStyle = 'brown';
      ctx.stroke();
    }
  return encodePng(canvas);
}
