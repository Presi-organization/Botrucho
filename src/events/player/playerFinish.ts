import { promises as fs, unlinkSync } from 'node:fs';
import { join } from 'path';

import { GuildQueue, QueueRepeatMode, Track } from 'discord-player';

import { Botrucho } from '@/mongodb';
import { PlayerType } from '@/types';
import { logger } from '@/utils';

export async function execute(
  _: Botrucho,
  queue: GuildQueue<PlayerType>,
  track: Track,
): Promise<void> {
  logger.log(`Track: ${track.title} finished playing!`);
  const queueEnded: boolean = queue.tracks.size === 0 && queue.repeatMode === QueueRepeatMode.OFF;
  if (queueEnded && queue.metadata.queueMessage) {
    logger.log(`Removing queue message after ${track.title} (tracks left: ${queue.tracks.size})`);
    const message = queue.metadata.queueMessage;
    queue.metadata.queueMessage = null;
    queue.metadata.currentTrack = undefined;
    await message.delete().catch((): void => undefined);
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
