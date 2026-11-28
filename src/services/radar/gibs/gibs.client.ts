import { type Bbox } from './view';

const WMS_URL = 'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi';
export const IMAGERY_LAYER = 'GOES-East_ABI_Band13_Clean_Infrared';

export const FRAME_STEP_MS = 10 * 60_000;
const MAX_PROBES = 18;
const REQUEST_TIMEOUT_MS = 20_000;
const FETCH_ATTEMPTS = 3;

export const wmsUrl = (layer: string, bbox: Bbox, size: number, time: string): string => {
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetMap',
    LAYERS: layer,
    SRS: 'EPSG:3857',
    BBOX: bbox.join(','),
    WIDTH: `${size}`,
    HEIGHT: `${size}`,
    FORMAT: 'image/png',
    STYLES: '',
    TRANSPARENT: 'true',
    TIME: time,
  });
  return `${WMS_URL}?${params.toString()}`;
};

export const floorToStep = (ms: number): number => Math.floor(ms / FRAME_STEP_MS) * FRAME_STEP_MS;
export const isoTime = (ms: number): string => new Date(ms).toISOString().replace('.000', '');

const fetchOnce = async (url: string): Promise<Buffer> => {
  const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Image request responded ${res.status}`);
  if (!res.headers.get('content-type')?.startsWith('image/'))
    throw new Error('Image request did not return an image');
  return Buffer.from(await res.arrayBuffer());
};

// Tile servers drop the odd request when many tiles are fetched at once.
export const fetchPng = async (url: string): Promise<Buffer> => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetchOnce(url);
    } catch (error) {
      if (attempt >= FETCH_ATTEMPTS) throw error;
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    }
  }
};

// GIBS has no "latest" shortcut and its newest frame lags real time, so step back until a
// tiny probe request comes back with imagery.
export async function findLatestFrame(
  fetchImage: (url: string) => Promise<Buffer>,
  hasImagery: (png: Buffer) => Promise<boolean>,
  bbox: Bbox,
  now: number,
): Promise<number> {
  let time = floorToStep(now);
  for (let i = 0; i < MAX_PROBES; i++, time -= FRAME_STEP_MS) {
    const png = await fetchImage(wmsUrl(IMAGERY_LAYER, bbox, 64, isoTime(time)));
    if (await hasImagery(png)) return time;
  }
  throw new Error(`No GIBS imagery in the last ${MAX_PROBES * 10} minutes`);
}
