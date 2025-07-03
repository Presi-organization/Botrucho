import mongoose, { Schema } from 'mongoose';

export interface IBotInstance extends Document {
  instanceId: string;
  lastHeartbeat: Date;
  uptime: number;
}

const BotInstanceSchema = new Schema<IBotInstance>({
  instanceId: { type: String, required: true, unique: true },
  lastHeartbeat: { type: Schema.Types.Date, required: true, expires: 20 },
  uptime: { type: Number, required: true },
});

export const BotInstanceDataModel = mongoose.model<IBotInstance>('BotInstanceData', BotInstanceSchema);
