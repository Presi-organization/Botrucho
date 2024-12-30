import {
    SlashCommandBuilder,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    CommandInteraction
} from 'discord.js';

export const name = 'event';
export const data: SlashCommandBuilder = new SlashCommandBuilder()
    .setName('event')
    .setDescription('Create an event');

export async function execute(interaction: CommandInteraction): Promise<void> {
    const modal: ModalBuilder = new ModalBuilder()
        .setCustomId('event-modal')
        .setTitle('Se viene evento, gente 🥵');

    const eventNameInput: TextInputBuilder = new TextInputBuilder()
        .setCustomId('eventNameInput')
        .setLabel("Nombre del evento")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const eventDateInput: TextInputBuilder = new TextInputBuilder()
        .setCustomId('eventDateInput')
        .setLabel("Fecha del evento (añomesdía)")
        .setValue(new Date().toJSON().slice(0, 10).replace(/-/g, ''))
        .setMinLength(8)
        .setMaxLength(8)
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const eventTimeInput: TextInputBuilder = new TextInputBuilder()
        .setCustomId('eventTimeInput')
        .setLabel("Hora del evento (hh:mm-hh:mm)")
        .setPlaceholder("18:00-20:00")
        .setMinLength(11)
        .setMaxLength(11)
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    const eventDescriptionInput: TextInputBuilder = new TextInputBuilder()
        .setCustomId('eventDescriptionInput')
        .setLabel("Descripción del evento")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    const eventLinkInput: TextInputBuilder = new TextInputBuilder()
        .setCustomId('eventLinkInput')
        .setLabel("Ubicación del evento")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

    const firstActionRow: ActionRowBuilder<TextInputBuilder> = new ActionRowBuilder<TextInputBuilder>().addComponents(eventNameInput);
    const secondActionRow: ActionRowBuilder<TextInputBuilder> = new ActionRowBuilder<TextInputBuilder>().addComponents(eventDateInput);
    const thirdActionRow: ActionRowBuilder<TextInputBuilder> = new ActionRowBuilder<TextInputBuilder>().addComponents(eventTimeInput);
    const fourthActionRow: ActionRowBuilder<TextInputBuilder> = new ActionRowBuilder<TextInputBuilder>().addComponents(eventDescriptionInput);
    const fifthActionRow: ActionRowBuilder<TextInputBuilder> = new ActionRowBuilder<TextInputBuilder>().addComponents(eventLinkInput);

    modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow, fifthActionRow);

    await interaction.showModal(modal);
}
