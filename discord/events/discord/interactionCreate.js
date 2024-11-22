module.exports = {
    async execute(client, interaction) {
        const guildDB = await interaction.guild.fetchDB(client.guildData)
        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction, guildDB);
            } catch (error) {
                console.error(error);
                await interaction.editReply({
                    content: 'There was an error while executing this command!',
                    ephemeral: true
                });
            }
        }
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'event-modal') {
                const eventName = interaction.fields.getTextInputValue('eventNameInput');
                const eventDate = interaction.fields.getTextInputValue('eventDateInput');
                const eventTime = interaction.fields.getTextInputValue('eventTimeInput');
                const eventTimeEval = /^(([0-1][0-9]|2[0-3]):([0-5][0-9]))(\s?)-(\s?)(([0-1][0-9]|2[0-3]):([0-5][0-9]))$/.exec(eventTime);
                const eventTimeEvalLength = eventTimeEval?.length;
                let calendarDate = `${ eventDate }/${ eventDate }`;

                if (eventTimeEvalLength && parseInt(eventTimeEval[eventTimeEvalLength - 2]) > parseInt(eventTimeEval[2])) {
                    calendarDate = `${ eventDate }T${ eventTimeEval[2] }${ eventTimeEval[3] }00/${ eventDate }T${ eventTimeEval[eventTimeEvalLength - 2] }${ eventTimeEval[eventTimeEvalLength - 1] }00`;
                }

                const eventDescription = interaction.fields.getTextInputValue('eventDescriptionInput');
                const eventZone = interaction.fields.getTextInputValue('eventLinkInput');
                const addToCalendar = `https://calendar.google.com/calendar/r/eventedit?text=${ eventName }&dates=${ calendarDate }&details=<b>Descripción+del+evento</b>:+${ eventDescription }&location=${ eventZone }`;
                const message = await interaction.reply({
                    embeds: [{
                        author: {
                            name: `${ interaction.user.tag } ha creado un evento`,
                            icon_url: interaction.user.displayAvatarURL()
                        },
                        description: `<@&540708709945311243> Confirma tu asistencia en: ${ eventName }`,
                        color: 0XF5B719,
                    }],
                    fetchReply: true
                })

                // { content: encodeURI(addToCalendar.replaceAll(" ", "+")), fetchReply: true });
                await message.react('👽');
                await message.react('🙅🏻');
                await interaction.guild.addEventDB(client.eventData, message.id, eventName, encodeURI(addToCalendar.replaceAll(" ", "+")));
            }
        }

    }
};
