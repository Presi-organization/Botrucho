const { MessageEmbed } = require("discord.js");

module.exports = {
    async execute(queue, track, client) {
        if (!queue.metadata) return console.log("Not metadata");
        if (queue.metadata.controller) {
            const embed = new MessageEmbed()
                .setAuthor(track.requestedBy.tag, track.requestedBy.displayAvatarURL(), "https://discord.com/oauth2/authorize?client_id=973290665704308756&scope=bot&permissions=19456")
                .setDescription(`Send a music name/link bellow this message to play music.`)
                .addField("Now playing", `[**${ track.title }**](${ track.url }) [<@${ track.requestedBy.id }>] \`${ track.duration }\``)
                .setImage(url = "https://d2vrvpw63099lz.cloudfront.net/whatsapp-bots/whatsapp-bots.png")
                .setFooter(`${ client.footer }`, client.user.displayAvatarURL({
                    dynamic: true,
                    size: 512
                }))
                .setColor("#3A871F");
            return queue.metadata.message.edit({
                embeds: [ embed ],
            });
        } else {
            if (queue.metadata.guildDB.announce) {
                const deletedMessages = client.deleted_messages;
                queue.metadata.message.editReply({
                    embeds: [
                        {
                            color: queue.metadata.guildDB.color,
                            author: {
                                name: "" + track.requestedBy.tag + " - Now playing",
                                icon_url: track.requestedBy.displayAvatarURL(),
                                url: "https://discord.com/oauth2/authorize?client_id=973290665704308756&scope=bot&permissions=19456"
                            },
                            description: `[${ track.title }](${ track.url }) [<@${ track.requestedBy.id }>]`,
                        },
                    ],
                }).then(msg => {
                    deletedMessages.add(msg);
                    setTimeout(async () => {
                        if (msg && deletedMessages.has(msg)) {
                            msg.delete() && deletedMessages.delete(msg)
                        }
                    }, track.durationMS)
                })
            }
        }
    }
}
