import type { AiLimits, AiSettings, StoredAiSettings, ThinkingLevelSetting } from '@/types';

export interface SettingsStore {
  load(): PromiseLike<Partial<StoredAiSettings> | null>;
  save(settings: StoredAiSettings): PromiseLike<unknown>;
}

export const THINKING_LEVELS: ThinkingLevelSetting[] = ['minimal', 'low', 'medium', 'high'];

export const defaultAiSettings = (systemInstruction: string): AiSettings => ({
  model: 'gemini-3.1-flash-lite',
  thinkingLevel: 'low',
  temperature: 1,
  googleSearch: false,
  maxInputChars: 500,
  maxOutputTokens: 1024,
  systemInstruction,
  limits: {
    userCooldownSec: 20,
    userDaily: 20,
    guildDaily: 160,
    globalDaily: 200,
    globalDailyTokens: 150_000,
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
      systemInstruction: defaults.systemInstruction,
      limits: { ...defaults.limits, ...stored.limits },
    };
    this.cached = { settings, at: this.now() };
    return settings;
  }

  async update(patch: Partial<Omit<StoredAiSettings, 'limits'>> & { limits?: AiLimits }) {
    const { systemInstruction, ...current } = await this.get();
    const stored: StoredAiSettings = { ...current, ...patch };
    await this.store.save(stored);
    const settings: AiSettings = { ...stored, systemInstruction };
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
  'model' | 'thinkingLevel' | 'temperature' | 'googleSearch' | 'maxInputChars' | 'maxOutputTokens'
>;

const MAX_TEMPERATURE = 2;

// The modal is capped at five inputs, so thinking level and temperature share one ("low, 1.0").
export const formatThinkingField = ({
  thinkingLevel,
  temperature,
}: Pick<AiSettings, 'thinkingLevel' | 'temperature'>): string => `${thinkingLevel}, ${temperature}`;

export const parseModelForm = (
  values: Record<Exclude<keyof ModelForm, 'temperature'>, string>,
): FormResult<ModelForm> => {
  const model = values.model.trim();
  if (!/^[\w.-]+$/.test(model)) return { ok: false, error: 'Model must be a model ID.' };
  const [levelRaw, temperatureRaw = ''] = values.thinkingLevel.split(',');
  const thinkingLevel = levelRaw.trim().toLowerCase() as ThinkingLevelSetting;
  if (!THINKING_LEVELS.includes(thinkingLevel))
    return { ok: false, error: `Thinking level must be one of: ${THINKING_LEVELS.join(', ')}.` };
  const temperature = Number(temperatureRaw.trim());
  if (!/^\d+(\.\d+)?$/.test(temperatureRaw.trim()) || temperature > MAX_TEMPERATURE)
    return {
      ok: false,
      error: `Write the thinking level and a temperature from 0 to ${MAX_TEMPERATURE}, like \`low, 1.0\`.`,
    };
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
    value: {
      model,
      thinkingLevel,
      temperature,
      googleSearch: search === 'on',
      ...numbers.value,
    },
  };
};
