const ytdl = require("ytdl-core");
const Discord = require("discord.js");
const embed = require("./embedMessage");
const {
    prefix
} = require("./settings.json");

// DEV Purposes
// const {
//     discord_token
// } = require("./config.json");

const discord_token = process.env.DISCORD_TOKEN;
const client = new Discord.Client();

const queue = new Map();

client.once("ready", () => {
    console.log("Ready!");
});

client.once("reconnecting", () => {
    console.log("Reconnecting!");
});

client.once("disconnect", () => {
    console.log("Disconnect!");
});

client.on("message", async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const serverQueue = queue.get(message.guild.id);

    if (message.content.startsWith(`${prefix} ping`)) {
        message.channel.send(embed.simpleEmbedMessage(2899536, "**Pinging...**")).then(msg => {
            const ping = msg.createdTimestamp - message.createdTimestamp;
            msg.edit(embed.simpleEmbedMessage(9807270, `**:ping_pong: Pong! LATENCIA:-**\n  ${ping}ms`));
        });
    } else if (message.content.startsWith(`${prefix} clear`)) {
        const args = message.content.split(" ").slice(2);
        const amount = args.join(" ");

        if (!amount) return message.reply('¡No ha proporcionado una cantidad de mensajes que deberían eliminarse!');
        if (isNaN(amount)) return message.reply('¡El parámetro de cantidad no es un número!');

        if (amount > 99) return message.reply('¡No puedes borrar más de 100 mensajes a la vez!');
        if (amount < 1) return message.reply('¡Tienes que borrar al menos 1 mensaje!');

        await message.channel.messages.fetch({ limit: amount }).then(messages => {
            message.channel.bulkDelete(messages);
        });
    } else if (message.content.startsWith(`${prefix} play`)) {
        execute(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix} skip`)) {
        skip(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix} stop`)) {
        stop(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix} join`)) {
        let channelVoice = message.member.voice.channel;
        if (!channelVoice || channelVoice.type !== 'voice') {
            message.channel.send('¡Necesitas unirte a un canal de voz primero!.').catch(error => message.channel.send(error));
        } else if (message.guild.voiceConnection) {
            message.channel.send('Ya estoy conectado en un canal de voz.');
        } else {
            message.channel.send('Conectando...').then(msg => {
                channelVoice.join().then(() => {
                    msg.edit(':white_check_mark: | Conectado exitosamente.').catch(error => message.channel.send(error));
                }).catch(error => message.channel.send(error));
            }).catch(error => message.channel.send(error));
        }
    } else if (message.content.startsWith(`${prefix} leave`)) { 
        let voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            message.channel.send('No estoy en un canal de voz.');
        } else {
            message.channel.send('Dejando el canal de voz.').then(() => {
            voiceChannel.leave();
            }).catch(error => message.channel.send(error));
        }   
    } else {
        message.channel.send("You need to enter a valid command!");
    }
});

const execute = async (message, serverQueue) => {
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

    const songInfo = await ytdl.getInfo(args[2]);
    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.url
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
            var connection = await voiceChannel.join();
            queueContruct.connection = connection;
            play(message.guild, queueContruct.songs[0]);
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

const skip = (message, serverQueue) => {
    if (!message.member.voice.channel)
        return message.channel.send(
            "You have to be in a voice channel to stop the music!"
        );
    if (!serverQueue)
        return message.channel.send("There is no song that I could skip!");
    serverQueue.connection.dispatcher.end();
}

const stop = (message, serverQueue) => {
    if (!message.member.voice.channel)
        return message.channel.send(
            "You have to be in a voice channel to stop the music!"
        );
    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
}

const play = (guild, song) => {
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
            play(guild, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(embed.simpleEmbedMessage(3447003, `Start playing: **${song.title}**`));
}

client.login(discord_token);

client.on("error", (e) => console.error(e));
client.on("warn", (e) => console.warn(e));
client.on("debug", (e) => console.info(e));