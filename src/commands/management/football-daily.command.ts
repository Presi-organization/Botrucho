import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  SlashCommandChannelOption,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';

import { IGuildData } from '@/mongodb';
import { CommandInteractionWithClient, FootballKeys, ICommand, TranslationElement } from '@/types';
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

  async execute(interaction: CommandInteractionWithClient, guildDB: IGuildData): Promise<void> {
    if (!interaction.inCachedGuild() || !interaction.isChatInputCommand()) return;

    const texts: TranslationElement<FootballKeys> = interaction.translate('FOOTBALL', guildDB.lang);

    if (interaction.options.getSubcommand() === 'off') {
      await interaction.client.guildData.setFootballChannel(interaction.guildId, null);
      await interaction.reply({
        embeds: [Success({ description: texts.DAILY_OFF })],
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
            description: texts.DAILY_NO_PERMS.replace('${channel}', `${channel}`),
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.client.guildData.setFootballChannel(interaction.guildId, channel.id);
    await interaction.reply({
      embeds: [Success({ description: texts.DAILY_SET.replace('${channel}', `${channel}`) })],
      flags: MessageFlags.Ephemeral,
    });
  }
}
