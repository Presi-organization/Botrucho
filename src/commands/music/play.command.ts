import {
  CommandInteraction,
  MessageFlags,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandStringOption,
  VoiceBasedChannel
} from 'discord.js';
import { Player, QueueRepeatMode, SearchResult, useMainPlayer } from 'discord-player';
import { SlashCommandBuilder } from '@discordjs/builders';
import { IGuildData } from '@/mongodb';
import { ICommand, PlayKeys, TranslationElement, VCKeys } from '@/types';
import { Error, logger, Success, Warning } from '@/utils';

export default class PlayCommand extends ICommand {
  name = 'play';
  description = 'Plays a music in your voice channel.';
  cat = 'music';
  botpermissions: string[] = ['CONNECT', 'SPEAK'];
  data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('play')
    .setDescription('Plays a music in your voice channel.')
    .addStringOption((option: SlashCommandStringOption) => option.setName('song').setDescription('The name of the song.').setRequired(true));

  async execute(interaction: CommandInteraction, guildDB: IGuildData): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    if (!interaction.isChatInputCommand()) return;

    const {
      NO_RESULTS_TITLE,
      NO_RESULTS_DESC,
      ADDED_2_QUEUE_TITLE,
      ADDED_2_QUEUE_DESC
    }: TranslationElement<PlayKeys> = interaction.translate('PLAY', guildDB.lang);
    const { CONNECT_VC }: TranslationElement<VCKeys> = interaction.translate('VC', guildDB.lang);

    const player: Player = useMainPlayer();
    const channel: VoiceBasedChannel | null = interaction.member.voice?.channel ?? null;
    const name: string = interaction.options.getString('song', true);

    if (!channel) {
      await interaction.reply({ embeds: [Warning({ description: CONNECT_VC })] });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const searchResult: SearchResult = await player.search(name, { requestedBy: interaction.user });

    if (!searchResult.hasTracks()) {
      const embed = {
        title: NO_RESULTS_TITLE,
        description: NO_RESULTS_DESC.replace('${songName}', name),
        author: {
          name: interaction.guild.name,
          icon_url: interaction.guild.iconURL() ?? undefined
        }
      };

      await interaction.editReply({ embeds: [Error(embed)] });
      return;
    }

    const description = ADDED_2_QUEUE_DESC
      .replace('${songName}', `${searchResult.tracks[0].title} - ${searchResult.tracks[0].author}`)
      .replace('${songUrl}', searchResult.tracks[0].url);

    const embed = {
      title: ADDED_2_QUEUE_TITLE,
      description: description
    };

    await interaction.editReply({ embeds: [Success(embed)] });
    setTimeout(() => {
      interaction.deleteReply();
    }, 5000);

    try {
      await player.play(channel, searchResult, {
        nodeOptions: {
          metadata: {
            channel: interaction.channel,
            queueMessage: null,
            currentTrack: undefined,
            queueTitles: [],
            message: interaction,
          },
          volume: guildDB.defaultVolume,
          repeatMode: QueueRepeatMode[guildDB.loopMode as keyof typeof QueueRepeatMode],
          noEmitInsert: true,
          leaveOnStop: false,
          leaveOnEmpty: true,
          leaveOnEmptyCooldown: 30000,
          leaveOnEnd: true,
          leaveOnEndCooldown: 30000,
          pauseOnEmpty: true,
          preferBridgedMetadata: true,
          disableBiquad: true
        },
        requestedBy: interaction.user,
        connectionOptions: {
          deaf: true,
        }
      });
    } catch (e) {
      logger.log(`Something went wrong: ${e}`);
    }
  }
}
