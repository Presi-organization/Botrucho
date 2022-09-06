const eventData = require('../../models/eventData');
const { EmbedBuilder } = require("discord.js");

module.exports = {
    async execute(reaction, user, client) {
        if (reaction.message.partials) await reaction.message.fetch();
        if (reaction.partials) await reaction.fetch();

        if (user.bot) return;
        if (!reaction.message.guild) return;

        if (reaction.emoji.name === '👽') {
            const deletedMessages = client.deleted_messages;
            let eventInfo = await reaction.message.guild.fetchEventDB(reaction.message.id);
            const userFind = eventInfo.userAssisting.find(userID => userID === user.id);
            if (!userFind) {
                await eventData.updateOne({ _id: eventInfo._id }, { $addToSet: { userAssisting: user.id } });

                const exampleEmbed = new EmbedBuilder()
                    .setColor(client.config.color)
                    .setTitle(`Tu asistencia para el evento ${ eventInfo.eventName }, ha sido confirmada`)
                    .setURL(eventInfo.calendarLink)
                    .setDescription(`Aquí está tu invitación: ${ eventInfo.calendarLink }\n\nTen en cuenta que este mensaje se autodestruirá en 2 minutos.`)
                    .setTimestamp()
                    .setFooter({
                        text: `Evento generado por ${ client.user.username }`, iconURL: client.user.displayAvatarURL({
                            dynamic: true,
                            size: 512
                        })
                    });

                user.send({
                    embeds: [ exampleEmbed ]
                })
                    .then(msg => {
                        deletedMessages.add(msg);
                        setTimeout(async () => {
                            if (msg && deletedMessages.has(msg)) {
                                msg.delete() && deletedMessages.delete(msg)
                            }
                        }, 120000)
                    })
                    .catch(() => {
                        console.log('I couldn\'t send a DM');
                    });
            }
        }
    }
}
