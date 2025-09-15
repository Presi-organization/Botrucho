import { CronDataModel, ICronData } from '@/mongodb/models/CronData';

export class CronDataController {
  async getAllCrones(): Promise<ICronData[]> {
    return CronDataModel
      .find({ isActive: true })
      .select('cronId cronName cronExpression isActive runOnInit lastRun nextRun metadata')
      .lean({ virtuals: true });
  }

  async getCronById(cronId: string): Promise<ICronData | null> {
    return CronDataModel.findOne({ cronId }).lean({ virtuals: true });
  }

  async createOrUpdateCron(cronData: ICronData): Promise<ICronData> {
    const {
      cronId,
      cronName,
      cronExpression,
      lastRun,
      isActive,
      runOnInit,
      metadata
    } = cronData;

    const filter = cronId ? { cronId } : { cronName };

    if (!cronId && (!cronName || !cronExpression)) {
      throw new Error('Provide cronId, or provide cronName and cronExpression.');
    }

    const update = {
      $set: {
        ...(cronName !== undefined && { cronName }),
        ...(cronExpression !== undefined && { cronExpression }),
        ...(lastRun !== undefined && { lastRun: lastRun ?? null }),
        ...(isActive !== undefined && { isActive }),
        ...(runOnInit !== undefined && { runOnInit }),
        ...(metadata !== undefined && { metadata: metadata ?? {} }),
      },
    };

    return CronDataModel.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    });
  }

  async deleteCron(cronId: string): Promise<void> {
    await CronDataModel.deleteOne({ cronId });
  }
}
