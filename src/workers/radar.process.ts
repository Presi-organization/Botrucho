import { getRadarProvider, RADAR_PROVIDER_IDS } from '@/services/radar';
import { logger } from '@/utils';

// Every provider is refreshed, not only the default one, because /radar can pick any of them.
export const workerRadarProcess = async () => {
  for (const id of RADAR_PROVIDER_IDS) {
    try {
      await getRadarProvider(id).refresh?.();
    } catch (error) {
      logger.error(`Error refreshing radar source ${id}:`, error);
    }
  }
};
