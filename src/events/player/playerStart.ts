import { GuildQueue, Track } from "discord-player";
import Botrucho from "@mongodb/base/Botrucho";
import { updateQueueMessage } from "@util/embedUtils";
import { PlayerMetadata } from "@customTypes/PlayerMetadata";
import { IGuildData } from "@mongodb/models/GuildData";
import { PlayerKeys, TranslationElement } from "@customTypes/Translations";
import { logger } from '@util/Logger';

export async function execute(client: Botrucho, queue: GuildQueue<PlayerMetadata>, track: Track): Promise<void> {
  logger.log(`Started playing **${track.title}**!`);
  const guildDB: IGuildData | null = await client.guildData.showGuild(queue.metadata.message.guild!.id);
  const langDB = guildDB?.lang || 'en';
  const playerTranslate: TranslationElement<PlayerKeys> = queue.metadata.message.translate("PLAYER", langDB);
  await updateQueueMessage(queue, track, playerTranslate);
}
