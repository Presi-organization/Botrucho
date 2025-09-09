import { IIntCreateHandler } from '@/events/discord/interactionCreateHandlers';
import { Botrucho } from '@/mongodb';
import { ICommand } from '@/types';
import { BaseInteraction } from 'discord.js';

export class AutocompleteHandler implements IIntCreateHandler {
  private client: Botrucho;

  constructor(client: Botrucho) {
    this.client = client;
  }

  handle = async (interaction: BaseInteraction): Promise<boolean> => {
    if (!interaction.isAutocomplete()) return false;
    const command: ICommand | undefined = this.client.commands.get(interaction.commandName);
    if (!command) return false;
    if (!command.autocomplete) return false;
    await command.autocomplete(interaction);
    return true;
  }
}
