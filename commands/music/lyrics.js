const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
    name: 'lyrics',
    data: new SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('Get the lyrics of the current song.')
        .addStringOption(song => song.setName('song').setDescription('Enter the song name to get the lyrics.')),
    async execute(interaction, guildDB) {
        const { client } = interaction;
        let song_name = interaction.options.getString('Song name');
        await interaction.deferReply("Getting lyrics")
        if (!song_name) {
            const queue = interaction.client.player.getQueue(interaction.guild.id);
            if (!queue) return interaction.editReply("No queue")
            song_name = queue.current.title;
        }
        try {
            const err = await interaction.translate("LIRYCS", guildDB.lang);
            const song_name_formatted = song_name
                .toLowerCase()
                .replace(/\(|lyrics|lyric|official music video|audio|official|official video|official video hd|clip officiel|clip|extended|hq|video|vídeo|\)/g, "")
                .trim()
                .split(" ").join("%20");
            const url = "https://some-random-api.ml/lyrics?title=" + encodeURIComponent(song_name_formatted) + ""
            const response = await fetch(url);
            const json_response = await response.json();
            if (!json_response.title) return interaction.errorMessage(err.replace("{songName}", song_name))
            const embed = new MessageEmbed()
                .setAuthor(`${ interaction.author.username }`, interaction.author.displayAvatarURL({
                    dynamic: true,
                    size: 512
                }), client.config.links.invite)
                .setTitle(`${ json_response.title ? json_response.title : song_name }`)
                .setColor(guildDB.color)
                .setDescription(`\`\`\`diff\n${ json_response.lyrics.slice(0, 4000) }\`\`\``)
                .setFooter(interaction.client.footer, interaction.client.user.displayAvatarURL({
                    dynamic: true,
                    size: 512
                }))
            return interaction.editReply({ embeds: [ embed ] })
        } catch (e) {
            return interaction.editReply("Fail Try catch" + e);
        }
    }
}
