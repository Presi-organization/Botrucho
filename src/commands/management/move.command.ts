import {
  ChannelType,
  CommandInteraction,
  GuildMember,
  MessageFlags,
  SlashCommandChannelOption,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandUserOption,
  VoiceChannel
} from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Botrucho, IGuildData } from '@/mongodb';
import { Success, Warning } from '@/utils';
import { ICommand, MoveKeys, TranslationElement, VCKeys } from '@/types';

export default class MoveCommand extends ICommand {
  name = 'move';
  description = 'Select a member and move them to another channel.';
  data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('move')
    .setDescription('Select a member and move them to another channel.')
    .addUserOption((option: SlashCommandUserOption) => option.setName('user').setDescription('The member to move').setRequired(true))
    .addChannelOption((option: SlashCommandChannelOption) => option.setName('channel').setDescription('The channel to move').addChannelTypes(ChannelType.GuildVoice).setRequired(true));

  async execute(interaction: CommandInteraction & { client: Botrucho }, guildDB: IGuildData): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    if (!interaction.isChatInputCommand()) return;

    const { client } = interaction;
    const { USER_MOVED }: TranslationElement<MoveKeys> = interaction.translate('MOVE', guildDB.lang);
    const { CONNECT_VC, USER_NOT_IN }: TranslationElement<VCKeys> = interaction.translate('VC', guildDB.lang);

    const user: GuildMember = interaction.options.getMember('user') as GuildMember;
    const channel: VoiceChannel = interaction.options.getChannel('channel', true, [ChannelType.GuildVoice]);

    if (!(interaction.member.voice.channel)) {
      await interaction.reply({
        embeds: [Warning({ description: CONNECT_VC })],
        flags: MessageFlags.Ephemeral
      });
    }
    if (!(user.voice.channelId)) {
      await interaction.reply({
        embeds: [Warning({ description: USER_NOT_IN })],
        flags: MessageFlags.Ephemeral
      });
    }

    await user.voice.setChannel(channel);
    const user_moved = USER_MOVED
      .replace('${username}', user.user.displayName)
      .replace('${channel}', channel.name);
    await interaction.reply({
      embeds: [Success({ description: user_moved })],
      flags: MessageFlags.Ephemeral
    });

    client.deleted_messages.add(interaction);
  }
}
