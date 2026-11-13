require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { transformSync } = require('@swc/core');

// Values created inside the vm context carry its prototypes; compare them as plain data.
const plain = (value) => JSON.parse(JSON.stringify(value));
// "<embed kind>: <description>" of a reply payload.
const text = (reply) => `${reply.embeds[0].kind}: ${reply.embeds[0].description}`;

const { code } = transformSync(
  readFileSync('src/events/discord/messageHandlers/ai-mention.handler.ts', 'utf8'),
  {
    swcrc: false,
    jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
    module: { type: 'commonjs' },
  },
);

const BOT_ID = '100';
const translations = {
  EMPTY_PROMPT: 'empty',
  USER_LIMIT: 'user limit',
  GUILD_LIMIT: 'guild limit',
  GLOBAL_LIMIT: 'global limit',
  ERROR: 'error',
};

class GeminiError extends Error {
  constructor(message, reason, totalTokens = 0) {
    super(message);
    this.reason = reason;
    this.totalTokens = totalTokens;
  }
}

function setup({ answer = async () => ({ text: 'answer', totalTokens: 7 }), permit } = {}) {
  const prompts = [];
  const releases = [];
  const errors = [];
  const exports = {};
  runInNewContext(code, {
    exports,
    RegExp,
    require: (name) => {
      if (name === '@/config')
        return {
          __esModule: true,
          default: { integrations: { vertexAi: 'key' } },
        };
      if (name === '@/services/REST/gemini.service')
        return {
          GeminiError,
          generateReply: async (prompt) => {
            prompts.push(prompt);
            return answer();
          },
        };
      if (name === '@/utils')
        return {
          logger: { error: (...args) => errors.push(args) },
          Info: (data) => ({ kind: 'info', ...data }),
          Warning: (data) => ({ kind: 'warning', ...data }),
          Error: (data) => ({ kind: 'error', ...data }),
        };
      return require(name);
    },
  });

  const client = {
    user: { id: BOT_ID },
    guildData: {},
    aiSettings: { get: async () => ({ maxInputChars: 20, limits: {} }) },
    aiLimiter: {
      acquire: async () => permit ?? { ok: true, release: async (result) => releases.push(result) },
    },
  };

  function message({ content = `<@${BOT_ID}> hola`, guildId = 'g1', mentioned = true } = {}) {
    const sent = { replies: [], reactions: [], typing: 0 };
    const msg = {
      content,
      guildId,
      author: { id: 'u1' },
      inGuild: () => true,
      mentions: { users: new Map(mentioned ? [[BOT_ID, {}]] : []) },
      guild: { fetchDB: async () => ({ aiEnabled: guildId === 'g1', lang: 'en' }) },
      translate: () => translations,
      channel: { sendTyping: async () => void sent.typing++ },
      reply: async (payload) => sent.replies.push(payload),
      react: async (emoji) => sent.reactions.push(emoji),
    };
    return { msg, sent };
  }

  const handle = (msg) => exports.handleAiMention(client, msg);
  return { handle, message, prompts, releases, errors };
}

test('answers a direct mention with the stripped prompt and never pings anyone', async () => {
  const { handle, message, prompts, releases } = setup();
  const { msg, sent } = message({ content: `<@!${BOT_ID}>   ¿qué jugamos? <@${BOT_ID}>` });
  assert.equal(await handle(msg), true);
  assert.deepEqual(prompts, ['¿qué jugamos?']);
  assert.equal(sent.typing, 1);
  assert.deepEqual(plain(sent.replies), [
    {
      embeds: [{ kind: 'info', description: 'answer' }],
      allowedMentions: { parse: [], repliedUser: false },
    },
  ]);
  assert.deepEqual(plain(releases), [{ tokens: 7, refund: false }]);
});

test('truncates long prompts and long answers', async () => {
  const { handle, message, prompts } = setup({
    answer: async () => ({ text: 'x'.repeat(5000), totalTokens: 1 }),
  });
  const { msg, sent } = message({ content: `<@${BOT_ID}> ${'a'.repeat(50)}` });
  await handle(msg);
  assert.equal(prompts[0].length, 20);
  assert.equal(sent.replies[0].embeds[0].description.length, 4096);
});

test('ignores messages that do not directly mention the bot or come from servers without AI enabled', async () => {
  const { handle, message, prompts } = setup();
  for (const options of [{ mentioned: false }, { guildId: 'other' }]) {
    const { msg, sent } = message(options);
    assert.equal(await handle(msg), false);
    assert.deepEqual(sent.replies, []);
  }
  assert.deepEqual(prompts, []);
});

test('an empty mention gets a usage hint without calling the API', async () => {
  const { handle, message, prompts } = setup();
  const { msg, sent } = message({ content: `<@${BOT_ID}>  ` });
  await handle(msg);
  assert.deepEqual(prompts, []);
  assert.equal(text(sent.replies[0]), 'info: empty');
});

test('cooldown reacts instead of replying; daily caps reply once', async () => {
  for (const [reason, expected] of [
    ['cooldown', { reactions: ['⏳'], replies: [] }],
    ['busy', { reactions: ['⏳'], replies: [] }],
    ['user', { reactions: [], replies: ['warning: user limit'] }],
    ['guild', { reactions: [], replies: ['warning: guild limit'] }],
    ['global', { reactions: [], replies: ['warning: global limit'] }],
  ]) {
    const { handle, message, prompts } = setup({ permit: { ok: false, reason } });
    const { msg, sent } = message();
    await handle(msg);
    assert.deepEqual(
      { reactions: sent.reactions, replies: sent.replies.map(text) },
      expected,
      reason,
    );
    assert.deepEqual(prompts, []);
  }
});

test('failed calls refund the counters unless tokens were billed', async () => {
  const failed = setup({
    answer: async () => {
      throw new GeminiError('down', 'request');
    },
  });
  const first = failed.message();
  await failed.handle(first.msg);
  assert.deepEqual(plain(failed.releases), [{ tokens: 0, refund: true }]);
  assert.equal(text(first.sent.replies[0]), 'error: error');
  assert.equal(failed.errors.length, 1);

  const billed = setup({
    answer: async () => {
      throw new GeminiError('empty', 'empty', 300);
    },
  });
  await billed.handle(billed.message().msg);
  assert.deepEqual(plain(billed.releases), [{ tokens: 300, refund: false }]);
});

test('quota and billing errors reply with the daily-limit message', async () => {
  const { handle, message, releases } = setup({
    answer: async () => {
      throw new GeminiError('402', 'quota');
    },
  });
  const { msg, sent } = message();
  await handle(msg);
  assert.equal(text(sent.replies[0]), 'warning: global limit');
  assert.deepEqual(plain(releases), [{ tokens: 0, refund: true }]);
});
