import { Guild } from 'discord.js';

import { allowedGuildIds } from '@/config/allowed-guilds';
import { Botrucho } from '@/mongodb';
import { DeleteKeys, TranslationElement } from '@/types';
import { logger } from '@/utils';

export async function execute(client: Botrucho, guild: Guild) {
  logger.log(`Left guild: ${guild.name} (${guild.id})`);
  if (!allowedGuildIds.includes(guild.id)) return;

  const { LEAVE }: TranslationElement<DeleteKeys> = await guild.translate(
    'DELETE',
    client.guildData,
  );
  await guild
    .fetchOwner()
    .then((o) => {
      const user = client.users.cache.get(o.id);
      if (user) {
        user.send(LEAVE);
      } else {
        logger.log('Could not find the user in cache');
      }
    })
    .catch(() => logger.log('Could not dm owner'));
}
