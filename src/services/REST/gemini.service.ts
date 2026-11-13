import { ApiError, GenerateContentConfig, GoogleGenAI, ThinkingLevel } from '@google/genai';

import config from '@/config';
import { AiSettings } from '@/types';

const TIMEOUT_MS = 20_000;

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly reason: 'quota' | 'blocked' | 'empty' | 'request',
    // Tokens billed even though no usable reply came back.
    readonly totalTokens = 0,
  ) {
    super(message);
  }
}

export interface GeminiReply {
  text: string;
  totalTokens: number;
}

let client: GoogleGenAI | undefined;

// Vertex AI with a Cloud API key bound to a service account: billed postpaid to the key's project.
// No SDK retries: each attempt can be billed and backoff would outlast Discord's typing window.
const _getClient = (): GoogleGenAI =>
  (client ??= new GoogleGenAI({
    vertexai: true,
    apiKey: config.integrations.vertexAi,
    httpOptions: { timeout: TIMEOUT_MS, retryOptions: { attempts: 1 } },
  }));

export const generateReply = async (prompt: string, settings: AiSettings): Promise<GeminiReply> => {
  const requestConfig: GenerateContentConfig = {
    systemInstruction: settings.systemInstruction,
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
    // 429: rate limit; 402: prepaid credits depleted.
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
  return { text, totalTokens };
};
