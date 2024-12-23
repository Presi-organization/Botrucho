const { useMainPlayer, QueueRepeatMode } = require("discord-player");
const { SlashCommandBuilder } = require("@discordjs/builders");
const { Error, Warning, withEphemeral } = require("../../../util/embedMessage");

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

        await interaction.deferReply({ ephemeral: true });

        const searchResult = await player.search(name, { requestedBy: interaction.user });

        if (!searchResult.hasTracks()) {
            const embed = {
                title: 'No results found',
                description: `No results found for \`${ name }\``,
                author: {
                    name: interaction.guild.name,
                    icon_url: interaction.guild.iconURL()
                }
            };

            return interaction.editReply(Error(embed));
        }

        const embed = {
            title: 'Song added to Queue',
            description: `[${ searchResult.tracks[0].title } - ${ searchResult.tracks[0].author }](${ searchResult.tracks[0].url }) has been added to Queue`
        };

        interaction.editReply(withEphemeral(Warning(embed)));
        setTimeout(() => {
            interaction.deleteReply();
        }, 5000);

        await player.play(channel, searchResult, {
            nodeOptions: {
                metadata: {
                    channel: interaction.channel,
                    queueMessage: null,
                    currentTrack: '',
                    queueTitles: [],
                    message: interaction
                },
                volume: guildDB.defaultVolume,
                repeatMode: QueueRepeatMode[guildDB.loopMode],
                noEmitInsert: true,
                leaveOnStop: false,
                leaveOnEmpty: true,
                leaveOnEmptyCooldown: 30000,
                leaveOnEnd: true,
                leaveOnEndCooldown: 30000,
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
