import type { AiLimits, AiSettings, ThinkingLevelSetting } from '@/types';

export interface SettingsStore {
  load(): PromiseLike<Partial<AiSettings> | null>;
  save(settings: AiSettings): PromiseLike<unknown>;
}

export const THINKING_LEVELS: ThinkingLevelSetting[] = ['minimal', 'low', 'medium', 'high'];
export const MAX_INSTRUCTION_CHARS = 4000; // Discord's text input limit

export const defaultAiSettings = (systemInstruction: string): AiSettings => ({
  model: 'gemini-3.1-flash-lite',
  thinkingLevel: 'low',
  googleSearch: false,
  maxInputChars: 500,
  maxOutputTokens: 512,
  systemInstruction,
  limits: {
    userCooldownSec: 20,
    userDaily: 15,
    guildDaily: 60,
    globalDaily: 150,
    globalDailyTokens: 75_000,
  },
});

export class AiSettingsStore {
  private cached?: { settings: AiSettings; at: number };

  constructor(
    private readonly store: SettingsStore,
    private readonly defaults: () => AiSettings,
    private readonly ttlMs = 30_000,
    private readonly now: () => number = Date.now,
  ) {}

  async get(): Promise<AiSettings> {
    if (this.cached && this.now() - this.cached.at < this.ttlMs) return this.cached.settings;
    const defaults = this.defaults();
    const stored = (await this.store.load()) ?? {};
    const settings: AiSettings = {
      ...defaults,
      ...stored,
      limits: { ...defaults.limits, ...stored.limits },
    };
    this.cached = { settings, at: this.now() };
    return settings;
  }

  async update(patch: Partial<Omit<AiSettings, 'limits'>> & { limits?: AiLimits }) {
    const settings: AiSettings = { ...(await this.get()), ...patch };
    await this.store.save(settings);
    this.cached = { settings, at: this.now() };
    return settings;
  }
}

export type FormResult<T> = { ok: true; value: T } | { ok: false; error: string };

const parseInteger = (raw: string, label: string, min: number, max: number): number | string => {
  const value = raw.trim();
  if (!/^\d+$/.test(value) || +value < min || +value > max)
    return `${label} must be a whole number between ${min} and ${max}.`;
  return +value;
};

const collect = <T>(fields: Record<keyof T, number | string>): FormResult<T> => {
  const error = Object.values<number | string>(fields).find((value) => typeof value === 'string');
  return typeof error === 'string' ? { ok: false, error } : { ok: true, value: fields as T };
};

export const parseLimitsForm = (values: Record<keyof AiLimits, string>): FormResult<AiLimits> =>
  collect<AiLimits>({
    userCooldownSec: parseInteger(values.userCooldownSec, 'Cooldown', 0, 86_400),
    userDaily: parseInteger(values.userDaily, 'Per-user daily', 0, 100_000),
    guildDaily: parseInteger(values.guildDaily, 'Per-server daily', 0, 100_000),
    globalDaily: parseInteger(values.globalDaily, 'Global daily', 0, 1_000_000),
    globalDailyTokens: parseInteger(values.globalDailyTokens, 'Daily tokens', 0, 1_000_000_000),
  });

type ModelForm = Pick<
  AiSettings,
  'model' | 'thinkingLevel' | 'googleSearch' | 'maxInputChars' | 'maxOutputTokens'
>;

export const parseModelForm = (values: Record<keyof ModelForm, string>): FormResult<ModelForm> => {
  const model = values.model.trim();
  if (!/^[\w.-]+$/.test(model)) return { ok: false, error: 'Model must be a model ID.' };
  const thinkingLevel = values.thinkingLevel.trim().toLowerCase() as ThinkingLevelSetting;
  if (!THINKING_LEVELS.includes(thinkingLevel))
    return { ok: false, error: `Thinking level must be one of: ${THINKING_LEVELS.join(', ')}.` };
  const search = values.googleSearch.trim().toLowerCase();
  if (!['on', 'off'].includes(search))
    return { ok: false, error: 'Google Search must be `on` or `off`.' };

  const numbers = collect<Pick<ModelForm, 'maxInputChars' | 'maxOutputTokens'>>({
    maxInputChars: parseInteger(values.maxInputChars, 'Max input chars', 1, 4000),
    maxOutputTokens: parseInteger(values.maxOutputTokens, 'Max output tokens', 1, 65_536),
  });
  if (!numbers.ok) return numbers;
  return {
    ok: true,
    value: { model, thinkingLevel, googleSearch: search === 'on', ...numbers.value },
  };
};

export const parseInstructionForm = (raw: string): FormResult<string> => {
  const value = raw.trim();
  if (!value) return { ok: false, error: 'Instructions cannot be empty.' };
  if (value.length > MAX_INSTRUCTION_CHARS)
    return {
      ok: false,
      error: `Instructions must be at most ${MAX_INSTRUCTION_CHARS} characters.`,
    };
  return { ok: true, value };
};
