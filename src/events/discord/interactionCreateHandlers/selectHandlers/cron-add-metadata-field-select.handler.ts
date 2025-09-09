import { BaseInteraction } from 'discord.js';
import { IIntCreateHandler } from '@/events/discord/interactionCreateHandlers';
import { Botrucho, ICronData } from '@/mongodb';
import { showAddMetadataFieldModal } from '@/utils';

/**
 * Handles the selection of options in the cron add metadata field select menu.
 * Depending on the selected option, it triggers the appropriate modal for adding metadata fields.
 */
export class CronAddMetadataFieldSelectHandler implements IIntCreateHandler {
  private client: Botrucho;

  constructor(client: Botrucho) {
    this.client = client;
  }

  handle = async (interaction: BaseInteraction): Promise<boolean> => {
    if (!interaction.isStringSelectMenu()) return false;
    if (interaction.customId !== 'cron-add-metadata-field-select') return false;

    this.client.deleted_messages.add(interaction);
    const selectedValue: string = interaction.values[0];
    const cronJob: ICronData | null = await this.client.cronData.getCronById(selectedValue);
    if (!cronJob) return false;
    await showAddMetadataFieldModal(interaction, cronJob);
    return true;
  }
}
