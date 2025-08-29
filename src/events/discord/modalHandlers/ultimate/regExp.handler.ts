import { Botrucho, ICronData } from '@/mongodb';
import {
  ActionRowBuilder,
  BaseInteraction,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';

export class RegExpHandler {
  private client: Botrucho;
  private readonly pattern: RegExp = /^(\*|([0-5]?\d)) (\*|([01]?\d|2[0-3])) (\*|([1-9]|[12]\d|3[01])) (\*|(0?[1-9]|1[0-2])) (\*|[0-6])$/;
  private readonly flags: string = 'gi';
  private readonly cronJob: ICronData;

  constructor(client: Botrucho, cronJob: ICronData) {
    this.client = client;
    this.cronJob = cronJob;
  }

  testPattern = (input: string): boolean => {
    const regex = new RegExp(this.pattern, this.flags);
    return regex.test(input);
  }

  modal = async (interaction: BaseInteraction) => {
    if (!interaction.isModalSubmit()) return false;
    if (interaction.customId !== 'edit-cron-modal') return false;

    const newCron: string = interaction.fields.getTextInputValue('editCronInput');
    if (!this.testPattern(newCron)) {
      const retryButton: ButtonBuilder = new ButtonBuilder()
        .setCustomId('retry-cron-modal')
        .setLabel('Try Again')
        .setStyle(ButtonStyle.Primary);

      const row: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder<ButtonBuilder>().addComponents(retryButton);

      const invalidResponse = await interaction.reply({
        content: 'Invalid cron expression. Please use the format: `* * * * *`',
        components: [row],
        flags: MessageFlags.Ephemeral,
        withResponse: true
      });
    }
    await this.client.cronData.createOrUpdateCron({ ...this.cronJob, cronExpression: newCron, isActive: true });
    await interaction.reply({
      content: `Cron expression updated to: \`${newCron}\``,
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  private buildModal = () => {
    return new ModalBuilder()
      .setCustomId('edit-cron-modal')
      .setTitle('Edit Cron Expression')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('editCronInput')
            .setLabel('New Cron Expression')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('0 0 * * *')
        )
      );
  }
}
