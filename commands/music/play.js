const { SlashCommandBuilder } = require("@discordjs/builders");
const { QueryType } = require("discord-player");
const play = require("play-dl");

module.exports = {
    name: 'play',
    description: 'Plays a music in your voice channel.',
    cat: 'music',
    botpermissions: [ 'CONNECT', 'SPEAK' ],
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays a music in your voice channel.')
        .addStringOption(option => option.setName('song').setDescription('The name of the song.').setRequired(true)),
    async execute(interaction, guildDB) {
        const { client } = interaction;

        await interaction.deferReply("thinking");

        const name = interaction.options.getString('song');
        if (!interaction.member.voice?.channel) return interaction.editReply('Connect to a Voice Channel');

        let queue = interaction.client.player.getQueue(interaction.guild.id);

        if (!queue) {
            queue = client.player.createQueue(interaction.guild.id, {
                metadata: {
                    channel: interaction.channel,
                    message: interaction,
                    guildDB: guildDB,
                    dj: interaction.user.username,
                },
                initialVolume: guildDB.defaultVolume,
                ytdlOptions: {
                    quality: 'highestaudio',
                    filter: 'audioonly',
                    highWaterMark: 1 << 25,
                    dlChunkSize: 0
                },
                leaveOnEmptyCooldown: null,
                leaveOnEmpty: false,
                leaveOnEnd: false,
                leaveOnStop: false,
                async onBeforeCreateStream(track, source, queue) {
                    if (track.url.includes('youtube') || track.url.includes("youtu.be")) {
                        try {
                            return (await play.stream(track.url, { discordPlayerCompatibility: true })).stream;
                        } catch (err) {
                            return queue.metadata.message.errorMessage("This video is restricted. Try with another link.")
                        }
                    } else if (track.url.includes('spotify')) {
                        try {
                            let songs = await client.player.search(`${ track.author } ${ track.title } `, {
                                requestedBy: interaction.user,
                            }).catch().then(x => x.tracks[0]);
                            return (await play.stream(songs.url, { discordPlayerCompatibility: true })).stream;
                        } catch (err) {
                            console.log(err)
                        }
                    } else if (track.url.includes('soundcloud')) {
                        try {
                            return (await play.stream(track.url, { discordPlayerCompatibility: true })).stream;
                        } catch (err) {
                            console.log(err)
                        }
                    }
                }
            })
        }

        const searchResult = await client.player.search(name, {
            requestedBy: interaction.user,
            searchEngine: QueryType.AUTO
        }).catch(async () => {
        });

        try {
            if (!queue.connection) await queue.connect(interaction.member.voice.channel);
        } catch (err) {
            console.log("ErrConnection", err)
            if (err.toString().includes('Error: Did not enter state ready within 20000ms')) return;
            client.player.deleteQueue(interaction.guild.id)
            return interaction.errorMessage(`I am not able to join your voice channel, please check my permissions !`);
        }
        searchResult.playlist ? queue.addTracks(searchResult.tracks) : queue.addTrack(searchResult.tracks[0]);
        if (!queue.playing) await queue.play();
    }
}
