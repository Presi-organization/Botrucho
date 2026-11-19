import { model, Schema } from 'mongoose';

import type { StoredAiSettings } from '@/types';

const schema = new Schema<StoredAiSettings & { _id: string }>(
  {
    _id: { type: String, required: true },
    model: String,
    thinkingLevel: String,
    temperature: Number,
    googleSearch: Boolean,
    maxInputChars: Number,
    maxOutputTokens: Number,
    limits: {
      userCooldownSec: Number,
      userDaily: Number,
      guildDaily: Number,
      globalDaily: Number,
      globalDailyTokens: Number,
    },
  },
  { versionKey: false },
);

export const AiSettingsModel = model<StoredAiSettings & { _id: string }>('AiSettings', schema);
