import { GuildQueue } from 'discord-player';

import { Botrucho } from '@/mongodb';
import { PlayerType } from '@/types';
import { logger } from '@/utils';

export async function execute(_client: Botrucho, queue: GuildQueue<PlayerType>, error: Error) {
  const guildName = queue?.guild?.name ?? 'Unknown';
  logger.error(`[Player Error] [${guildName}]`, error.message);
  if (error.stack) {
    logger.error('[Player Error] Stack:', error.stack);
  }
}
