import { CommandInteraction, Message, StringSelectMenuInteraction } from 'discord.js';
import { schedule, ScheduledTask } from 'node-cron';

import { Botrucho, ICronData } from '@/mongodb';
import { withTimeout } from '@/runtime/lifecycle';
import { postDailyFootball } from '@/services/football';
import { initializeFrisbeeEventCron, sendReminderToConfirmAttendance } from '@/services/webhooks';
import { logger } from '@/utils';
import { workerRadarProcess } from '@/workers/radar.process';

const FOOTBALL_DAILY = { cronName: 'footballDaily', cronExpression: '0 8 * * *' };

export class CronManager {
  private readonly client: Botrucho;
  private activeTasks: Map<string, ScheduledTask> = new Map<string, ScheduledTask>();
  private running = new Map<string, Promise<void>>();
  private stopping = false;

  constructor(client: Botrucho) {
    this.client = client;
  }

  async initializeCronJobs(): Promise<void> {
    const cronJobs: ICronData[] = await this.client.cronData.getAllCrones();

    if (!cronJobs.some((job) => job.cronName === FOOTBALL_DAILY.cronName)) {
      cronJobs.push(
        await this.client.cronData.createOrUpdateCron({ ...FOOTBALL_DAILY, isActive: true }),
      );
    }

    for (const job of cronJobs) {
      if (job.isActive) {
        this.addCronJob(job);
      }
    }

    logger.log(`Initialized ${this.activeTasks.size} cron jobs`);
  }

  addCronJob(job: ICronData): void {
    if (this.stopping) return;
    // Remove existing task if it exists
    this.removeCronJob(job.cronId as string);
    const cronId = job.cronId as string;

    const run = () => {
      if (this.stopping) return Promise.resolve();
      const current = this.running.get(cronId);
      if (current) return current;
      const pending = this.executeCronJob(job);
      this.running.set(cronId, pending);
      const release = () => {
        if (this.running.get(cronId) === pending) this.running.delete(cronId);
      };
      void pending.then(release, release);
      return pending;
    };
    const task: ScheduledTask = schedule(job.cronExpression, run, {
      timezone: 'America/Bogota',
      noOverlap: true,
    });
    if (job.runOnInit) void run();

    this.activeTasks.set(job.cronId as string, task);
    logger.warn(`Added cron job: ${job.cronName} (${job.cronExpression})`);
  }

  removeCronJob(cronId: string): void {
    const task: ScheduledTask | undefined = this.activeTasks.get(cronId);
    if (task) {
      void task.destroy();
      this.activeTasks.delete(cronId);
      logger.warn(`Removed cron job: ${cronId}`);
    }
  }

  updateCronJob(job: ICronData): void {
    if (job.isActive)
      this.addCronJob(job); // Will replace existing
    else this.removeCronJob(job.cronId as string);
  }

  async shutdown(): Promise<void> {
    this.stopping = true;
    const tasks = [...this.activeTasks.values()];
    this.activeTasks.clear();
    await Promise.all(tasks.map((task) => task.destroy()));
    await withTimeout(Promise.allSettled(this.running.values()), 2_000, 'Cron drain');
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
        case 'reminderUltimateFrisbeeConfirmAttendance':
          await sendReminderToConfirmAttendance(this.client);
          break;
        case 'footballDaily':
          await postDailyFootball(this.client);
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
          else if (
            interaction instanceof CommandInteraction ||
            interaction instanceof StringSelectMenuInteraction
          )
            await interaction.deleteReply();
        }
      } catch (error: unknown) {
        logger.error('Error deleting interaction reply:', error);
      }
    }
  }
}
