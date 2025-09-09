import { EmbedBuilder, MessageFlags, SlashCommandIntegerOption, SlashCommandOptionsOnlyBuilder } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { GuildQueueTimeline, useTimeline } from 'discord-player';
import { IGuildData } from '@/mongodb';
import { ICommand, CommandInteractionWithClient, MusicKeys, TranslationElement, VolumeKeys } from '@/types';
import { Error, Success } from '@/utils';

export default class VolumeCommand extends ICommand {
  name = 'volume';
  description = 'Changes the Volume';
  permissions = false;
  aliases: string[] = ['sound', 'v', 'vol'];
  cat = 'music';
  example = '70';
  botpermissions: string[] = ['CONNECT', 'SPEAK'];
  data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Changes the Volume')
    .addIntegerOption((option: SlashCommandIntegerOption) => option.setName('gain').setDescription('The new volume you want me to set to [1-200]').setRequired(false));

  async execute(interaction: CommandInteractionWithClient, guildDB: IGuildData): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    if (!interaction.isChatInputCommand()) return;

    const {
      CURRENT_VOLUME_TITLE,
      CURRENT_VOLUME_DESC,
      VOLUME_CHANGED_TITLE,
      VOLUME_CHANGED_DESC
    }: TranslationElement<VolumeKeys> = interaction.translate('VOLUME', guildDB.lang);
    const {
      NOT_PLAYING_TITLE,
      NOT_PLAYING_DESC
    }: TranslationElement<MusicKeys> = interaction.translate('MUSIC', guildDB.lang)

    const { client } = interaction;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const timeline: GuildQueueTimeline | null = useTimeline({ node: interaction.guildId });

    if (!timeline?.track) {
      const embed: EmbedBuilder = Error({
        title: NOT_PLAYING_TITLE,
        description: NOT_PLAYING_DESC,
        author: {
          name: interaction.guild.name,
          icon_url: interaction.guild.iconURL() ?? undefined
        }
      });
      client.deleted_messages.add(interaction);
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const amount: number | null = interaction.options.getInteger('gain');

    let embed;
    if (amount != null) {
      timeline.setVolume(amount);

      embed = Success({
        title: VOLUME_CHANGED_TITLE,
        description: VOLUME_CHANGED_DESC.replace('${gain}', amount.toString()),
        author: {
          name: interaction.guild.name,
          icon_url: interaction.guild.iconURL() ?? undefined
        }
      });
    } else {
      embed = Success({
        title: CURRENT_VOLUME_TITLE,
        description: CURRENT_VOLUME_DESC.replace('${gain}', timeline.volume.toString()),
        author: {
          name: interaction.guild.name,
          icon_url: interaction.guild.iconURL() ?? undefined
        }
      });
    }

    client.deleted_messages.add(interaction);
    await interaction.editReply({ embeds: [embed] });
  }
}
