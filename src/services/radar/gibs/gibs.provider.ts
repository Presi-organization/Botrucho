import path from 'path';

import type { RadarProvider, RadarRequest, RadarStillScene, RadarTimelapseScene } from '@/types';

import { type BasemapTheme, stitchBasemap } from './basemap';
import { hasImagery, keyOutGray } from './cloud-mask';
import { FileCache } from './file-cache';
import {
  FRAME_STEP_MS,
  fetchPng,
  findLatestFrame,
  IMAGERY_LAYER,
  isoTime,
  wmsUrl,
} from './gibs.client';
import { SerialQueue } from './serial-queue';
import { IMAGE_SIZE, mercatorBbox } from './view';

const RADAR_OPACITY = 0.75;
const TIMELAPSE_FRAMES = 8;
const TIMELAPSE_STEP = 3;
const LATEST_TTL_MS = 10 * 60_000;
// Must outlast the timelapse span plus the feed lag, or fresh frames get pruned mid-build.
const FRAME_RETENTION_MS = 12 * 60 * 60_000;

export interface GibsDeps {
  fetchImage: (url: string) => Promise<Buffer>;
  hasImagery: (png: Buffer) => Promise<boolean>;
  keyOut: (png: Buffer) => Promise<Buffer>;
  basemap: (circles: number, theme: BasemapTheme, markers: boolean) => Promise<Buffer>;
  now: () => number;
  dir: string;
}

const defaultDeps = (): GibsDeps => ({
  fetchImage: fetchPng,
  hasImagery,
  keyOut: keyOutGray,
  basemap: (circles, theme, markers) => stitchBasemap(fetchPng, circles, theme, markers),
  now: () => Date.now(),
  dir: path.join(process.cwd(), 'assets', 'radar', 'gibs'),
});

export class GibsProvider implements RadarProvider {
  id = 'gibs' as const;
  title = 'GOES-East';
  attribution = 'Imagery: NASA GIBS / NOAA GOES-East · Map: Google';
  kind = 'satellite' as const;
  maps = [
    { name: 'google', description: 'Google Streets map' },
    { name: 'dark', description: 'Dark Google Streets map' },
  ];

  private latest: { time: number; checkedAt: number } | null = null;
  private deps: GibsDeps;
  private cache: FileCache;
  private cpu = new SerialQueue();
  private latestPending: Promise<number> | null = null;

  constructor(deps: Partial<GibsDeps> = {}) {
    this.deps = { ...defaultDeps(), ...deps };
    this.cache = new FileCache(this.deps.dir, this.deps.now);
  }

  async prepareStill({ map, locations, circles }: RadarRequest): Promise<RadarStillScene> {
    const time = await this.latestTime();
    const [mapPath, radarPath] = await Promise.all([
      this.basemap(circles, map, locations),
      this.frame(circles, time),
    ]);

    return {
      mapPath,
      radarPath,
      ...this.crops(),
      invertRadarLegend: false,
      legendScale: 0,
      radarOpacity: RADAR_OPACITY,
    };
  }

  async prepareTimelapse({ map, circles }: RadarRequest): Promise<RadarTimelapseScene | null> {
    const latest = await this.latestTime();
    const times = Array.from(
      { length: TIMELAPSE_FRAMES },
      (_, i) => latest - (TIMELAPSE_FRAMES - 1 - i) * TIMELAPSE_STEP * FRAME_STEP_MS,
    );

    const frames = await Promise.allSettled(times.map((t) => this.frame(circles, t)));
    const radarImages = frames.flatMap((f) => (f.status === 'fulfilled' ? [f.value] : []));
    if (radarImages.length < 2) return null;

    return {
      radarImages,
      mapPath: await this.basemap(circles, map, false),
      ...this.crops(),
      invertRadar: false,
      radarOpacity: RADAR_OPACITY,
    };
  }

  private crops() {
    const crop = { x: IMAGE_SIZE / 2, y: IMAGE_SIZE / 2, width: IMAGE_SIZE, height: IMAGE_SIZE };
    return { mapCrop: crop, radarCrop: crop };
  }

  private basemap(circles: number, map: string, markers: boolean): Promise<string> {
    const theme: BasemapTheme = map === 'dark' ? 'dark' : 'google';
    return this.cache.ensure(
      path.join('maps', `${theme}_${markers ? 'locations' : 'clean'}_${circles}.png`),
      () => this.cpu.run(() => this.deps.basemap(circles, theme, markers)),
    );
  }

  private async frame(circles: number, time: number): Promise<string> {
    const file = await this.cache.ensure(
      path.join('frames', `${circles}_${time}.png`),
      async () => {
        const png = await this.deps.fetchImage(
          wmsUrl(IMAGERY_LAYER, mercatorBbox(circles), IMAGE_SIZE, isoTime(time)),
        );
        if (!(await this.deps.hasImagery(png))) throw new Error(`No imagery for ${isoTime(time)}`);
        return this.cpu.run(() => this.deps.keyOut(png));
      },
    );
    void this.cache.pruneOlderThan('frames', FRAME_RETENTION_MS);
    return file;
  }

  private latestTime(): Promise<number> {
    if (this.latest && this.deps.now() - this.latest.checkedAt < LATEST_TTL_MS)
      return Promise.resolve(this.latest.time);

    // concurrent callers share one probe instead of each stepping back through GIBS
    this.latestPending ??= findLatestFrame(
      this.deps.fetchImage,
      this.deps.hasImagery,
      mercatorBbox(2),
      this.deps.now(),
    )
      .then((time) => {
        this.latest = { time, checkedAt: this.deps.now() };
        return time;
      })
      .finally(() => {
        this.latestPending = null;
      });
    return this.latestPending;
  }
}
