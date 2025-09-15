import { BaseInteraction, EmbedBuilder, Guild, MessageFlags } from 'discord.js';
import { IIntCreateHandler } from '@/events/discord/interactionCreateHandlers';
import { Botrucho, IGuildData } from '@/mongodb';
import { ICommand, MiscKeys, ToggleCommandKeys, TranslationElement } from '@/types';
import { Error, logger } from '@/utils';

export class CommandHandler implements IIntCreateHandler {
  private client: Botrucho;
  private readonly guildDB: IGuildData;

  constructor(client: Botrucho, guildDB: IGuildData) {
    this.client = client;
    this.guildDB = guildDB;
  }

  handle = async (interaction: BaseInteraction): Promise<boolean> => {
    if (!interaction.isCommand()) return false;
    const command: ICommand | undefined = this.client.commands.get(interaction.commandName);
    if (!command) return false;

    if (this.guildDB.disabledCommands?.includes(command.name)) {
      const { COMMAND_DISABLED }: TranslationElement<MiscKeys> = interaction.translate('MISC', this.guildDB.lang);
      const { DISABLED }: TranslationElement<ToggleCommandKeys> = interaction.translate('TOGGLE_COMMAND', this.guildDB.lang);
      const embedError: EmbedBuilder = Error({
        title: COMMAND_DISABLED,
        description: DISABLED.replace('${command}', command.name)
      });
      await interaction.reply({ embeds: [embedError], flags: MessageFlags.Ephemeral });
      return true;
    }

    try {
      await this.client.player.context.provide({ guild: interaction?.guild as Guild }, async () => await command.execute(interaction, this.guildDB));
    } catch (error: unknown) {
      logger.error(error);
      const { ERROR }: TranslationElement<MiscKeys> = interaction.translate('MISC', this.guildDB.lang);
      const description: string = error instanceof globalThis.Error ? error.message : String(error ?? 'Unknown error');
      const embedError: EmbedBuilder = Error({ title: ERROR, description });
      await interaction.editReply({ embeds: [embedError] });
    }
    return true;
  }
}
