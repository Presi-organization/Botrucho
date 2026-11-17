import {
  ActionRowBuilder,
  ButtonInteraction,
  ModalBuilder,
  StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

import { ICronData } from '@/mongodb';
import { CronsKeys, TranslationElement } from '@/types';

export const showEditCronModal = (
  interaction: StringSelectMenuInteraction | ButtonInteraction,
  cronJob: ICronData,
  lang?: string,
): Promise<void> => {
  const t = interaction.translate('CRONS', lang) as TranslationElement<CronsKeys>;
  const cronModal: ModalBuilder = new ModalBuilder()
    .setCustomId(`cron-setup-modal:${cronJob.cronId}`)
    .setTitle(t.MODAL_TITLE)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('cron-edit-name-input')
          .setLabel(t.LABEL_NAME)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue(cronJob.cronName)
          .setPlaceholder('Weekly Ultimate Frisbee'),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('cron-edit-cron-input')
          .setLabel(t.LABEL_CRON)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue(cronJob.cronExpression)
          .setPlaceholder('* * * * *'),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('cron-edit-run-on-init-input')
          .setLabel(t.LABEL_RUN_ON_INIT)
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setValue(cronJob.runOnInit ? 'true' : 'false')
          .setPlaceholder('false')
          .setMinLength(4) // Length of "true"
          .setMaxLength(5), // Length of "false"
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('cron-edit-metadata-input')
          .setLabel(t.LABEL_METADATA)
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setValue(JSON.stringify(cronJob.metadata || {}))
          .setPlaceholder('{"key": "value"}'),
      ),
    );

  return interaction.showModal(cronModal);
};
