const { MessageEmbed } = require("discord.js");

module.exports = {
    async execute(queue, _, client) {
        if (queue.metadata.controller) {
            const embed = new MessageEmbed()
                .setAuthor(`${ client.footer }`, client.user.displayAvatarURL({
                    dynamic: true,
                    size: 512
                }), "https://discord.com/oauth2/authorize?client_id=973290665704308756&scope=bot&permissions=66186704")
                .setDescription(`Send a music name/link bellow this message to play music.`)
                .addField("Now playing", "__**Nothing playing**__")
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
            const loadingTest = await queue.metadata.message.translate("QUEUE_END", queue.metadata.guildDB.lang)
            return queue.metadata.channel.send({
                embeds: [
                    {
                        title: "Queue Concluded",
                        color: "#F0B02F",
                        description: loadingTest,
                    },
                ],
            });
        }
    }
}
