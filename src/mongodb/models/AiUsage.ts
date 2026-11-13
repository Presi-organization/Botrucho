import { model, Schema } from 'mongoose';

interface IAiUsage {
  _id: string;
  count: number;
  tokens: number;
  expiresAt: Date;
}

// One counter per scope and UTC day; TTL drops old days.
const schema = new Schema<IAiUsage>(
  {
    _id: { type: String, required: true },
    count: { type: Number, default: 0 },
    tokens: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { versionKey: false },
);

export const AiUsageModel = model<IAiUsage>('AiUsage', schema);
