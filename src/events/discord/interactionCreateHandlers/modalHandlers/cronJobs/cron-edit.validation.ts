import cron from 'node-cron';

const EMOJI_REGEX = /(\p{Emoji_Presentation}|\p{Emoji}️)/gu;
const DISCORD_EMOJI_REGEX = /<a?:[a-zA-Z0-9_]+:[0-9]+>/g;
const EMOJI_FIELDS = ['emojis', 'reactions', 'emoji'];

export interface CronEditInput {
  cronExpression: string;
  runOnInit: string;
  metadata: string;
}

export interface CronEditValues {
  cronExpression: string;
  runOnInit: boolean;
  metadata: Record<string, unknown>;
}

export type CronEditErrorKey =
  'INVALID_METADATA' | 'INVALID_CRON' | 'INVALID_RUN_ON_INIT' | 'INVALID_EMOJI';

export type CronEditResult =
  { ok: true; values: CronEditValues } | { ok: false; error: CronEditErrorKey; fields?: string[] };

const isValidEmojiText = (text: string): boolean =>
  text.trim() !== '' &&
  text.replace(EMOJI_REGEX, '').replace(DISCORD_EMOJI_REGEX, '').replace(/\s/g, '') === '';

const findInvalidEmojiFields = (metadata: Record<string, unknown>): string[] =>
  Object.entries(metadata)
    .filter(
      ([field, value]) =>
        EMOJI_FIELDS.some((name) => field.toLowerCase().includes(name)) &&
        typeof value === 'string' &&
        !isValidEmojiText(value),
    )
    .map(([field]) => field);

const parseMetadata = (raw: string): Record<string, unknown> | null => {
  if (!raw || raw.trim() === '') return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* falls through to null */
  }
  return null;
};

export function validateCronEdit(input: CronEditInput): CronEditResult {
  const metadata = parseMetadata(input.metadata);
  if (!metadata) return { ok: false, error: 'INVALID_METADATA' };

  if (!cron.validate(input.cronExpression)) return { ok: false, error: 'INVALID_CRON' };

  const flag = input.runOnInit?.trim().toLowerCase() ?? '';
  if (flag !== '' && flag !== 'true' && flag !== 'false') {
    return { ok: false, error: 'INVALID_RUN_ON_INIT' };
  }

  const invalidFields = findInvalidEmojiFields(metadata);
  if (invalidFields.length > 0) return { ok: false, error: 'INVALID_EMOJI', fields: invalidFields };

  return {
    ok: true,
    values: { cronExpression: input.cronExpression, runOnInit: flag === 'true', metadata },
  };
}
