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
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('cron-edit-run-on-init-input')
          .setLabel('Run on Init (true/false)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setValue(cronJob.runOnInit ? 'true' : 'false')
          .setPlaceholder('false')
          .setMinLength(4)  // Length of "true"
          .setMaxLength(5)  // Length of "false"
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('cron-edit-metadata-input')
          .setLabel('Metadata')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setValue(JSON.stringify(cronJob.metadata || {}))
          .setPlaceholder('{"key": "value"}')
      )
    );

  return interaction.showModal(cronModal);
};
