import { CommandInteraction, Message, StringSelectMenuInteraction } from 'discord.js';
import { schedule, ScheduledTask, ScheduleOptions } from 'node-cron';
import { Botrucho, ICronData } from '@/mongodb';
import { initializeFrisbeeEventCron } from '@/services/webhooks';
import { logger } from '@/utils';
import { workerRadarProcess } from '@/workers/radar.process';

export class CronManager {
  private readonly client: Botrucho;
  private activeTasks: Map<string, ScheduledTask> = new Map<string, ScheduledTask>();

  constructor(client: Botrucho) {
    this.client = client;
  }

  async initializeCronJobs(): Promise<void> {
    const cronJobs: ICronData[] = await this.client.cronData.getAllCrones();

    for (const job of cronJobs) {
      if (job.isActive) {
        this.addCronJob(job);
      }
    }

    logger.log(`Initialized ${this.activeTasks.size} cron jobs`);
  }

  addCronJob(job: ICronData): void {
    // Remove existing task if it exists
    this.removeCronJob(job.cronId as string);

    const scheduleOptions: ScheduleOptions = {
      timezone: 'America/Bogota',
      runOnInit: job.runOnInit
    }
    const task: ScheduledTask = schedule(job.cronExpression, async () => {
      await this.executeCronJob(job);
    }, scheduleOptions);

    this.activeTasks.set(job.cronId as string, task);
    logger.warn(`Added cron job: ${job.cronName} (${job.cronExpression})`);
  }

  removeCronJob(cronId: string): void {
    const task: ScheduledTask | undefined = this.activeTasks.get(cronId);
    if (task) {
      task.stop();
      this.activeTasks.delete(cronId);
      logger.warn(`Removed cron job: ${cronId}`);
    }
  }

  updateCronJob(job: ICronData): void {
    if (job.isActive) this.addCronJob(job); // Will replace existing
    else this.removeCronJob(job.cronId as string);
  }

  private async executeCronJob(job: ICronData): Promise<void> {
    try {
      // Update last run time
      await this.client.cronData.createOrUpdateCron({ ...job, lastRun: new Date() });

      // Execute the job
      switch (job.cronName) {
        case 'ultimateFrisbee':
          await initializeFrisbeeEventCron(this.client);
          break;
        case 'workerRadarProcess':
          await workerRadarProcess();
          break;
        case 'deleteNonBotMessages':
          await this.deleteNonBotMessages();
          break;
        default:
          logger.warn(`Unknown cron job: ${job.cronName}`);
      }
    } catch (error) {
      logger.error(`Error executing cron job ${job.cronName}:`, error);
    }
  }

  private async deleteNonBotMessages(): Promise<void> {
    for (const interaction of this.client.deleted_messages) {
      try {
        if (this.client.deleted_messages.delete(interaction)) {
          if (interaction instanceof Message) await interaction.delete();
          else if (interaction instanceof CommandInteraction || interaction instanceof StringSelectMenuInteraction) await interaction.deleteReply();
        }
      } catch (error: unknown) {
        logger.error('Error deleting interaction reply:', error);
      }
    }
  }
}
