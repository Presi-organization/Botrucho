import mongoose, { Document, Schema } from 'mongoose';

import config from '@/config';
import type { AudioEffectSettings } from '@/types';

export interface IGuildData extends Document {
  serverID: string;
  lang?: string;
  defaultVolume?: number;
  loopMode?: 'OFF' | 'AUTOPLAY' | 'TRACK' | 'QUEUE';
  audioEffects?: AudioEffectSettings;
  color?: string;
  disabledCommands: string[];
  aiEnabled?: boolean;
  defaultSpamChannelID?: string | null;
  footballChannelID?: string | null;
  footballLastPostDate?: string | null;
  plugins?: {
    welcome?: {
      status: boolean;
      message?: string | null;
      channel?: string | null;
      image?: boolean;
    };
    goodbye?: {
      status: boolean;
      message?: string | null;
      channel?: string | null;
      image?: boolean;
    };
    autoping?: {
      status: boolean;
      message?: string | null;
      channel?: string | null;
      image?: boolean;
    };
  };
  protections?: {
    anti_maj?: {
      status: boolean;
      message?: string | null;
      channel?: string | null;
      image?: boolean;
    };
    anti_spam?: {
      status: boolean;
      message?: string | null;
      channel?: string | null;
      image?: boolean;
    };
    anti_mentions?: {
      status: boolean;
      message?: string | null;
      channel?: string | null;
      image?: boolean;
    };
    anti_dc?: {
      status: boolean;
      message?: string | null;
      channel?: string | null;
      image?: boolean;
    };
    anti_pub?: string | null;
    antiraid_logs?: string | null;
  };
}

const GuildDataSchema = new Schema<IGuildData>({
  serverID: { type: String, required: true },
  lang: { type: String, default: config.defaultLanguage.toLowerCase() },
  defaultVolume: { type: Number, default: 60 },
  loopMode: { type: String, enum: ['OFF', 'AUTOPLAY', 'TRACK', 'QUEUE'], default: 'OFF' },
  audioEffects: {
    equalizer: { type: Boolean, default: false },
    resampler: { type: Boolean, default: false },
    biquad: { type: Boolean, default: false },
    compressor: { type: Boolean, default: false },
    reverb: { type: Boolean, default: false },
  },
  color: { type: String, default: config.color },
  disabledCommands: { type: [String], default: [] },
  aiEnabled: { type: Boolean, default: false },
  defaultSpamChannelID: { type: String, default: null },
  footballChannelID: { type: String, default: null },
  footballLastPostDate: { type: String, default: null },
  plugins: {
    type: Object,
    default: {
      welcome: {
        status: false,
        message: null,
        channel: null,
        image: false,
      },
      goodbye: {
        status: false,
        message: null,
        channel: null,
        image: false,
      },
      autoping: {
        status: false,
        message: null,
        channel: null,
        image: false,
      },
    },
  },
  protections: {
    type: Object,
    default: {
      anti_maj: {
        status: false,
        message: null,
        channel: null,
        image: false,
      },
      anti_spam: {
        status: false,
        message: null,
        channel: null,
        image: false,
      },
      anti_mentions: {
        status: false,
        message: null,
        channel: null,
        image: false,
      },
      anti_dc: {
        status: false,
        message: null,
        channel: null,
        image: false,
      },
      anti_pub: null,
      antiraid_logs: null,
    },
  },
});

export const GuildDataModel = mongoose.model<IGuildData>('GuildData', GuildDataSchema);
