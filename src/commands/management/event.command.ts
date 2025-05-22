import {
  ActionRowBuilder,
  CommandInteraction,
  ModalBuilder,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { IGuildData } from '@/mongodb';
import { EventKeys, ICommand, TranslationElement } from '@/types';

export default class EventCommand extends ICommand {
  name = 'event';
  description = 'Create an event';
  data: SlashCommandOptionsOnlyBuilder = new SlashCommandBuilder()
    .setName('event')
    .setDescription('Create an event');

  async execute(interaction: CommandInteraction, guildDB: IGuildData): Promise<void> {
    const {
      MODAL_TITLE,
      NAME,
      DATE,
      TIME,
      DESCRIPTION,
      LOCATION
    }: TranslationElement<EventKeys> = interaction.translate('EVENT', guildDB.lang);

    const modal: ModalBuilder = new ModalBuilder()
      .setCustomId('event-modal')
      .setTitle(MODAL_TITLE);

    const eventNameInput: TextInputBuilder = new TextInputBuilder()
      .setCustomId('eventNameInput')
      .setLabel(NAME)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const eventDateInput: TextInputBuilder = new TextInputBuilder()
      .setCustomId('eventDateInput')
      .setLabel(DATE)
      .setValue(new Date().toJSON().slice(0, 10).replace(/-/g, ''))
      .setMinLength(8)
      .setMaxLength(8)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const eventTimeInput: TextInputBuilder = new TextInputBuilder()
      .setCustomId('eventTimeInput')
      .setLabel(TIME)
      .setPlaceholder('18:00-20:00')
      .setMinLength(11)
      .setMaxLength(11)
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const eventDescriptionInput: TextInputBuilder = new TextInputBuilder()
      .setCustomId('eventDescriptionInput')
      .setLabel(DESCRIPTION)
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const eventLinkInput: TextInputBuilder = new TextInputBuilder()
      .setCustomId('eventLinkInput')
      .setLabel(LOCATION)
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
}
