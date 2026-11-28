import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

import type {
  ImageCenter,
  RadarProvider,
  RadarRequest,
  RadarStillScene,
  RadarTimelapseScene,
} from '@/types';
import { logger } from '@/utils';

const MAP_CENTER: ImageCenter = { x: 1024, y: 540 };
const RADAR_CENTER: ImageCenter = { x: 480, y: 503 };
const LEGEND_SCALE = 0.17;

const assetPath = (...segments: string[]): string =>
  path.join(process.cwd(), 'assets', 'siata', ...segments);

export const siataFolder = (map: string): 'smoothdark' | 'googlestreets' =>
  map === 'stadia' ? 'smoothdark' : 'googlestreets';

export const siataCrops = (circles: number) => {
  const mapCropSize = [650, 720][circles - 1];
  const radarCropSize = 200 + (circles - 1) * 250;
  return {
    mapCrop: { ...MAP_CENTER, width: mapCropSize, height: mapCropSize },
    radarCrop: { ...RADAR_CENTER, width: radarCropSize, height: radarCropSize },
  };
};

async function sortedRadarImages(): Promise<string[]> {
  const radarDir = assetPath('radar_history');
  const files = await fs.readdir(radarDir);
  return files
    .filter((f) => f.startsWith('radar_') && f.endsWith('.png'))
    .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))
    .map((f) => path.join(radarDir, f));
}

export class SiataProvider implements RadarProvider {
  id = 'siata' as const;
  title = 'SIATA';
  attribution = 'SIATA';
  kind = 'radar' as const;
  maps = [
    { name: 'google', description: 'Google Maps Tile Layer' },
    { name: 'stadia', description: 'Stadia Maps Tile Layer' },
  ];

  async prepareStill({ map, locations, circles }: RadarRequest): Promise<RadarStillScene> {
    return {
      mapPath: assetPath(siataFolder(map), locations ? 'locations' : 'clean', `map${circles}x.png`),
      radarPath: assetPath('radar.png'),
      legendPath: assetPath('radarLegend.png'),
      ...siataCrops(circles),
      invertRadarLegend: map === 'stadia',
      legendScale: LEGEND_SCALE,
    };
  }

  async prepareTimelapse({ map, circles }: RadarRequest): Promise<RadarTimelapseScene | null> {
    const radarImages = await sortedRadarImages();
    if (radarImages.length < 2) return null;

    return {
      radarImages,
      mapPath: assetPath(siataFolder(map), 'clean', `map${circles}x.png`),
      ...siataCrops(circles),
      invertRadar: map === 'stadia',
    };
  }

  // Runs in a separate process so the download never blocks the shard.
  async refresh(): Promise<void> {
    try {
      const child = spawn(
        'node',
        [
          '-e',
          `
        require('${path.join(process.cwd(), 'src/services/radar/siata/siata-radar.service.js')}')
          .checkAndSaveRadarImage()
          .catch(console.error);
      `,
        ],
        { detached: true, stdio: 'inherit' },
      );
      child.unref();
    } catch (error) {
      logger.error('Error spawning radar image process:', error);
    }
  }
}
