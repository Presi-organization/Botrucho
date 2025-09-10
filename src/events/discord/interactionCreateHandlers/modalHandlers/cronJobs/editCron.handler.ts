import {
  ActionRowBuilder,
  BaseInteraction,
  ButtonBuilder,
  ButtonStyle,
  Collection,
  inlineCode,
  MessageFlags,
  TextInputModalData
} from 'discord.js';
import cron from 'node-cron';
import { IIntCreateHandler } from '@/events/discord/interactionCreateHandlers';
import { Botrucho, ICronData } from '@/mongodb';
import { Success } from '@/utils';

export class EditCronHandler implements IIntCreateHandler {
  private client: Botrucho;
  private readonly emojiRegex: RegExp = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
  private readonly discordEmojiRegex: RegExp = /<a?:[a-zA-Z0-9_]+:[0-9]+>/g;

  constructor(client: Botrucho) {
    this.client = client;
  }

  handle = async (interaction: BaseInteraction): Promise<boolean> => {
    if (!interaction.isModalSubmit()) return false;
    if (!interaction.customId.includes('cron-setup-modal')) return false;

    const nameInput: string = interaction.fields.getTextInputValue('cron-edit-name-input');
    const cronInput: string = interaction.fields.getTextInputValue('cron-edit-cron-input');
    const metadataInput: Collection<string, TextInputModalData> = interaction.fields.fields.filter((field: TextInputModalData) => field.customId.startsWith('cron-edit-metadata-input:'));
    const metadata: Record<string, unknown> = {};
    metadataInput.forEach((field: TextInputModalData) => {
      const key: string = field.customId.split(':')[1];
      try {
        metadata[key] = JSON.parse(field.value);
      } catch {
        metadata[key] = field.value;
      }
    });

    const cronId: string = interaction.customId.split(':')[1];
    const existingCron: ICronData | null = await this.client.cronData.getCronById(cronId);
    if (!existingCron) {
      await interaction.reply({ content: 'Error: Cron job not found', flags: MessageFlags.Ephemeral });
      return true;
    }

    // Validate cron pattern
    if (!this._testPattern(cronInput)) {
      const retryButton: ButtonBuilder = new ButtonBuilder()
        .setCustomId(`retry-cron-modal:${cronId}`)
        .setLabel('Try Again')
        .setStyle(ButtonStyle.Primary);

      const row: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>().addComponents(retryButton);

      await interaction.reply({
        content: 'Invalid cron expression. Please use the format: `* * * * *`',
        components: [row],
        flags: MessageFlags.Ephemeral,
        withResponse: true
      });
      return true;
    }

    // Validate emoji fields in metadata
    const emojiValidation = this._findAndValidateEmojiFields(metadata);
    if (!emojiValidation.isValid) {
      const errorMessages: string = emojiValidation.invalidFields
        ?.map(field => `- Field "${field.field}": ${field.message}`)
        .join('\n') || 'Invalid emoji format in one or more fields.';

      const retryButton: ButtonBuilder = new ButtonBuilder()
        .setCustomId(`retry-cron-modal:${cronId}`)
        .setLabel('Try Again')
        .setStyle(ButtonStyle.Primary);

      const row: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>().addComponents(retryButton);

      await interaction.reply({
        content: `Invalid emoji content detected:\n${errorMessages}\n\nPlease use only valid emoji characters or Discord custom emojis.`,
        components: [row],
        flags: MessageFlags.Ephemeral,
        withResponse: true
      });
      return true;
    }

    await this.client.cronData.createOrUpdateCron({
      ...existingCron,
      cronName: nameInput,
      cronExpression: cronInput,
      metadata
    });

    await interaction.reply({
      embeds: [Success({
        title: 'Cron Job Updated',
        description: `The cron job has been updated successfully!\n\n**Name:** ${nameInput}\n**Cron:** ${inlineCode(cronInput)}\n**Metadata:** ${JSON.stringify(metadata, null, 2)}`
      })],
      flags: MessageFlags.Ephemeral
    });
    this.client.deleted_messages.add(interaction);
    return true;
  }

  private _testPattern = (input: string): boolean => {
    return cron.validate(input);
  }

  /**
   * Validates if a string contains only valid emojis
   * @param text The string to validate
   * @returns Object with validation result and error message if invalid
   */
  private _validateEmojis = (text: string): { isValid: boolean; message?: string } => {
    if (!text || text.trim() === '') {
      return { isValid: false, message: 'No emojis provided.' };
    }

    // Create a clean string without valid emojis
    let cleanText: string = text.replace(this.emojiRegex, '').replace(this.discordEmojiRegex, '');

    // Remove whitespace for checking
    cleanText = cleanText.replace(/\s/g, '');

    if (cleanText.length > 0) {
      return {
        isValid: false,
        message: 'Contains invalid characters. Please use only emoji characters or Discord custom emojis.'
      };
    }

    return { isValid: true };
  };

  private _findAndValidateEmojiFields = (metadata: Record<string, unknown>): {
    isValid: boolean;
    invalidFields?: { field: string; message: string }[]
  } => {
    const emojiFields: string[] = ['emojis', 'reactions', 'emoji'];
    const invalidFields: { field: string; message: string }[] = [];

    for (const field of Object.keys(metadata)) {
      const isEmojiField: boolean = emojiFields.some((emojiField: string) => field.toLowerCase().includes(emojiField.toLowerCase()));

      if (isEmojiField && typeof metadata[field] === 'string') {
        const validation = this._validateEmojis(metadata[field] as string);
        if (!validation.isValid) {
          invalidFields.push({
            field,
            message: validation.message || `Invalid emoji content in field '${field}'`
          });
        }
      }
    }

    return { isValid: invalidFields.length === 0, invalidFields: invalidFields.length > 0 ? invalidFields : undefined };
  }
}
