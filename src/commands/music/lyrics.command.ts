import { CommandInteraction, EmbedBuilder, SlashCommandOptionsOnlyBuilder, SlashCommandStringOption } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { GuildQueue, GuildQueueTimeline, LrcSearchResult, useQueue, useTimeline } from 'discord-player';
import { Botrucho, IGuildData } from '@/mongodb';
import { ICommand, LyricsKeys, PlayerType, TranslationElement } from '@/types';
import { Error, Success, Warning } from '@/utils';

export default class LyricsCommand extends ICommand {
  name = 'lyrics';
  description = 'Get the lyrics of the current song.';
  data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Get the lyrics of the current song.')
    .addStringOption((song: SlashCommandStringOption) => song
      .setName('song')
      .setDescription('Enter the song name to get the lyrics.')
    );

  async execute(interaction: CommandInteraction & { client: Botrucho }, guildDB: IGuildData): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    if (!interaction.isChatInputCommand()) return;

    const {
      NO_QUEUE,
      NOT_FOUND,
      SYNCED_LYRICS
    }: TranslationElement<LyricsKeys> = interaction.translate('LYRICS', guildDB.lang);

    const { client } = interaction;
    await interaction.deferReply();
    const queue: GuildQueue<PlayerType> | null = useQueue();
    const timeline: GuildQueueTimeline | null = useTimeline({ node: interaction.guildId });
    let song_name: string | null = interaction.options.getString('song');
    if (!song_name) {
      if (!timeline?.track?.title) {
        await interaction.editReply({ embeds: [Error({ description: NO_QUEUE })] });
        return;
      }
      song_name = timeline.track.title;
    }

    const lyrics: LrcSearchResult[] = await client.player.lyrics.search({
      q: song_name
    });

    const filteredLyrics: LrcSearchResult | undefined = lyrics.find((lyr: LrcSearchResult) => song_name.includes(lyr.trackName));
    if (!filteredLyrics) {
      await interaction.editReply({ embeds: [Warning({ description: NOT_FOUND })] });
      return;
    }

    if (filteredLyrics.syncedLyrics && queue && timeline && timeline.timestamp && timeline.timestamp.current && timeline.timestamp.total) {
      let fullLyrics = '';
      const syncedLyrics = queue.syncedLyrics(filteredLyrics);
      const currentTimestamp: number = timeline.timestamp.current.value;
      const totalTimestamp: number = timeline.timestamp.total.value;
      syncedLyrics.at(currentTimestamp);
      syncedLyrics.onChange((lyrics: string, timestamp: number) => {
        fullLyrics = (fullLyrics + `\n${lyrics}`).substring(0, 1997);
        const percent = Math.round((timestamp / totalTimestamp) * 100);
        const progress = Math.round((timestamp / totalTimestamp) * 20);
        const embed = {
          title: SYNCED_LYRICS,
          description: fullLyrics.length === 1997 ? `${fullLyrics}...` : fullLyrics,
          footer: {
            text: `${percent}% [${'#'.repeat(progress)}${'-'.repeat(20 - progress)}]`
          }
        }
        interaction.editReply({ embeds: [Success(embed)] });
      });
      syncedLyrics.subscribe();
      syncedLyrics.onUnsubscribe(() => {
        client.deleted_messages.add(interaction);
      });
    } else {
      const trimmedLyrics: string = filteredLyrics.plainLyrics.substring(0, 1997);

      const embed: EmbedBuilder = new EmbedBuilder()
        .setTitle(`${filteredLyrics.trackName ? filteredLyrics.trackName + ' - ' + filteredLyrics.artistName : song_name}`)
        .setAuthor({ name: filteredLyrics.artistName })
        .setDescription(trimmedLyrics.length === 1997 ? `${trimmedLyrics}...` : trimmedLyrics);

      await interaction.editReply({ embeds: [Success(embed.toJSON())] });
    }
  }
}
