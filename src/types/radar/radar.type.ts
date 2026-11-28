import type { RenderParams, RenderParamsWithGif } from '@/types';

export type RadarProviderId = 'siata' | 'gibs';

export interface RadarRequest {
  map: string;
  // marker circles on the map; timelapses ignore it
  locations: boolean;
  circles: number;
}

export interface RadarMap {
  name: string;
  description: string;
}

export type RadarStillScene = Omit<RenderParams, 'outputSize'>;
export type RadarTimelapseScene = Omit<
  RenderParamsWithGif,
  'outputSize' | 'gifPath' | 'showProgress'
>;

export interface RadarProvider {
  id: RadarProviderId;
  title: string;
  attribution: string;
  // satellite sources are not rain radar, so the reply says so
  kind: 'radar' | 'satellite';
  // the first map is the provider's default
  maps: RadarMap[];
  prepareStill(request: RadarRequest): Promise<RadarStillScene>;
  // null means there are not enough frames yet
  prepareTimelapse(request: RadarRequest): Promise<RadarTimelapseScene | null>;
  refresh?(): Promise<void>;
}
