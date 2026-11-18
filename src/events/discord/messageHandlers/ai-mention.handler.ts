import { EmbedBuilder, Message } from 'discord.js';

import config from '@/config';
import { Botrucho } from '@/mongodb';
import { AiRefusal } from '@/runtime/ai-limits';
import { redactSlurs } from '@/runtime/ai-output-filter';
import { buildAiPrompt, ChatLine, HISTORY_LIMIT, HISTORY_WINDOW_MS } from '@/runtime/ai-prompt';
import { GeminiError, generateReply } from '@/services/REST/gemini.service';
import { AiKeys, TranslationElement } from '@/types';
import { Error, Info, logger, Warning } from '@/utils';

const EMBED_DESCRIPTION_LIMIT = 4096;
const LIMIT_KEYS: Partial<Record<AiRefusal, AiKeys>> = {
  user: 'USER_LIMIT',
  guild: 'GUILD_LIMIT',
  global: 'GLOBAL_LIMIT',
};

// The bot answers with embeds, so its own earlier replies live in the embed description.
async function fetchHistory(client: Botrucho, message: Message<true>): Promise<ChatLine[]> {
  try {
    const recent = await message.channel.messages.fetch({
      limit: HISTORY_LIMIT,
      before: message.id,
    });
    const oldest = message.createdTimestamp - HISTORY_WINDOW_MS;
    const fresh = [...recent.values()].filter((entry) => entry.createdTimestamp >= oldest);
    return fresh.reverse().map((entry) => {
      const isBot = entry.author.id === client.user?.id;
      return {
        author: isBot ? 'Botrucho' : (entry.member?.displayName ?? entry.author.username),
        text: entry.cleanContent || (isBot ? (entry.embeds[0]?.description ?? '') : ''),
      };
    });
  } catch {
    return [];
  }
}

export async function handleAiMention(client: Botrucho, message: Message): Promise<boolean> {
  if (!config.integrations.vertexAi || !client.user || !message.inGuild()) return false;
  if (!message.mentions.users.has(client.user.id)) return false;
  const guildDB = await message.guild.fetchDB(client.guildData);
  if (!guildDB.aiEnabled) return false;

  const settings = await client.aiSettings.get();
  const reply = (embed: EmbedBuilder) =>
    message.reply({ embeds: [embed], allowedMentions: { parse: [], repliedUser: false } });
  const translations = message.translate('AI', guildDB.lang) as TranslationElement<AiKeys>;

  const prompt = message.content
    .replaceAll(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
    .trim()
    .slice(0, settings.maxInputChars);
  if (!prompt) {
    await reply(Info({ description: translations.EMPTY_PROMPT }));
    return true;
  }

  const permit = await client.aiLimiter.acquire(
    message.author.id,
    message.guildId,
    settings.limits,
  );
  if (!permit.ok) {
    const key = LIMIT_KEYS[permit.reason];
    if (key) await reply(Warning({ description: translations[key] }));
    else await message.react('⏳');
    return true;
  }

  let tokens = 0;
  let refund = true;
  try {
    await message.channel.sendTyping();
    const history = await fetchHistory(client, message);
    const author = message.member?.displayName ?? message.author.username;
    const answer = await generateReply(buildAiPrompt(author, prompt, history), settings);
    tokens = answer.totalTokens;
    refund = false;
    await reply(Info({ description: redactSlurs(answer.text).slice(0, EMBED_DESCRIPTION_LIMIT) }));
  } catch (error) {
    if (error instanceof GeminiError && error.totalTokens > 0) {
      tokens = error.totalTokens;
      refund = false;
    }
    logger.error('AI mention failed', error);
    const quota = error instanceof GeminiError && error.reason === 'quota';
    await reply(
      quota
        ? Warning({ description: translations.GLOBAL_LIMIT })
        : Error({ description: translations.ERROR }),
    ).catch(() => undefined);
  } finally {
    await permit.release({ tokens, refund });
  }
  return true;
}
