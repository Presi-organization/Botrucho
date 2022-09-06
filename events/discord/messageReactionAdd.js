const eventData = require('../../models/eventData');

module.exports = {
    async execute(reaction, user) {
        if (reaction.message.partials) await reaction.message.fetch();
        if (reaction.partials) await reaction.fetch();

        if (user.bot) return;
        if (!reaction.message.guild) return;

        if (reaction.emoji.name === '👽') {
            let eventInfo = await reaction.message.guild.fetchEventDB(reaction.message.id);
            const userFind = eventInfo.userAssisting.find(userID => userID === user.id);
            if (!userFind) {
                await eventData.updateOne({ _id: eventInfo._id }, { $addToSet: { userAssisting: user.id } });
                user.send(`Tu asistencia para el evento ${ eventInfo.eventName }, ha sido confirmada. Aquí está tu invitación: ${ eventInfo.calendarLink }`)
                    .catch(() => {
                        console.log('I couldn\'t send a DM');
                    });
            }
        }
    }
}
