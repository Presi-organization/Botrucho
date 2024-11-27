const { SlashCommandBuilder } = require("@discordjs/builders");
const { useTimeline } = require("discord-player");
const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: 'lyrics',
    data: new SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('Get the lyrics of the current song.')
        .addStringOption(song => song.setName('song').setDescription('Enter the song name to get the lyrics.')),
    async execute(interaction) {
        const { client } = interaction;
        await interaction.deferReply("Getting lyrics")
        const timeline = useTimeline(interaction.guildId);
        let song_name = interaction.options.getString('song');
        if (!song_name) {
            if (!timeline) return interaction.editReply("No queue")
            song_name = timeline.track.title;
        }

        const lyrics = await client.player.lyrics.search({
            q: song_name
        });

        const filteredLyrics = lyrics.find(lyr => lyr.trackName === song_name);
        if (!filteredLyrics) return interaction.editReply({ content: 'No lyrics found', ephemeral: true });
        const trimmedLyrics = filteredLyrics.plainLyrics.substring(0, 1997);

        const embed = new EmbedBuilder()
            .setTitle(`${ filteredLyrics.title ? filteredLyrics.title + " - " + filteredLyrics.author : song_name }`)
            .setURL(timeline.track.url)
            .setThumbnail(timeline.track.thumbnail)
            .setAuthor({
                name: filteredLyrics.artistName
            })
            .setDescription(trimmedLyrics.length === 1997 ? `${ trimmedLyrics }...` : trimmedLyrics)
            .setColor('Yellow');

        return interaction.editReply({ embeds: [embed] });
    }
}
