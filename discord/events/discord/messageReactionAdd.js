const { EmbedBuilder } = require("discord.js");

module.exports = {
    async execute(client, reaction, user) {
        if (reaction.message.partials) await reaction.message.fetch();
        if (reaction.partials) await reaction.fetch();

        if (user.bot) return;
        if (!reaction.message.guild) return;

        if (reaction.emoji.name === '👽') {
            const deletedMessages = client.deleted_messages;
            let eventInfo = await reaction.message.guild.fetchEventDB(client.eventData, reaction.message.id);
            const userFind = eventInfo.userAssisting.find(userID => userID === user.id);
            if (!userFind) {
                await client.eventData.addAssistance(eventInfo.id, user.id);

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
                    embeds: [exampleEmbed]
                })
                    .then(msg => {
                        setTimeout(() => {
                            deletedMessages.add(msg);
                        }, 120000)
                    })
                    .catch(() => {
                        console.log('I couldn\'t send a DM');
                    });
            }
        }
    }
}
