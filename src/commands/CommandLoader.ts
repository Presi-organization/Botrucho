import fs from 'node:fs';
import util from 'util';
import { GuildQueueEvents } from 'discord-player';
import { Routes } from 'discord-api-types/v10';
import { REST } from '@discordjs/rest';
import { Botrucho } from '@/mongodb';
import { logger } from '@/utils';

import config from '@/config';

const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);

class CommandLoader {
  private readonly client: Botrucho;

  constructor(client: Botrucho) {
    this.client = client;
  }

  async loadCommands() {
    const categories: string[] = (await Promise.all(
      (await readdir(__dirname)).map(async (category) => {
        const categoryPath = `${__dirname}/${category}`;
        const stats = await stat(categoryPath);
        return stats.isDirectory() ? category : null;
      })
    )).filter(Boolean) as string[];
    logger.log(`[Commands] ${categories.length} Categories loaded.`, categories);
    const commands: unknown[] = [];
    for (const category of categories) {
      for (const command_file of (await readdir(`${__dirname}/${category}/`)).filter(e => 'js' === e.split('.').pop())) {
        const command = (await import(`${__dirname}/${category}/${command_file}`));
        this.client.commands.set(command.name, command);
        commands.push(command.data.toJSON());
      }
    }

    const rest: REST = new REST({ version: '10' }).setToken(config.token);

    rest.put(Routes.applicationCommands(config.discord_client), { body: commands })
      .then(() => logger.log('[Commands] Successfully registered application commands.'))
      .catch(logger.error);

    const discord_events: string[] = (await readdir(`${__dirname}/../events/discord`)).filter(e => e.endsWith('.js'));
    for (const discord_event of discord_events) {
      const event_name: string = discord_event.split('.')[0];
      const { execute } = await import(`${__dirname}/../events/discord/${discord_event}`);
      this.client.on(event_name, (...e: unknown[]) => execute(this.client, ...e));
    }
    logger.log(`[Discord Events] ${discord_events.length} Discord events loaded.`, discord_events);

    const player_events: string[] = (await readdir(`${__dirname}/../events/player`)).filter(e => e.endsWith('.js'));
    for (const player_event of player_events) {
      const player_event_name: string = player_event.split('.')[0];
      const { execute } = await import(`${__dirname}/../events/player/${player_event}`);
      this.client.player.events.on(player_event_name as keyof GuildQueueEvents, (...e: unknown[]) => execute(this.client, ...e));
    }
    logger.log(`[Player Events] ${player_events.length} Player events loaded.`, player_events);
  }
}

export default CommandLoader;
