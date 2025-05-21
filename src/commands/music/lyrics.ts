import { CommandInteraction, EmbedBuilder, SlashCommandOptionsOnlyBuilder, SlashCommandStringOption } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { GuildQueue, GuildQueueTimeline, LrcSearchResult, useQueue, useTimeline } from "discord-player";
import Botrucho from "@/mongodb/base/Botrucho";
import { IGuildData } from "@/mongodb/models/GuildData";
import { PlayerMetadata } from "@/types/PlayerMetadata";
import { LyricsKeys, TranslationElement } from "@/types/Translations";
import { Error, Success, Warning } from "@/util/embedMessage";

export const name = 'lyrics';
export const data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
  .setName('lyrics')
  .setDescription('Get the lyrics of the current song.')
  .addStringOption((song: SlashCommandStringOption) => song
    .setName('song')
    .setDescription('Enter the song name to get the lyrics.')
  );

export async function execute(interaction: CommandInteraction & { client: Botrucho }, guildDB: IGuildData) {
  if (!interaction.inCachedGuild()) return;
  if (!interaction.isChatInputCommand()) return;

  const {
    NO_QUEUE,
    NOT_FOUND,
    SYNCED_LYRICS
  }: TranslationElement<LyricsKeys> = interaction.translate("LYRICS", guildDB.lang);

  const { client } = interaction;
  await interaction.deferReply();
  const queue: GuildQueue<PlayerMetadata> | null = useQueue();
  const timeline: GuildQueueTimeline | null = useTimeline({ node: interaction.guildId });
  let song_name: string | null = interaction.options.getString('song');
  if (!song_name) {
    if (!timeline) return interaction.editReply({ embeds: [Error({ description: NO_QUEUE })] });
    song_name = timeline!.track!.title;
  }

  const lyrics: LrcSearchResult[] = await client.player.lyrics.search({
    q: song_name
  });

  const filteredLyrics: LrcSearchResult | undefined = lyrics.find((lyr: LrcSearchResult) => song_name.includes(lyr.trackName));
  if (!filteredLyrics) return interaction.editReply({ embeds: [Warning({ description: NOT_FOUND })] });

  if (filteredLyrics.syncedLyrics && queue) {
    let fullLyrics: string = '';
    const syncedLyrics = queue.syncedLyrics(filteredLyrics);
    syncedLyrics.at(<number>timeline!.timestamp.current.value);
    syncedLyrics.onChange((lyrics: string, timestamp: number) => {
      fullLyrics = (fullLyrics + `\n${lyrics}`).substring(0, 1997);
      const embed = {
        title: SYNCED_LYRICS,
        description: fullLyrics.length === 1997 ? `${fullLyrics}...` : fullLyrics,
        footer: {
          text: `${Math.round((timestamp / timeline!.timestamp.total.value) * 100)}% [${'#'.repeat(Math.round((timestamp / timeline!.timestamp.total.value) * 20))}${'-'.repeat(20 - Math.round((timestamp / timeline!.timestamp.total.value) * 20))}]`
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
      .setTitle(`${filteredLyrics.trackName ? filteredLyrics.trackName + " - " + filteredLyrics.artistName : song_name}`)
      .setAuthor({ name: filteredLyrics.artistName })
      .setDescription(trimmedLyrics.length === 1997 ? `${trimmedLyrics}...` : trimmedLyrics);

    return interaction.editReply({ embeds: [Success(embed.toJSON())] });
  }
}
