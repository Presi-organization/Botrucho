export const HISTORY_LIMIT = 6;
export const HISTORY_WINDOW_MS = 15 * 60_000;
const HISTORY_MESSAGE_CHARS = 200;

export interface ChatLine {
  author: string;
  text: string;
}

export const buildAiPrompt = (
  author: string,
  prompt: string,
  history: ChatLine[],
  disabledCommands: string[] = [],
): string => {
  const lines = history
    .map(({ author: name, text }) => ({
      name,
      text: text.replace(/\s+/g, ' ').trim().slice(0, HISTORY_MESSAGE_CHARS),
    }))
    .filter(({ text }) => text)
    .map(({ name, text }) => `${name}: ${text}`);
  const chat = lines.length ? `Recent chat:\n${lines.join('\n')}\n\n` : '';
  const context = [prompt, ...lines].join('\n').toLowerCase();
  const mentioned = disabledCommands.filter((name) => context.includes(name.toLowerCase()));
  const disabled = mentioned.length
    ? `Disabled here: ${mentioned.map((name) => `/${name}`).join(', ')}\n\n`
    : '';
  return `${disabled}${chat}Message from ${author}:\n${prompt}`;
};
