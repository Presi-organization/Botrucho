import { Guild } from 'discord.js';
import { GuildQueue, Track } from 'discord-player';
import { Botrucho, IGuildData } from '@/mongodb';
import { PlayerKeys, PlayerType, TranslationElement } from '@/types';
import { logger, updateQueueMessage } from '@/utils';

export async function execute(client: Botrucho, queue: GuildQueue<PlayerType>, track: Track): Promise<void> {
  logger.log(`Started playing **${track.title}**!`);
  const guild: Guild | null = queue.metadata.message.guild;
  if (!guild) throw new Error('Guild is undefined in queue metadata message.');
  const guildDB: IGuildData | null = await client.guildData.showGuild(guild.id);
  const langDB = guildDB?.lang || 'en';
  const playerTranslate: TranslationElement<PlayerKeys> = queue.metadata.message.translate('PLAYER', langDB);
  await updateQueueMessage(queue, track, playerTranslate);
}
