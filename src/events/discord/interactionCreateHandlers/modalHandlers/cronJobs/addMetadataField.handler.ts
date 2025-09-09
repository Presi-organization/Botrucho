import { IIntCreateHandler } from '@/events/discord/interactionCreateHandlers';
import { BaseInteraction, MessageFlags } from 'discord.js';
import { Botrucho, ICronData } from '@/mongodb';

export class AddMetadataFieldHandler implements IIntCreateHandler {
  private client: Botrucho;

  constructor(client: Botrucho) {
    this.client = client;
  }

  handle = async (interaction: BaseInteraction): Promise<boolean> => {
    if (!interaction.isModalSubmit()) return false;
    if (!interaction.customId.includes('cron-add-metadata-field-modal')) return false;

    const fieldKey: string = interaction.fields.getTextInputValue('cron-add-metadata-key-input');
    const fieldValue: string = interaction.fields.getTextInputValue('cron-add-metadata-value-input');

    const cronId: string = interaction.customId.split(':')[1];
    const existingCron: ICronData | null = await this.client.cronData.getCronById(cronId);
    if (!existingCron) {
      await interaction.reply({ content: 'Error: Cron job not found', flags: MessageFlags.Ephemeral });
      return true;
    }
    if (existingCron.metadata && Object.prototype.hasOwnProperty.call(existingCron.metadata, fieldKey)) {
      await interaction.reply({
        content: `Error: Metadata field with key "${fieldKey}" already exists. Please choose a different key.`,
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    // Attempt to parse the value as JSON, fallback to string if parsing fails
    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(fieldValue);
    } catch {
      parsedValue = fieldValue;
    }

    const updatedMetadata = {
      ...existingCron.metadata,
      [fieldKey]: parsedValue
    };

    await this.client.cronData.createOrUpdateCron({ ...existingCron, metadata: updatedMetadata });
    await interaction.reply({
      content: `Successfully added metadata field "${fieldKey}".`,
      flags: MessageFlags.Ephemeral
    });
    return true;
  }
}
