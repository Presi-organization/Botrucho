import { type Canvas, createCanvas, loadImage } from 'canvas';

import { encodePng } from './png';

const COLOR_CHROMA = 28;
const BLOCK = 8;
// ~14 px at full size
const CLOSE_RADIUS_BLOCKS = 2;

// GIBS answers a time with no imagery with a fully transparent image, not an error.
export async function hasImagery(png: Buffer): Promise<boolean> {
  const image = await loadImage(png);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const { data } = ctx.getImageData(
    Math.floor(image.width / 2),
    Math.floor(image.height / 2),
    1,
    1,
  );
  return data[3] > 0;
}

// Min/max filter along one axis; used twice per axis to close small holes in the mask.
const slide = (
  src: Uint8Array,
  width: number,
  height: number,
  radius: number,
  horizontal: boolean,
  keepMax: boolean,
): Uint8Array => {
  const out = new Uint8Array(src.length);
  const length = horizontal ? width : height;
  const lines = horizontal ? height : width;
  for (let line = 0; line < lines; line++) {
    for (let i = 0; i < length; i++) {
      let value = keepMax ? 0 : 1;
      const from = Math.max(0, i - radius);
      const to = Math.min(length - 1, i + radius);
      for (let j = from; j <= to; j++) {
        const v = horizontal ? src[line * width + j] : src[j * width + line];
        if (keepMax ? v > value : v < value) value = v;
      }
      out[horizontal ? line * width + i : i * width + line] = value;
    }
  }
  return out;
};

// The satellite pixels are ~2 km, so scaling down and back up softens the blocks.
function smooth(source: Canvas): Promise<Buffer> {
  const small = createCanvas(source.width / BLOCK, source.height / BLOCK);
  const smallCtx = small.getContext('2d');
  smallCtx.drawImage(source, 0, 0, small.width, small.height);
  const out = createCanvas(source.width, source.height);
  const outCtx = out.getContext('2d');
  outCtx.drawImage(small, 0, 0, out.width, out.height);
  return encodePng(out);
}

// The IR colormap paints warm surfaces gray and cold cloud tops in color. Keeping only the
// colored pixels (plus the dark cores they enclose) gives a radar-like overlay for a map.
// The result is blurred by `smooth` anyway, so the hole-closing runs on blocks of pixels:
// ~60x less work than at full size, which matters on a shared-CPU host.
export async function keyOutGray(png: Buffer): Promise<Buffer> {
  const image = await loadImage(png);
  const { width, height } = image;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const frame = ctx.getImageData(0, 0, width, height);
  const { data } = frame;

  const cols = Math.ceil(width / BLOCK);
  const rows = Math.ceil(height / BLOCK);
  const colored = new Uint8Array(cols * rows);
  for (let y = 0; y < height; y++) {
    const row = Math.floor(y / BLOCK) * cols;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (Math.max(r, g, b) - Math.min(r, g, b) >= COLOR_CHROMA)
        colored[row + Math.floor(x / BLOCK)] = 1;
    }
  }

  let mask = slide(colored, cols, rows, CLOSE_RADIUS_BLOCKS, true, true);
  mask = slide(mask, cols, rows, CLOSE_RADIUS_BLOCKS, false, true);
  mask = slide(mask, cols, rows, CLOSE_RADIUS_BLOCKS, true, false);
  mask = slide(mask, cols, rows, CLOSE_RADIUS_BLOCKS, false, false);

  // A pixel stays if it is colored, or if closing filled its block (a dark core with no colored
  // pixel). Blocks mixed with the gray ground keep only their colored pixels, so blobs get no
  // gray fringe.
  for (let y = 0; y < height; y++) {
    const row = Math.floor(y / BLOCK) * cols;
    for (let x = 0; x < width; x++) {
      const block = row + Math.floor(x / BLOCK);
      const i = (y * width + x) * 4;
      const isColored =
        Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]) >=
        COLOR_CHROMA;
      if (!isColored && !(mask[block] && !colored[block])) data[i + 3] = 0;
    }
  }
  ctx.putImageData(frame, 0, 0);
  return smooth(canvas);
}
