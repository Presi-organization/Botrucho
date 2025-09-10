import { BaseInteraction } from 'discord.js';
import { IIntCreateHandler } from '@/events/discord/interactionCreateHandlers';
import { Botrucho, ICronData } from '@/mongodb';
import { showEditCronModal } from '@/utils';

export class RetryModalHandler implements IIntCreateHandler {
  private client: Botrucho;

  constructor(client: Botrucho) {
    this.client = client;
  }

  handle = async (interaction: BaseInteraction): Promise<boolean> => {
    if (!interaction.isButton()) return false;
    if (!interaction.customId.includes('retry-cron-modal')) return false;
    const cronId: string | undefined = interaction.customId.split(':')[1];
    if (!cronId) return false;
    const cronJob: ICronData | null = await this.client.cronData.getCronById(cronId);
    if (!cronJob) return false;
    await showEditCronModal(interaction, cronJob);
    return true;
  }
}
