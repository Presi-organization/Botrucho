import fs from 'fs';
import path from 'path';
import https from 'https';
import { logger } from '@/utils';

const RADAR_URL = 'https://siata.gov.co/kml/00_Radar/Ultimo_Barrido/AreaMetRadar_10_120_DBZH.png';
const RADAR_DIR: string = path.join(process.cwd(), '/assets/siata/radar_history/');
const LATEST_DIR: string = path.join(process.cwd(), '/assets/siata/');
const MAX_IMAGES = 10;

// Function to fetch headers
function fetchHeaders(url: string): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    https.get(url, { method: 'HEAD' }, (res) => {
      resolve(res.headers as Record<string, string>);
    }).on('error', reject).end();
  });
}

// Function to download a file
function downloadFile(url: string, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(filePath);
    https.get(url, (res) => {
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {
        logger.error(`Failed to download file: ${err.message}`);
      });
      reject(err);
    });
  });
}

export async function checkAndSaveRadarImage(): Promise<void> {
  try {
    // Ensure directory exists
    await fs.promises.mkdir(RADAR_DIR, { recursive: true });
    await fs.promises.mkdir(LATEST_DIR, { recursive: true });

    // Get last modified date from headers
    const headers = await fetchHeaders(RADAR_URL);
    const lastModified = headers['last-modified'];

    if (!lastModified) {
      logger.error('Could not retrieve Last-Modified header');
      return;
    }

    // Convert to timestamp for comparison and filename
    const date = new Date(lastModified);
    const timestamp = date.getTime();
    const filename = `radar_${timestamp}.png`;
    const filePath = path.join(RADAR_DIR, filename);
    const latestFilePath = path.join(LATEST_DIR, 'radar.png');

    // Check if we already have this version
    const existingFiles = await fs.promises.readdir(RADAR_DIR);
    if (existingFiles.includes(filename)) {
      logger.debug('Radar image already saved, skipping download');
      return;
    }

    // Download the image
    await downloadFile(RADAR_URL, filePath);
    logger.debug(`Saved new radar image: ${filename}`);

    // Copy the latest image to LATEST_DIR
    await fs.promises.copyFile(filePath, latestFilePath);
    logger.debug('Updated latest radar image');

    // Maintain max 10 files (delete oldest if needed)
    if (existingFiles.length >= MAX_IMAGES) {
      const oldestFiles = existingFiles
        .filter(file => file.startsWith('radar_'))
        .map(file => ({
          name: file,
          time: parseInt(file.replace('radar_', '').replace('.png', ''), 10)
        }))
        .sort((a, b) => a.time - b.time);

      // Delete oldest files to maintain max count
      while (oldestFiles.length >= MAX_IMAGES) {
        const oldestFile = oldestFiles.shift();
        if (oldestFile) {
          await fs.promises.unlink(path.join(RADAR_DIR, oldestFile.name));
          logger.debug(`Deleted old radar image: ${oldestFile.name}`);
        }
      }
    }
  } catch (error) {
    logger.error('Error checking/saving radar image:', error);
  }
}
