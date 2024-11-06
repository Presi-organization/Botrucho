const permes = require("../../../util/permissions.json");
const { Permissions } = require("discord.js");
const { QueryType } = require('discord-player');

require("../../../util/extenders.js");

module.exports = {
    async execute(_, message) {
        const { client } = message;
        if (message.author.bot || !message.guild) return;
        let guildDB = await message.guild.fetchDB(client.guildData);
        let a;
        if (message.content.startsWith(guildDB.prefix) || message.content.startsWith("green ") || message.content.startsWith(`<@!${ message.client.user.id }>`)) {
            if (message.content.endsWith("*") && !message.content.includes("prefix")) return;
            if (message.content.match(new RegExp(`^<@!?${message.client.user.id}>( |)$`))) {
                let a = await message.translate("HELLO_NEED_HELP", guildDB.lang);
                message.channel.send({
                    embeds: [ {
                        description: a.replace("{prefix}", guildDB.prefix).replace("{prefix}", guildDB.prefix).replace("{prefix}", guildDB.prefix).replace("{id}", message.guild.id),
                        footer: {
                            text: message.client.footer,
                            icon_url: message.client.user.displayAvatarURL()
                        },
                        title: `Settings for ${ message.guild.name }`,
                        color: client.config.color
                    } ]
                }).catch(() => {
                    message.member.send("❌ Please give me the `Send messages` and `Embed links` permission.");
                });
                return console.log("[32m%s[0m", "PING OF THE BOT ", "[0m", `${ message.author.tag } pinged the bot succesfully on ${ message.guild.name }`);
            }
            message.content.startsWith(guildDB.prefix) && (a = message.content.slice(guildDB.prefix.length).trim().split(/ +/)), message.content.startsWith("green ") && (a = message.content.slice(6).trim().split(/ +/)), message.content.startsWith("<@!973290665704308756>") && (a = message.content.slice(22).trim().split(/ +/));
            const r = a.shift().toLowerCase(),
                i = client.commands.get(r) || client.commands.find(e => e.aliases && e.aliases.includes(r));
            if (!i) return;
            console.log("[32m%s[0m", "COMMAND ", "[0m", `Command ${ i.name } by ${ message.author.tag } on ${ message.guild.name }\nMessage content:\n${ message.content }`);
            const me = message.guild.members.cache.get(message.client.user.id);
            const channelBotPerms = new Permissions(message.channel.permissionsFor(me));
            if (!channelBotPerms.has("SEND_MESSAGES")) return message.member.send("❌ I don't have permission to send messages in this channel.");
            if (!channelBotPerms.has("EMBED_LINKS")) return message.channel.send("❌ The bot must have the `Embed links` permissions to work properly !");
            if (i.permissions) {
                "string" == typeof i.permissions && (i.permissions = [ i.permissions ]);
                for (const t of i.permissions)
                    if (!message.channel.permissionsFor(message.member).has(t)) {
                        let d = await message.translate("MISSING_PERMISSIONS", guildDB.lang);
                        if ("MANAGE_GUILD" !== t) return message.errorMessage(d.replace("{perm}", permes[t] ? permes[t][guildDB.lang] : t));
                        {
                            let a = await message.translate("MISSING_ROLE");
                            if (!guildDB.admin_role) return message.errorMessage(d.replace("{perm}", permes[t] ? permes[t][guildDB.lang] : t));
                            if (AdminRole = message.guild.roles.cache.get(guildDB.admin_role), !AdminRole) return message.errorMessage(d.replace("{perm}", permes[t] ? permes[t][guildDB.lang] : t));
                            if (!message.member.roles.cache) return message.errorMessage(a.replace("{perm}", permes[t] ? permes[t][guildDB.lang] : t).replace("{role}", AdminRole));
                            if (!message.member.roles.cache.has(AdminRole.id)) return message.errorMessage(a.replace("{perm}", permes[t] ? permes[t][guildDB.lang] : t).replace("{role}", AdminRole))
                        }
                    }
            }
            if (i.args && !a.length) {
                let u = await message.translate("ARGS_REQUIRED", guildDB.lang);
                const read = await message.translate("READ", guildDB.lang);
                let langUsage = await message.translate("USES_SING", guildDB.lang);
                if (i.usages) langUsage = await message.translate("USES", guildDB.lang);
                return message.channel.send({
                    embeds: [
                        {
                            color: "0XC73829",
                            description: `${ u.replace("{command}", r) }\n${ read }\n\n**${ langUsage }**\n${ i.usages ? `${ i.usages.map(x => `\`${ guildDB.prefix }${ x }\``).join("\n") }` : ` \`${ guildDB.prefix }${ r } ${ i.usage }\`` }`,
                            footer: { text: message.client.footer, iconURL: message.client.user.displayAvatarURL() },
                            author: {
                                name: message.author.username,
                                icon_url: message.author.displayAvatarURL({ dynamic: !0, size: 512 }),
                                url: "https://discord.com/oauth2/authorize?client_id=973290665704308756&scope=bot&permissions=19456"
                            },
                        }
                    ]
                });
            }
            try {
                return i.execute(message, a, client, guildDB, i);
            } catch (s) {
                return message.errorOccurred(s);
            }
        } else if (guildDB.requestChannel !== null || guildDB.autopost !== null) {
            if (guildDB.requestChannel === message.channel.id) {
                message.delete();
                const voice = message.member.voice.channel;
                if (!voice) {
                    let err = await message.translate("NOT_VOC", guildDB.lang)
                    const noVoiceMsg = await message.errorMessage(err);
                    return setTimeout(() => {
                        noVoiceMsg.delete();
                    }, 5000);
                }
                if (message.guild.me.voice.channel && message.guild.me.voice.channel.id !== voice.id) {
                    let err = await message.translate("NOT_SAME_CHANNEL", guildDB.lang)
                    const noVoiceMsg = await message.errorMessage(err);
                    return setTimeout(() => {
                        noVoiceMsg.delete();
                    }, 5000);
                }
                let name = message.content;
                let queue = message.client.player.getQueue(message.guild.id);
                const messageController = await message.guild.channels.cache.get(message.channel.id).messages.fetch(guildDB.requestMessage);
                if (!queue) {
                    queue = message.client.player.createQueue(message.guild, {
                        metadata: {
                            controller: true,
                            message: messageController,
                            dj: message.author,
                            guildDB: guildDB,
                            m: message
                        },
                        initialVolume: guildDB.defaultVolume,
                        leaveOnEmptyCooldown: guildDB.h24 ? null : 3000,
                        leaveOnEmpty: !guildDB.h24,
                        leaveOnEnd: !guildDB.h24,
                        ytdlOptions: {
                            quality: 'highest',
                            filter: 'audioonly',
                            highWaterMark: 1 << 25,
                            dlChunkSize: 0
                        },
                        fetchBeforeQueued: true,
                        async onBeforeCreateStream(track, source, _queue) {
                            const playdl = require('play-dl');
                            if (track.url.includes('youtube') || track.url.includes("youtu.be")) {
                                try {
                                    return (await playdl.stream(track.url)).stream;
                                } catch (err) {
                                    console.log(err)
                                    return _queue.metadata.m.errorMessage("This video is restricted. Try with another link.")
                                }
                            } else if (track.url.includes('spotify')) {
                                try {
                                    let songs = await client.player.search(`${ track.author } ${ track.title } `, {
                                        requestedBy: message.member,
                                    }).catch().then(x => x.tracks[0]);
                                    return (await playdl.stream(songs.url)).stream;
                                } catch (err) {
                                    console.log(err)
                                }
                            } else if (track.url.includes('soundcloud')) {
                                try {
                                    return (await playdl.stream(track.url)).stream;
                                } catch (err) {
                                    console.log(err)
                                }
                            }
                        }
                    });
                } else if (queue.metadata.channel) return message.errorMessage("Another queue is running and not started with the controller.");
                if (name === 'music') name = '2021 New Songs ( Latest English Songs 2021 ) 🥬 Pop Music 2021 New Song 🥬 English Song 2021';
                if (name === 'lofi') name = '1 A.M Study Session 📚 - [lofi hip hop/chill beats]';
                const searchResult = await message.client.player.search(name, {
                    requestedBy: message.author,
                    searchEngine: QueryType.AUTO
                }).catch(async () => {
                    let err = await message.translate("NO_RESULTS", guildDB.lang)
                    const noVoiceMsg = await message.errorMessage(err.replace("{query}", name));
                    return setTimeout(() => {
                        noVoiceMsg.delete();
                    }, 5000);
                });
                if (!searchResult || !searchResult.tracks.length) {
                    const error = await message.translate("NO_RESULTS", guildDB.lang)
                    const noVoiceMsg = await message.errorMessage(error.replace("{query}", name));
                    return setTimeout(() => {
                        noVoiceMsg.delete();
                    }, 5000);
                }
                try {
                    if (!queue.connection) await queue.connect(message.member.voice.channel);
                } catch {
                    message.client.player.deleteQueue(message.guild.id);
                    return message.errorMessage("I can't join your voice channel. Please check my permissions.");
                }
                if (!message.guild.me.voice.channel) await queue.connect(message.member.voice.channel);
                searchResult.playlist ? queue.addTracks(searchResult.tracks) : queue.addTrack(searchResult.tracks[0]);
                if (!queue.playing) await queue.play();
            }
            if (guildDB.autopost === message.channel.id && message.crosspostable) message.crosspost().then(() => console.log('Crossposted message')).catch(() => null);
        }
    }
};
