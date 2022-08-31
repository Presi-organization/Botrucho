const { EmbedBuilder } = require("discord.js");

module.exports = {
    async execute(queue, client) {
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
            return queue.metadata.message.edit({
                embeds: [ embed ],
            });
        } else {
            const loadingTest = await queue.metadata.message.translate("QUEUE_END", queue.metadata.guildDB.lang)
            return queue.metadata.channel.send({
                embeds: [
                    {
                        title: "Queue Concluded",
                        color: client.config.color,
                        description: loadingTest,
                    },
                ],
            });
        }
    }
}
