import {
  ApiError,
  GenerateContentConfig,
  GenerateContentResponse,
  GoogleGenAI,
  ThinkingLevel,
} from '@google/genai';

import config from '@/config';
import { AiSettings } from '@/types';

const TIMEOUT_MS = 20_000;

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly reason: 'quota' | 'blocked' | 'empty' | 'request',
    readonly totalTokens = 0,
  ) {
    super(message);
  }
}

export interface GeminiSource {
  title: string;
  uri: string;
}

export interface GeminiReply {
  text: string;
  totalTokens: number;
  sources: GeminiSource[];
}

const MAX_SOURCES = 3;

const _groundingSources = (response: GenerateContentResponse): GeminiSource[] => {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const byTitle = new Map<string, GeminiSource>();
  for (const { web } of chunks) {
    if (!web?.uri) continue;
    const title = web.title ?? web.uri;
    if (!byTitle.has(title)) byTitle.set(title, { title, uri: web.uri });
  }
  return [...byTitle.values()].slice(0, MAX_SOURCES);
};

let client: GoogleGenAI | undefined;

// No SDK retries: each attempt can be billed and backoff would outlast Discord's typing window.
const _getClient = (): GoogleGenAI =>
  (client ??= new GoogleGenAI({
    vertexai: true,
    apiKey: config.integrations.vertexAi,
    httpOptions: { timeout: TIMEOUT_MS, retryOptions: { attempts: 1 } },
  }));

const _currentDateTime = (now: Date): string => {
  const timeZone = process.env.TZ || 'America/Bogota';
  const formatted = new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone,
  }).format(now);
  return `Current date and time: ${formatted} (${timeZone}).`;
};

const _generateOnce = async (
  prompt: string,
  settings: AiSettings,
  now: Date,
): Promise<GeminiReply> => {
  const requestConfig: GenerateContentConfig = {
    systemInstruction: `${settings.systemInstruction}

${_currentDateTime(now)}
Web search: ${settings.googleSearch ? 'on' : 'off'}.`,
    temperature: settings.temperature,
    maxOutputTokens: settings.maxOutputTokens,
    thinkingConfig: { thinkingLevel: settings.thinkingLevel.toUpperCase() as ThinkingLevel },
    ...(settings.googleSearch && { tools: [{ googleSearch: {} }] }),
  };

  let response;
  try {
    response = await _getClient().models.generateContent({
      model: settings.model,
      contents: prompt,
      config: requestConfig,
    });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 429 || error.status === 402))
      throw new GeminiError(`Gemini quota or billing limit: ${error.message}`, 'quota');
    throw new GeminiError(`Request failed: ${(error as Error).message}`, 'request');
  }

  const totalTokens = response.usageMetadata?.totalTokenCount ?? 0;
  if (response.promptFeedback?.blockReason)
    throw new GeminiError(`Prompt blocked: ${response.promptFeedback.blockReason}`, 'blocked');

  const text = response.text?.trim();
  if (!text)
    throw new GeminiError(
      `Empty response (${response.candidates?.[0]?.finishReason ?? 'no candidate'})`,
      'empty',
      totalTokens,
    );
  return { text, totalTokens, sources: _groundingSources(response) };
};

export const generateReply = async (
  prompt: string,
  settings: AiSettings,
  now: Date = new Date(),
): Promise<GeminiReply> => {
  let spent = 0;
  for (let attempt = 1; ; attempt++) {
    try {
      const reply = await _generateOnce(prompt, settings, now);
      return { ...reply, totalTokens: reply.totalTokens + spent };
    } catch (error) {
      if (!(error instanceof GeminiError) || error.reason !== 'empty') throw error;
      spent += error.totalTokens;
      if (attempt === 2) throw new GeminiError(error.message, 'empty', spent);
    }
  }
};
