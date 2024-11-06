const { EmbedBuilder } = require("discord.js");

module.exports = {
    async execute(client, queue) {
        const deletedMessages = client.deleted_messages;
        if (queue.metadata.controller) {
            const embed = new EmbedBuilder()
                .setAuthor({
                    name: client.user.username,
                    url: client.config.links.invite,
                    iconURL: client.user.displayAvatarURL({
                        dynamic: true,
                        size: 512
                    }),
                })
                .setDescription(`Send a music name/link bellow this message to play music.`)
                .addFields("Now playing", "__**Nothing playing**__")
                .setImage("https://d2vrvpw63099lz.cloudfront.net/whatsapp-bots/whatsapp-bots.png")
                .setFooter({
                    text: client.footer,
                    iconURL: client.user.displayAvatarURL({
                        dynamic: true,
                        size: 512
                    })
                })
                .setColor(client.config.color);
            return queue.metadata.message.editReply({
                embeds: [ embed ],
            }).then(msg => {
                deletedMessages.add(msg);
                setTimeout(async () => {
                    if (msg && deletedMessages.has(msg)) {
                        msg.delete() && deletedMessages.delete(msg)
                    }
                }, 3000)
            });
        } else {
            const loadingTest = await queue.metadata.message.translate("QUEUE_END", queue.metadata.guildDB.lang)
            return queue.metadata.message.editReply({
                embeds: [
                    {
                        title: "Queue Concluded",
                        color: client.config.color,
                        description: loadingTest,
                    },
                ],
            }).then(msg => {
                deletedMessages.add(msg);
                setTimeout(async () => {
                    if (msg && deletedMessages.has(msg)) {
                        msg.delete() && deletedMessages.delete(msg)
                    }
                }, 3000)
            });
        }
    }
}
