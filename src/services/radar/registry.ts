import { DEFAULT_RADAR_PROVIDER } from '@/config/radar';
import type { RadarProvider, RadarProviderId } from '@/types';

import { GibsProvider } from './gibs/gibs.provider';
import { SiataProvider } from './siata/siata.provider';

const factories: Record<RadarProviderId, () => RadarProvider> = {
  siata: () => new SiataProvider(),
  gibs: () => new GibsProvider(),
};

export const RADAR_PROVIDER_IDS = Object.keys(factories) as RadarProviderId[];

const instances = new Map<RadarProviderId, RadarProvider>();

export const getRadarProvider = (id: RadarProviderId = DEFAULT_RADAR_PROVIDER): RadarProvider => {
  const factory = factories[id];
  if (!factory) throw new Error(`Unknown radar provider: ${id}`);
  let provider = instances.get(id);
  if (!provider) {
    provider = factory();
    instances.set(id, provider);
  }
  return provider;
};
