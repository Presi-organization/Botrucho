import { MessageFlags, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder } from 'discord.js';

import { buildHelpGroups } from '@/commands/help-groups';
import config from '@/config';
import { IGuildData } from '@/mongodb';
import { CommandInteractionWithClient, HelpKeys, ICommand, TranslationElement } from '@/types';
import { Info } from '@/utils';

export default class HelpCommand extends ICommand {
  name = 'help';
  description = 'Show the commands available in this server';
  data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show the commands available in this server');

  async execute(interaction: CommandInteractionWithClient, guildDB: IGuildData): Promise<void> {
    const translations: TranslationElement<HelpKeys> = interaction.translate('HELP', guildDB.lang);
    const groups = buildHelpGroups(
      [...interaction.client.commands.values()],
      guildDB.disabledCommands,
      config.owners.includes(interaction.user.id),
    );

    await interaction.reply({
      embeds: [
        Info({
          title: translations.TITLE,
          fields: groups.map(({ group, lines }) => ({
            name: translations[group],
            value: lines.join('\n'),
          })),
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }
}
