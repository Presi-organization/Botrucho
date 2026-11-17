import {
  ActionRowBuilder,
  BaseInteraction,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  inlineCode,
  MessageFlags,
  ModalSubmitInteraction,
} from 'discord.js';

import { IIntCreateHandler } from '@/events/discord/interactionCreateHandlers';
import { validateCronEdit } from '@/events/discord/interactionCreateHandlers/modalHandlers/cronJobs/cron-edit.validation';
import { Botrucho, ICronData } from '@/mongodb';
import { CronsKeys, TranslationElement } from '@/types';
import { Error, Success } from '@/utils';

export class EditCronHandler implements IIntCreateHandler {
  private client: Botrucho;

  constructor(client: Botrucho) {
    this.client = client;
  }

  handle = async (interaction: BaseInteraction): Promise<boolean> => {
    if (!interaction.isModalSubmit()) return false;
    if (!interaction.customId.includes('cron-setup-modal')) return false;

    const lang = interaction.guild
      ? (await interaction.guild.fetchDB(this.client.guildData)).lang
      : undefined;
    const t = interaction.translate('CRONS', lang) as TranslationElement<CronsKeys>;

    const nameInput = interaction.fields.getTextInputValue('cron-edit-name-input');
    const cronId = interaction.customId.split(':')[1];

    const existingCron: ICronData | null = await this.client.cronData.getCronById(cronId);
    if (!existingCron) {
      await interaction.reply({
        embeds: [Error({ description: t.JOB_NOT_FOUND })],
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
      const description = t[result.error].replace('${fields}', (result.fields ?? []).join(', '));
      await this._replyWithRetry(interaction, cronId, Error({ description }), t.TRY_AGAIN);
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
          title: t.UPDATED_TITLE,
          description: t.UPDATED_DESCRIPTION.replace('${name}', nameInput)
            .replace('${cron}', inlineCode(cronExpression))
            .replace('${runOnInit}', inlineCode(String(runOnInit)))
            .replace('${metadata}', JSON.stringify(metadata, null, 2)),
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
    embed: EmbedBuilder,
    label: string,
  ): Promise<void> => {
    const retryButton = new ButtonBuilder()
      .setCustomId(`retry-cron-modal:${cronId}`)
      .setLabel(label)
      .setStyle(ButtonStyle.Primary);
    await interaction.reply({
      embeds: [embed],
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(retryButton)],
      flags: MessageFlags.Ephemeral,
    });
  };
}
