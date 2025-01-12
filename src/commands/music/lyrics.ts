import { CommandInteraction, EmbedBuilder, SlashCommandOptionsOnlyBuilder, SlashCommandStringOption } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { GuildQueueTimeline, LrcSearchResult, useTimeline } from "discord-player";
import Botrucho from "@mongodb/base/Botrucho";
import { IGuildData } from "@mongodb/models/GuildData";
import { LyricsKeys, TranslationElement } from "@customTypes/Translations";

export const name = 'lyrics';
export const data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Get the lyrics of the current song.')
    .addStringOption((song: SlashCommandStringOption) => song.setName('song').setDescription('Enter the song name to get the lyrics.'));

export async function execute(interaction: CommandInteraction & { client: Botrucho }, guildDB: IGuildData) {
    if (!interaction.inCachedGuild()) return;
    if (!interaction.isChatInputCommand()) return;

    const { NO_QUEUE, NOT_FOUND }: TranslationElement<LyricsKeys> = interaction.translate("LYRICS", guildDB.lang);

    const { client } = interaction;
    await interaction.deferReply();
    const timeline: GuildQueueTimeline | null = useTimeline({ node: interaction.guildId });
    let song_name: string | null = interaction.options.getString('song');
    if (!song_name) {
        if (!timeline) return interaction.editReply(NO_QUEUE);
        song_name = timeline!.track!.title;
    }

    const lyrics: LrcSearchResult[] = await client.player.lyrics.search({
        q: song_name
    });

    const filteredLyrics = lyrics.find(lyr => lyr.trackName === song_name);
    if (!filteredLyrics) return interaction.editReply({ content: NOT_FOUND });
    const trimmedLyrics = filteredLyrics.plainLyrics.substring(0, 1997);

    const embed = new EmbedBuilder()
        .setTitle(`${ filteredLyrics.trackName ? filteredLyrics.trackName + " - " + filteredLyrics.artistName : song_name }`)
        .setAuthor({
            name: filteredLyrics.artistName
        })
        .setDescription(trimmedLyrics.length === 1997 ? `${ trimmedLyrics }...` : trimmedLyrics)
        .setColor('Yellow');

    return interaction.editReply({ embeds: [embed] });
}
