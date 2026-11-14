import { SlashCommandBuilder } from '@discordjs/builders';
import { GuildQueue, useQueue } from 'discord-player';
import { EmbedBuilder, SlashCommandOptionsOnlyBuilder } from 'discord.js';

import { IGuildData } from '@/mongodb';
import {
  ICommand,
  CommandInteractionWithClient,
  MusicKeys,
  PlayerType,
  ResumeKeys,
  TranslationElement,
} from '@/types';
import { Error, Success, Warning } from '@/utils';

export default class ResumeCommand extends ICommand {
  name = 'resume';
  description = 'Resume the paused track.';
  cat = 'music';
  botpermissions: string[] = ['CONNECT', 'SPEAK'];
  data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the paused track.');

  async execute(interaction: CommandInteractionWithClient, guildDB: IGuildData): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    if (!interaction.isChatInputCommand()) return;

    const { client } = interaction;
    const { RESUMED_TITLE, RESUMED_DESC, NOT_PAUSED }: TranslationElement<ResumeKeys> =
      interaction.translate('RESUME', guildDB.lang);
    const { NOT_PLAYING_TITLE, NOT_PLAYING_DESC }: TranslationElement<MusicKeys> =
      interaction.translate('MUSIC', guildDB.lang);

    await interaction.deferReply();

    const queue: GuildQueue<PlayerType> | null = useQueue(interaction.guildId);
    const author = {
      name: interaction.guild.name,
      iconURL: interaction.guild.iconURL() ?? undefined,
    };

    if (!queue?.currentTrack) {
      const embed: EmbedBuilder = Error({
        title: NOT_PLAYING_TITLE,
        description: NOT_PLAYING_DESC,
        author,
      });

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (!queue.node.isPaused()) {
      const embed: EmbedBuilder = Warning({ description: NOT_PAUSED, author });

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    queue.node.resume();

    const embed: EmbedBuilder = Success({
      title: RESUMED_TITLE,
      description: RESUMED_DESC,
      author,
    });

    client.deleted_messages.add(interaction);
    await interaction.editReply({ embeds: [embed] });
  }
}
