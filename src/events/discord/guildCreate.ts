import { Guild } from "discord.js";
import Botrucho from "@mongodb/base/Botrucho";
import { logger } from '@util/Logger';

export async function execute(client: Botrucho, guild: Guild) {
  const allowedServers: string[] = ['775108414560534588', '381983499005067264'];
  if (!allowedServers.includes(guild.id)) {
    logger.log(`Joined an unauthorized server: ${guild.name} (${guild.id}). Leaving...`);
    guild.leave()
      .then(() => logger.log(`Left server: ${guild.name}`))
      .catch((error: any) => logger.error(`Error leaving server: ${error.message}`));
  } else {
    logger.log(`Joined an authorized server: ${guild.name}`);
  }
}
