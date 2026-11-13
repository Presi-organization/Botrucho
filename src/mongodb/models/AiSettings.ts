import { model, Schema } from 'mongoose';

import type { AiSettings } from '@/types';

// Singleton document (_id 'global'); defaults live in runtime/ai-settings.
const schema = new Schema<AiSettings & { _id: string }>(
  {
    _id: { type: String, required: true },
    model: String,
    thinkingLevel: String,
    googleSearch: Boolean,
    maxInputChars: Number,
    maxOutputTokens: Number,
    systemInstruction: String,
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

export const AiSettingsModel = model<AiSettings & { _id: string }>('AiSettings', schema);
