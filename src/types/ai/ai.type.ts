export type ThinkingLevelSetting = 'minimal' | 'low' | 'medium' | 'high';

export interface AiLimits {
  userCooldownSec: number;
  userDaily: number;
  guildDaily: number;
  globalDaily: number;
  globalDailyTokens: number;
}

export interface AiSettings {
  model: string;
  thinkingLevel: ThinkingLevelSetting;
  temperature: number;
  googleSearch: boolean;
  maxInputChars: number;
  maxOutputTokens: number;
  systemInstruction: string;
  limits: AiLimits;
}

/** What lives in Mongo: the instruction always comes from the repo file. */
export type StoredAiSettings = Omit<AiSettings, 'systemInstruction'>;
