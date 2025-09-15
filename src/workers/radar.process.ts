import { spawn } from 'child_process';
import path from 'path';
import { logger } from '@/utils';

export const workerRadarProcess = async () => {
  try {
    // Run the radar check in a separate process to prevent blocking
    const radarProcess = spawn('node', ['-e', `
        require('${path.join(process.cwd(), 'src/services/siata-radar.service.js')}')
          .checkAndSaveRadarImage()
          .catch(console.error);
      `], {
      detached: true,
      stdio: 'inherit'
    });

    // Detach the process so it runs independently
    radarProcess.unref();
  } catch (error) {
    logger.error('Error spawning radar image process:', error);
  }
}
