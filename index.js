const Discord = require("discord.js");

const { skip } = require("./music commands/skip");
const { stop } = require("./music commands/stop");
const { pause } = require("./music commands/pause");
const { resume } = require("./music commands/resume");
const { volume } = require("./music commands/volume");
const { listQueue } = require("./music commands/queue");
const { execute } = require("./music commands/execute");

const { ping } = require("./management commands/ping");
const { clear } = require("./management commands/clear");

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
        ping(message);
        return;
    } else if (message.content.startsWith(`${prefix} clear`)) {
        clear(message);
        return;
    } else if (message.content.startsWith(`${prefix} play`)) {
        execute(message, serverQueue, queue);
        return;
    } else if (message.content.startsWith(`${prefix} pause`)) {
        pause(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix} resume`)) {
        resume(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix} skip`)) {
        skip(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix} stop`)) {
        stop(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix} volume`)) {
        volume(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix} queue`)) {
        listQueue(message, serverQueue);
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

client.login(discord_token);

client.on("error", (e) => console.error(e));