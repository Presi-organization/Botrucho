const {
    SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, SelectMenuOptionBuilder,
    SelectMenuBuilder
} = require('discord.js');


module.exports = {
    name: 'event',
    data: new SlashCommandBuilder()
        .setName('event')
        .setDescription('Create an event'),
    async execute(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('event-modal')
            .setTitle('Se viene evento, gente 🥵');

        const eventNameInput = new TextInputBuilder()
            .setCustomId('eventNameInput')
            .setLabel("Nombre del evento")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const eventDateInput = new TextInputBuilder()
            .setCustomId('eventDateInput')
            .setLabel("Fecha del evento (añomesdía)")
            .setValue(new Date().toJSON().slice(0, 10).replace(/-/g, ''))
            .setMinLength(8)
            .setMaxLength(8)
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const eventTimeInput = new TextInputBuilder()
            .setCustomId('eventTimeInput')
            .setLabel("Hora del evento (hh:mm-hh:mm)")
            .setPlaceholder("18:00-20:00")
            .setMinLength(11)
            .setMaxLength(11)
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const eventDescriptionInput = new TextInputBuilder()
            .setCustomId('eventDescriptionInput')
            .setLabel("Descripción del evento")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const eventLinkInput = new TextInputBuilder()
            .setCustomId('eventLinkInput')
            .setLabel("Ubicación del evento")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const firstActionRow = new ActionRowBuilder().addComponents(eventNameInput);
        const secondActionRow = new ActionRowBuilder().addComponents(eventDateInput);
        const thirdActionRow = new ActionRowBuilder().addComponents(eventTimeInput);
        const fourthActionRow = new ActionRowBuilder().addComponents(eventDescriptionInput);
        const fifthActionRow = new ActionRowBuilder().addComponents(eventLinkInput);

        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow, fifthActionRow);

        await interaction.showModal(modal);
    }
}
