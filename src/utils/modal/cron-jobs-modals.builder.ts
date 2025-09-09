import {
  ActionRowBuilder,
  ButtonInteraction,
  ModalBuilder,
  StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { ICronData } from '@/mongodb';

export const showEditCronModal = (interaction: StringSelectMenuInteraction | ButtonInteraction, cronJob: ICronData): Promise<void> => {
  const metadataFields: [string, unknown][] | [] = cronJob.metadata ? Object.entries(cronJob.metadata) : [];
  const metadataTextBuilders: ActionRowBuilder<TextInputBuilder>[] = metadataFields.map(([key, value]) =>
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId(`cron-edit-metadata-input:${key}`)
        .setLabel(`Metadata ${key.charAt(0).toUpperCase() + key.slice(1)}`)
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setValue(typeof value === 'string' ? value : JSON.stringify(value))
        .setPlaceholder('Metadata value')
    )
  );
  const cronModal: ModalBuilder = new ModalBuilder()
    .setCustomId(`cron-setup-modal:${cronJob.cronId}`)
    .setTitle('Edit Cron Job')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('cron-edit-name-input')
          .setLabel('Cron Job Name')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue(cronJob.cronName)
          .setPlaceholder('Weekly Ultimate Frisbee')
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('cron-edit-cron-input')
          .setLabel('Cron Expression')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue(cronJob.cronExpression)
          .setPlaceholder('* * * * *')
      ),
      ...metadataTextBuilders
    );

  return interaction.showModal(cronModal);
};

export const showAddMetadataFieldModal = (interaction: StringSelectMenuInteraction | ButtonInteraction, cronJob: ICronData): Promise<void> => {
  const cronModal: ModalBuilder = new ModalBuilder()
    .setCustomId(`cron-add-metadata-field-modal:${cronJob.cronId}`)
    .setTitle('Add Metadata Field')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('cron-add-metadata-key-input')
          .setLabel('Metadata Key')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder('e.g., location')
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('cron-add-metadata-value-input')
          .setLabel('Metadata Value')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setPlaceholder('e.g., New York City')
      )
    );

  return interaction.showModal(cronModal);
}
