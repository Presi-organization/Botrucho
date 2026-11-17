import { Guild } from 'discord.js';

import { allowedGuildIds } from '@/config/allowed-guilds';
import { Botrucho } from '@/mongodb';
import { DeleteKeys, TranslationElement } from '@/types';
import { logger } from '@/utils';

export async function execute(client: Botrucho, guild: Guild) {
  if (allowedGuildIds.includes(guild.id)) {
    logger.log(`Joined an authorized server: ${guild.name}`);
    return;
  }

  logger.log(`Joined an unauthorized server: ${guild.name} (${guild.id}). Leaving...`);

  try {
    const { UNAUTHORIZED }: TranslationElement<DeleteKeys> = await guild.translate(
      'DELETE',
      client.guildData,
    );
    const owner = await guild.fetchOwner();
    await owner.send(UNAUTHORIZED);
  } catch {
    logger.log('Could not dm owner');
  }

  await guild
    .leave()
    .then(() => logger.log(`Left server: ${guild.name}`))
    .catch((error) => logger.error(`Error leaving server: ${error.message}`));
}
