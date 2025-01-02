import { CommandInteraction, EmbedBuilder, SlashCommandOptionsOnlyBuilder } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { GuildQueueTimeline, useTimeline } from "discord-player";
import Botrucho from "@mongodb/base/Botrucho";

export const name = 'lyrics';
export const data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Get the lyrics of the current song.')
    .addStringOption(song => song.setName('song').setDescription('Enter the song name to get the lyrics.'));

export async function execute(interaction: CommandInteraction & { client: Botrucho }) {
    if (!interaction.inCachedGuild()) return;
    if (!interaction.isChatInputCommand()) return;

    const { client } = interaction;
    await interaction.deferReply();
    const timeline: GuildQueueTimeline | null = useTimeline({ node: interaction.guildId });
    let song_name: string | null = interaction.options.getString('song');
    if (!song_name) {
        if (!timeline) return interaction.editReply("No queue");
        song_name = timeline!.track!.title;
    }

    const lyrics = await client.player.lyrics.search({
        q: song_name
    });

    const filteredLyrics = lyrics.find(lyr => lyr.trackName === song_name);
    if (!filteredLyrics) return interaction.editReply({ content: 'No lyrics found' });
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
