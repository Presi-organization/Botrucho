import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';

import { IGuildData } from '@/mongodb';
import { CommandInteractionWithClient, ICommand } from '@/types';
import { buildAiSettingsPanel, Error, isAiOwner } from '@/utils';

export default class AiCommand extends ICommand {
  name = 'ai';
  description = 'Manage the @Botrucho AI assistant.';
  data: SlashCommandSubcommandsOnlyBuilder = new SlashCommandBuilder()
    .setName('ai')
    .setDescription('Manage the @Botrucho AI assistant.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand.setName('settings').setDescription('Show and edit the AI settings.'),
    );

  async execute(interaction: CommandInteractionWithClient, _guildDB: IGuildData): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    if (!isAiOwner(interaction)) {
      await interaction.reply({
        embeds: [Error({ description: 'Only bot owners can manage the AI.' })],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const panel = await buildAiSettingsPanel(interaction.client, interaction.guildId);
    await interaction.reply({ ...panel, flags: MessageFlags.Ephemeral });
  }
}
