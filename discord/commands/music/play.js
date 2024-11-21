const { useMainPlayer, QueueRepeatMode } = require("discord-player");
const { SlashCommandBuilder } = require("@discordjs/builders");
const { Error } = require("../../../util/embedMessage");

module.exports = {
    name: 'play',
    description: 'Plays a music in your voice channel.',
    cat: 'music',
    botpermissions: ['CONNECT', 'SPEAK'],
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays a music in your voice channel.')
        .addStringOption(option => option.setName('song').setDescription('The name of the song.').setRequired(true)),
    async execute(interaction, guildDB) {
        if (!interaction.inCachedGuild()) return;
        const player = useMainPlayer();
        const channel = interaction.member.voice.channel;
        const name = interaction.options.getString('song', true);

        if (!interaction.member.voice?.channel) return interaction.reply(Error({ description: 'Connect to a Voice Channel' }));

        await interaction.deferReply();

        const searchResult = await player.search(name, { requestedBy: interaction.user });

        if (!searchResult.hasTracks()) {
            const embed = Error({
                title: 'No results found',
                description: `No results found for \`${ name }\``,
                author: {
                    name: interaction.guild.name,
                    icon_url: interaction.guild.iconURL()
                }
            });

            return interaction.editReply({ embeds: [embed] });
        }

        await player.play(channel, searchResult, {
            nodeOptions: {
                metadata: {
                    channel: interaction.channel,
                    message: interaction
                },
                volume: guildDB.defaultVolume,
                repeatMode: QueueRepeatMode[guildDB.loopMode],
                noEmitInsert: true,
                leaveOnStop: false,
                leaveOnEmpty: true,
                leaveOnEmptyCooldown: 60000,
                leaveOnEnd: true,
                leaveOnEndCooldown: 60000,
                pauseOnEmpty: true,
                preferBridgedMetadata: true,
                disableBiquad: true,
            },
            requestedBy: interaction.user,
            connectionOptions: {
                deaf: true,
            }
        });
    }
}
