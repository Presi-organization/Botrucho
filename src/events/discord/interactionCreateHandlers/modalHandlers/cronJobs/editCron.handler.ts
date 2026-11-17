import {
  ActionRowBuilder,
  BaseInteraction,
  ButtonBuilder,
  ButtonStyle,
  inlineCode,
  MessageFlags,
  ModalSubmitInteraction,
} from 'discord.js';

import { IIntCreateHandler } from '@/events/discord/interactionCreateHandlers';
import { validateCronEdit } from '@/events/discord/interactionCreateHandlers/modalHandlers/cronJobs/cron-edit.validation';
import { Botrucho, ICronData } from '@/mongodb';
import { Success } from '@/utils';

export class EditCronHandler implements IIntCreateHandler {
  private client: Botrucho;

  constructor(client: Botrucho) {
    this.client = client;
  }

  handle = async (interaction: BaseInteraction): Promise<boolean> => {
    if (!interaction.isModalSubmit()) return false;
    if (!interaction.customId.includes('cron-setup-modal')) return false;

    const nameInput = interaction.fields.getTextInputValue('cron-edit-name-input');
    const cronId = interaction.customId.split(':')[1];

    const existingCron: ICronData | null = await this.client.cronData.getCronById(cronId);
    if (!existingCron) {
      await interaction.reply({
        content: 'Error: Cron job not found',
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    const result = validateCronEdit({
      cronExpression: interaction.fields.getTextInputValue('cron-edit-cron-input'),
      runOnInit: interaction.fields.getTextInputValue('cron-edit-run-on-init-input'),
      metadata: interaction.fields.getTextInputValue('cron-edit-metadata-input'),
    });
    if (!result.ok) {
      await this._replyWithRetry(interaction, cronId, result.message);
      return true;
    }

    const { cronExpression, runOnInit, metadata } = result.values;
    const updatedCron: ICronData = await this.client.cronData.createOrUpdateCron({
      ...existingCron,
      cronName: nameInput,
      cronExpression,
      runOnInit,
      metadata,
    });
    if (updatedCron && this.client.cronManager) this.client.cronManager.updateCronJob(updatedCron);

    await interaction.reply({
      embeds: [
        Success({
          title: 'Cron Job Updated',
          description: `The cron job has been updated successfully!\n\n**Name:** ${nameInput}\n**Cron:** ${inlineCode(cronExpression)}\n**Run-On-Init:** ${inlineCode(String(runOnInit))}\n**Metadata:** ${JSON.stringify(metadata, null, 2)}`,
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });
    this.client.deleted_messages.add(interaction);
    return true;
  };

  private _replyWithRetry = async (
    interaction: ModalSubmitInteraction,
    cronId: string,
    content: string,
  ): Promise<void> => {
    const retryButton = new ButtonBuilder()
      .setCustomId(`retry-cron-modal:${cronId}`)
      .setLabel('Try Again')
      .setStyle(ButtonStyle.Primary);
    await interaction.reply({
      content,
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(retryButton)],
      flags: MessageFlags.Ephemeral,
    });
  };
}
