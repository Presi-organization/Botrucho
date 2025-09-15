import { Interaction } from 'discord.js';
import { Botrucho, IGuildData } from '@/mongodb';
import {
  AutocompleteHandler,
  CalendarEventHandler,
  CommandHandler,
  CronEditSelectHandler,
  EditCronHandler,
  IIntCreateHandler,
  RetryModalHandler
} from '@/events/discord/interactionCreateHandlers';

module.exports = {
  async execute(client: Botrucho, interaction: Interaction): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const guildDB: IGuildData = await interaction.guild.fetchDB(client.guildData);

    const interactionHandlers: IIntCreateHandler[] = [
      // Command handlers
      new CommandHandler(client, guildDB),

      // Autocomplete handlers
      new AutocompleteHandler(client),

      // Button handlers
      new RetryModalHandler(client),

      // Edit handlers
      new EditCronHandler(client),

      // Selection handlers
      new CronEditSelectHandler(client),

      // Event handlers
      new CalendarEventHandler(client, guildDB),
    ];

    for (const handler of interactionHandlers) {
      const handled: boolean = await handler.handle(interaction);
      if (handled) break;
    }
  }
};
