import { BotInstanceDataModel } from '@/mongodb';

export class BotInstanceDataController {
  async isAnotherInstanceRunning(instanceId: string): Promise<boolean> {
    const fifteenSecondsAgo = new Date(Date.now() - 15000);
    return !!(await BotInstanceDataModel.findOne({
      instanceId: { $ne: instanceId },
      lastHeartbeat: { $gte: fifteenSecondsAgo }
    }));
  }

  async updateHeartbeat(instanceId: string): Promise<void> {
    await BotInstanceDataModel.findOneAndUpdate(
      { instanceId },
      { lastHeartbeat: new Date(), uptime: Math.floor(process.uptime()) },
      { upsert: true }
    );
  }

  async clearInstance(instanceId: string): Promise<void> {
    await BotInstanceDataModel.deleteOne({ instanceId });
  }
}
