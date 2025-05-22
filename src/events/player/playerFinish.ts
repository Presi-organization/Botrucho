import { promises as fs, unlinkSync } from 'node:fs';
import { join } from 'path';
import { GuildQueue, Track } from 'discord-player';
import { Botrucho } from '@/mongodb';
import { PlayerType } from '@/types';
import { logger } from '@/utils';

export async function execute(_: Botrucho, queue: GuildQueue<PlayerType>, track: Track): Promise<void> {
  logger.log(`Track: ${track.title} finished playing!`);
  if (queue.metadata.queueTitles.length === 0) {
    if (queue.metadata.queueMessage) {
      await queue.metadata.queueMessage.delete();
      queue.metadata.queueMessage = null;
      queue.metadata.currentTrack = undefined;
    }
  }
  const audioFile: string = join(process.cwd(), '/discord/commands/say/voice_speech.wav');
  fs.access(audioFile)
    .then((): void => {
      unlinkSync(audioFile);
    })
    .catch((error): void => {
      if (error.code !== 'ENOENT') {
        logger.error('An error occurred:', error);
      }
    });
}
