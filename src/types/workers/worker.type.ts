import { CropInfo } from '@/types';

export interface RenderParams {
  mapPath: string;
  radarPath: string;
  legendPath?: string;
  mapCrop: CropInfo;
  radarCrop: CropInfo;
  outputSize: number;
  invertRadarLegend: boolean;
  legendScale: number;
  radarOpacity?: number;
}

export interface RenderParamsWithGif {
  radarImages: string[];
  mapPath: string;
  mapCrop: CropInfo;
  radarCrop: CropInfo;
  outputSize: number;
  gifPath: string;
  invertRadar: boolean;
  showProgress: boolean;
  radarOpacity?: number;
}
