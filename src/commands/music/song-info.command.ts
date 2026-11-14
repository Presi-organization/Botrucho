import { SlashCommandBuilder } from '@discordjs/builders';
import { GuildQueue, QueueRepeatMode, Track, useQueue } from 'discord-player';
import { APIEmbedField, EmbedBuilder, SlashCommandOptionsOnlyBuilder } from 'discord.js';

import { IGuildData } from '@/mongodb';
import {
  ICommand,
  CommandInteractionWithClient,
  MusicKeys,
  PlayerType,
  SongInfoKeys,
  TranslationElement,
} from '@/types';
import { Error, Info } from '@/utils';

export default class SongInfoCommand extends ICommand {
  name = 'song-info';
  description = 'Show detailed information about the current track.';
  cat = 'music';
  botpermissions: string[] = ['CONNECT', 'SPEAK'];
  data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('song-info')
    .setDescription('Show detailed information about the current track.');

  async execute(interaction: CommandInteractionWithClient, guildDB: IGuildData): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    if (!interaction.isChatInputCommand()) return;

    const { client } = interaction;
    const t: TranslationElement<SongInfoKeys> = interaction.translate('SONG_INFO', guildDB.lang);
    const { NOT_PLAYING_TITLE, NOT_PLAYING_DESC }: TranslationElement<MusicKeys> =
      interaction.translate('MUSIC', guildDB.lang);

    await interaction.deferReply();

    const queue: GuildQueue<PlayerType> | null = useQueue(interaction.guildId);
    const author = {
      name: interaction.guild.name,
      iconURL: interaction.guild.iconURL() ?? undefined,
    };

    const track: Track | undefined = queue?.currentTrack ?? undefined;

    if (!queue || !track) {
      const embed: EmbedBuilder = Error({
        title: NOT_PLAYING_TITLE,
        description: NOT_PLAYING_DESC,
        author,
      });

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const loopLabels: Record<number, string> = {
      [QueueRepeatMode.TRACK]: t.LOOP_TRACK,
      [QueueRepeatMode.QUEUE]: t.LOOP_QUEUE,
    };
    const timestamp = queue.node.getTimestamp();
    const progressBar = queue.node.createProgressBar();

    const fields: APIEmbedField[] = [
      { name: t.ARTIST, value: track.author, inline: true },
      { name: t.DURATION, value: track.duration, inline: true },
      { name: t.SOURCE, value: track.source, inline: true },
    ];

    if (track.views > 0) {
      fields.push({ name: t.VIEWS, value: track.views.toLocaleString('en-US'), inline: true });
    }

    fields.push(
      { name: t.STATUS, value: queue.node.isPaused() ? t.PAUSED : t.PLAYING, inline: true },
      { name: t.LOOP, value: loopLabels[queue.repeatMode] ?? t.LOOP_OFF, inline: true },
      { name: t.TRACKS_LEFT, value: queue.tracks.size.toString(), inline: true },
    );

    if (progressBar) {
      const elapsed = timestamp ? `${timestamp.current.label} / ${timestamp.total.label}\n` : '';
      fields.push({ name: t.PROGRESS, value: `${elapsed}${progressBar}` });
    }

    const embed: EmbedBuilder = Info({
      title: track.title,
      url: track.url,
      fields,
      author,
    });

    if (
      typeof track.thumbnail === 'string' &&
      URL.canParse(track.thumbnail) &&
      ['http:', 'https:'].includes(new URL(track.thumbnail).protocol)
    ) {
      embed.setThumbnail(track.thumbnail);
    }

    if (track.requestedBy) {
      embed.setFooter({
        text: t.REQUESTED_BY.replace('${username}', track.requestedBy.displayName),
        iconURL: track.requestedBy.displayAvatarURL(),
      });
    }

    client.deleted_messages.add(interaction);
    await interaction.editReply({ embeds: [embed] });
  }
}
