import { GuildQueue, Track } from 'discord-player';
import { Botrucho, IGuildData } from '@/mongodb';
import { PlayerKeys, PlayerType, TranslationElement } from '@/types';
import { logger, updateQueueMessage } from '@/utils';

export async function execute(client: Botrucho, queue: GuildQueue<PlayerType>, addedTracks: Track[]): Promise<void> {
  logger.log(`Added to queue **${addedTracks.length}** songs from playlist!`);
  queue.metadata.queueTitles = queue.tracks.data.map(track => `[${track.title} - ${track.author}](${track.url})`);
  const [firstTrack] = addedTracks;
  const guildId: string | undefined = queue.metadata.message.guild?.id;
  const guildDB: IGuildData | null = guildId ? await client.guildData.showGuild(guildId) : null;
  const langDB: string = guildDB?.lang || 'en';
  const playerTranslate: TranslationElement<PlayerKeys> = queue.metadata.message.translate('PLAYER', langDB);
  await updateQueueMessage(queue, firstTrack, playerTranslate);
}
