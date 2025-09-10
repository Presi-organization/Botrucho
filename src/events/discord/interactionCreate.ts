import { Interaction } from 'discord.js';
import { Botrucho, IGuildData } from '@/mongodb';
import {
  AddMetadataFieldHandler,
  AutocompleteHandler,
  CalendarEventHandler,
  CommandHandler,
  CronAddMetadataFieldSelectHandler,
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
      new AddMetadataFieldHandler(client),
      new EditCronHandler(client),

      // Selection handlers
      new CronAddMetadataFieldSelectHandler(client),
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
