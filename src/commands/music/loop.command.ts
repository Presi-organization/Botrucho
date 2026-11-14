import { SlashCommandBuilder } from '@discordjs/builders';
import { GuildQueue, QueueRepeatMode, useQueue } from 'discord-player';
import { EmbedBuilder, SlashCommandOptionsOnlyBuilder, SlashCommandStringOption } from 'discord.js';

import { IGuildData } from '@/mongodb';
import {
  ICommand,
  CommandInteractionWithClient,
  LoopKeys,
  MusicKeys,
  PlayerType,
  TranslationElement,
} from '@/types';
import { Error, Success } from '@/utils';

type LoopMode = 'OFF' | 'TRACK' | 'QUEUE';

export default class LoopCommand extends ICommand {
  name = 'loop';
  description = 'Repeat the current track or the whole queue.';
  cat = 'music';
  example = 'track';
  botpermissions: string[] = ['CONNECT', 'SPEAK'];
  data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Repeat the current track or the whole queue.')
    .addStringOption((option: SlashCommandStringOption) =>
      option
        .setName('mode')
        .setDescription('What to repeat')
        .setRequired(true)
        .addChoices(
          { name: 'off', value: 'OFF' },
          { name: 'track', value: 'TRACK' },
          { name: 'queue', value: 'QUEUE' },
        ),
    );

  async execute(interaction: CommandInteractionWithClient, guildDB: IGuildData): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    if (!interaction.isChatInputCommand()) return;

    const { client } = interaction;
    const { LOOP_TITLE, LOOP_OFF, LOOP_TRACK, LOOP_QUEUE }: TranslationElement<LoopKeys> =
      interaction.translate('LOOP', guildDB.lang);
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

    const mode = interaction.options.getString('mode', true) as LoopMode;
    queue.setRepeatMode(QueueRepeatMode[mode]);

    const descriptions: Record<LoopMode, string> = {
      OFF: LOOP_OFF,
      TRACK: LOOP_TRACK,
      QUEUE: LOOP_QUEUE,
    };

    const embed: EmbedBuilder = Success({
      title: LOOP_TITLE,
      description: descriptions[mode],
      author,
    });

    client.deleted_messages.add(interaction);
    await interaction.editReply({ embeds: [embed] });
  }
}
