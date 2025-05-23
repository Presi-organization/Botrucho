import { CropInfo } from '@/types/image-data.type';

export interface RenderParams {
  mapPath: string;
  radarPath: string;
  legendPath: string;
  mapCrop: CropInfo;
  radarCrop: CropInfo;
  outputSize: number;
  invertRadarLegend: boolean;
  legendScale: number;
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
}
