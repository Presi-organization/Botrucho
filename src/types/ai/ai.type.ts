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
  googleSearch: boolean;
  maxInputChars: number;
  maxOutputTokens: number;
  systemInstruction: string;
  limits: AiLimits;
}
