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

export type CronEditResult = { ok: true; values: CronEditValues } | { ok: false; message: string };

const validateEmojis = (text: string): string | null => {
  if (!text || text.trim() === '') return 'No emojis provided.';
  const rest = text.replace(EMOJI_REGEX, '').replace(DISCORD_EMOJI_REGEX, '').replace(/\s/g, '');
  return rest.length > 0
    ? 'Contains invalid characters. Please use only emoji characters or Discord custom emojis.'
    : null;
};

const findInvalidEmojiFields = (metadata: Record<string, unknown>): string[] => {
  const problems: string[] = [];
  for (const [field, value] of Object.entries(metadata)) {
    const isEmojiField = EMOJI_FIELDS.some((name) => field.toLowerCase().includes(name));
    if (!isEmojiField || typeof value !== 'string') continue;
    const problem = validateEmojis(value);
    if (problem) problems.push(`- Field "${field}": ${problem}`);
  }
  return problems;
};

const parseMetadata = (raw: string): Record<string, unknown> | null => {
  if (!raw || raw.trim() === '') return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* reported by the caller as invalid metadata */
  }
  return null;
};

export function validateCronEdit(input: CronEditInput): CronEditResult {
  const metadata = parseMetadata(input.metadata);
  if (!metadata) {
    return {
      ok: false,
      message: 'Invalid JSON format in metadata. Please ensure it is a valid JSON object.',
    };
  }

  if (!cron.validate(input.cronExpression)) {
    return {
      ok: false,
      message: 'Invalid cron expression. Please use the format: `* * * * *`',
    };
  }

  const flag = input.runOnInit?.trim().toLowerCase() ?? '';
  if (flag !== '' && flag !== 'true' && flag !== 'false') {
    return {
      ok: false,
      message: 'Invalid input for "Run on Init". Please enter either `true` or `false`.',
    };
  }

  const emojiProblems = findInvalidEmojiFields(metadata);
  if (emojiProblems.length > 0) {
    return {
      ok: false,
      message: `Invalid emoji content detected:\n${emojiProblems.join('\n')}\n\nPlease use only valid emoji characters or Discord custom emojis.`,
    };
  }

  return {
    ok: true,
    values: { cronExpression: input.cronExpression, runOnInit: flag === 'true', metadata },
  };
}
