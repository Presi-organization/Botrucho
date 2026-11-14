import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  SlashCommandChannelOption,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';

import { CommandInteractionWithClient, ICommand } from '@/types';
import { Success, Warning } from '@/utils';

export default class FootballDailyCommand extends ICommand {
  name = 'football-daily';
  description = 'Daily matches post for this server';
  data: SlashCommandSubcommandsOnlyBuilder = new SlashCommandBuilder()
    .setName('football-daily')
    .setDescription('Daily matches post for this server')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('set-channel')
        .setDescription('Post today’s matches in a channel every morning')
        .addChannelOption((option: SlashCommandChannelOption) =>
          option
            .setName('channel')
            .setDescription('Channel for the daily post')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('off').setDescription('Stop the daily matches post'),
    );

  async execute(interaction: CommandInteractionWithClient): Promise<void> {
    if (!interaction.inCachedGuild() || !interaction.isChatInputCommand()) return;

    if (interaction.options.getSubcommand() === 'off') {
      await interaction.client.guildData.setFootballChannel(interaction.guildId, null);
      await interaction.reply({
        embeds: [Success({ description: 'The daily matches post is now off.' })],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const channel = interaction.options.getChannel('channel', true, [
      ChannelType.GuildText,
      ChannelType.GuildAnnouncement,
    ]);
    const me = interaction.guild.members.me;
    const canSend = me
      ? channel
          .permissionsFor(me)
          .has([
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks,
          ])
      : false;

    if (!canSend) {
      await interaction.reply({
        embeds: [
          Warning({
            description: `I can't send embeds in ${channel}. Give me View Channel, Send Messages and Embed Links there and try again.`,
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.client.guildData.setFootballChannel(interaction.guildId, channel.id);
    await interaction.reply({
      embeds: [
        Success({ description: `Today's matches will be posted in ${channel} every morning.` }),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }
}
