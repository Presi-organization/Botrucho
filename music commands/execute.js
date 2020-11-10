const ytdl = require("ytdl-core");
const embed = require("../embedMessage");
const search = require('youtube-search');

// DEV Purposes
// const {
//     yt_api_key
// } = require("../config.json");

const yt_api_key = process.env.YT_API_KEY;

const execute = async (message, serverQueue, queue) => {
    const args = message.content.split(" ");

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
        return message.channel.send(embed.simpleEmbedMessage(15158332, "¡Tienes que estar en un canal de voz!"));
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send(
            "I need the permissions to join and speak in your voice channel!"
        );
    }

    const opts = {
        maxResults: 1, //Maximo de resultados a encontrar
        key: yt_api_key, //Necesitas una CLAVE de la API de youtube. 
        type: "video" // Que tipo de resultado a obtener.
    };

    const songArg = await search(args.slice(2).join(" "), opts);
    const songURL = songArg.results[0].link;
    const songInfo = await ytdl.getInfo(songURL);
    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.url,
        author: message.author.tag
    };

    if (!serverQueue) {
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true
        };

        queue.set(message.guild.id, queueContruct);

        queueContruct.songs.push(song);

        try {
            const connection = await voiceChannel.join();
            queueContruct.connection = connection;
            play(message.guild, queueContruct.songs[0], queue);
        } catch (err) {
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
    } else {
        serverQueue.songs.push(song);
        return message.channel.send(`${song.title} has been added to the queue!`);
    }
}

const play = (guild, song, queue) => {
    console.log(song)
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }

    const dispatcher = serverQueue.connection
        .play(ytdl(song.url))
        .on("finish", () => {
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0], queue);
        })
        .on("error", error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(embed.simpleEmbedMessage(3447003, `Start playing: **${song.title}**`));
}

module.exports = { execute }