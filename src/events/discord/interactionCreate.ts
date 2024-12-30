import { Guild, Interaction, Message } from 'discord.js';
import Botrucho from "@mongodb/base/Botrucho";
import { IGuildData } from "@mongodb/models/GuildData";

module.exports = {
    async execute(client: Botrucho, interaction: Interaction): Promise<void> {
        const guildDB: IGuildData = await interaction.guild!.fetchDB(client.guildData);
        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await client.player.context.provide({ guild: interaction?.guild as Guild }, async () => await command.execute(interaction, guildDB));
            } catch (error) {
                console.error(error);
                await interaction.editReply({
                    content: 'There was an error while executing this command!'
                });
            }
        }
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'event-modal') {
                const eventName: string = interaction.fields.getTextInputValue('eventNameInput');
                const eventDate: string = interaction.fields.getTextInputValue('eventDateInput');
                const eventTime: string = interaction.fields.getTextInputValue('eventTimeInput');
                const eventTimeEval: RegExpExecArray | null = /^(([0-1][0-9]|2[0-3]):([0-5][0-9]))(\s?)-(\s?)(([0-1][0-9]|2[0-3]):([0-5][0-9]))$/.exec(eventTime);
                const eventTimeEvalLength: number | undefined = eventTimeEval?.length;
                let calendarDate: string = `${ eventDate }/${ eventDate }`;

                if (eventTimeEvalLength && parseInt(eventTimeEval![eventTimeEvalLength - 2]) > parseInt(eventTimeEval![2])) {
                    calendarDate = `${ eventDate }T${ eventTimeEval![2] }${ eventTimeEval![3] }00/${ eventDate }T${ eventTimeEval![eventTimeEvalLength - 2] }${ eventTimeEval![eventTimeEvalLength - 1] }00`;
                }

                const eventDescription: string = interaction.fields.getTextInputValue('eventDescriptionInput');
                const eventZone: string = interaction.fields.getTextInputValue('eventLinkInput');
                const addToCalendar: string = `https://calendar.google.com/calendar/r/eventedit?text=${ eventName }&dates=${ calendarDate }&details=<b>Descripción+del+evento</b>:+${ eventDescription }&location=${ eventZone }`;
                const message: Message = await interaction.reply({
                    embeds: [{
                        author: {
                            name: `${ interaction.user.tag } ha creado un evento`,
                            icon_url: interaction.user.displayAvatarURL()
                        },
                        description: `<@&540708709945311243> Confirma tu asistencia en: ${ eventName }`,
                        color: 0xF5B719,
                    }],
                    fetchReply: true
                });

                await message.react('👽');
                await message.react('🙅🏻');
                await interaction.guild?.addEventDB(client.eventData, message.id, eventName, encodeURI(addToCalendar.replace(/ /g, "+")));
            }
        }
    }
};
