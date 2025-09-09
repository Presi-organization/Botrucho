import { randomUUID } from 'crypto';
import mongoose, { Schema } from 'mongoose';

export interface ICronData {
  cronId?: string;
  cronName: string;
  cronExpression: string;
  lastRun?: Date | null;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

const CronDataSchema = new Schema<ICronData>({
  cronId: { type: String, unique: true, default: () => randomUUID() },
  cronName: { type: String, required: true },
  cronExpression: { type: String, required: true },
  lastRun: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  metadata: { type: Object, default: {} } // Ensure metadata is an object
});

export const CronDataModel = mongoose.model<ICronData>('CronData', CronDataSchema);
