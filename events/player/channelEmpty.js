const { MessageEmbed } = require("discord.js");
module.exports = {
    async execute(queue, _, client) {
        if (queue.metadata.controller) {
            const embed = new MessageEmbed()
                .setAuthor(`${ client.footer }`, client.user.displayAvatarURL({ dynamic: true, size: 512 }))
                .setDescription(`Send a music name/link bellow this message to play music.`)
                .addField("Now playing", "__**Nothing playing**__")
                .setImage("https://d2vrvpw63099lz.cloudfront.net/whatsapp-bots/whatsapp-bots.png")
                .setFooter(`${ client.footer }`, client.user.displayAvatarURL({ dynamic: true, size: 512 }))
                .setColor("#3A871F");

            return queue.metadata.message.edit({
                embeds: [ embed ]
            });
        }
        if (!queue.metadata.guildDB.h24) queue.connection.disconnect()
    }
}
