export type Bbox = [number, number, number, number];

const EARTH_RADIUS = 6378137;

export const TILE_SIZE = 256;
export const IMAGE_SIZE = 1024;

// Same view as the Leaflet maps the old SIATA assets were exported from (zoom 11 and 10).
export const CENTER = { lat: 6.190803878881255, lon: -75.52890376886037 };
// Longitude degrees across the square view for circles 1 and 2.
export const SPAN_DEGREES = [0.4463, 0.989];

// Places the old `locations` maps marked with a 200 m circle.
export const MARKERS = [
  { lat: 6.340952296222601, lon: -75.56116588561146 },
  { lat: 6.258279640030747, lon: -75.55750902459278 },
  { lat: 6.2257379291004105, lon: -75.54568792078722 },
  { lat: 6.184332866800563, lon: -75.59438207903935 },
  { lat: 6.1857175, lon: -75.6508711 },
];
export const MARKER_RADIUS_METERS = 200;

const toMeters = (lat: number, lon: number) => ({
  x: EARTH_RADIUS * ((lon * Math.PI) / 180),
  y: EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)),
});

// Square view in Web Mercator meters, shared by the satellite request and the street tiles.
export const mercatorBbox = (circles: number): Bbox => {
  const side = (SPAN_DEGREES[circles - 1] / 360) * 2 * Math.PI * EARTH_RADIUS;
  const { x, y } = toMeters(CENTER.lat, CENTER.lon);
  return [x - side / 2, y - side / 2, x + side / 2, y + side / 2];
};

export const worldPixels = (lat: number, lon: number, zoom: number) => {
  const world = TILE_SIZE * 2 ** zoom;
  const sin = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lon + 180) / 360) * world,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * world,
  };
};

export const metersPerPixel = (lat: number, zoom: number): number =>
  (2 * Math.PI * EARTH_RADIUS * Math.cos((lat * Math.PI) / 180)) / (TILE_SIZE * 2 ** zoom);

// One zoom lower than what a 1024px output needs: the native scale of the old Leaflet maps,
// which also keeps their label density.
export const basemapZoom = (circles: number): number =>
  Math.ceil(Math.log2((IMAGE_SIZE * 360) / (SPAN_DEGREES[circles - 1] * TILE_SIZE)) - 0.3) - 1;

export interface TilePlan {
  zoom: number;
  // pixel size of the square view at this zoom
  size: number;
  // pixel position of the view's top-left corner in the world
  left: number;
  top: number;
  tiles: { x: number; y: number }[];
}

export const tilePlan = (circles: number): TilePlan => {
  const zoom = basemapZoom(circles);
  const size = (SPAN_DEGREES[circles - 1] / 360) * TILE_SIZE * 2 ** zoom;
  const center = worldPixels(CENTER.lat, CENTER.lon, zoom);
  const left = center.x - size / 2;
  const top = center.y - size / 2;

  const tiles: TilePlan['tiles'] = [];
  for (let y = Math.floor(top / TILE_SIZE); y <= Math.floor((top + size) / TILE_SIZE); y++)
    for (let x = Math.floor(left / TILE_SIZE); x <= Math.floor((left + size) / TILE_SIZE); x++)
      tiles.push({ x, y });
  return { zoom, size, left, top, tiles };
};
