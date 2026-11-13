require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { transformSync } = require('@swc/core');

// Values created inside the vm context carry its prototypes; compare them as plain data.
const plain = (value) => JSON.parse(JSON.stringify(value));

const { code } = transformSync(readFileSync('src/services/REST/gemini.service.ts', 'utf8'), {
  swcrc: false,
  jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
  module: { type: 'commonjs' },
});

class ApiError extends Error {
  constructor({ message, status }) {
    super(message);
    this.status = status;
  }
}

const settings = {
  model: 'test-model',
  thinkingLevel: 'low',
  googleSearch: false,
  maxInputChars: 1000,
  maxOutputTokens: 256,
  systemInstruction: 'System prompt',
  limits: {},
};

function load(respond) {
  const clients = [];
  const calls = [];
  const exports = {};
  runInNewContext(code, {
    exports,
    process,
    require: (name) => {
      if (name === '@/config')
        return { __esModule: true, default: { integrations: { vertexAi: 'test-key' } } };
      if (name === '@google/genai')
        return {
          ApiError,
          GoogleGenAI: class {
            constructor(options) {
              clients.push(options);
              this.models = {
                generateContent: async (request) => {
                  calls.push(request);
                  return respond();
                },
              };
            }
          },
        };
      return require(name);
    },
  });
  return { ...exports, clients, calls };
}

const reply = (text, usage = 42) => ({
  text,
  candidates: [{ finishReason: 'STOP' }],
  usageMetadata: { totalTokenCount: usage },
});

test('sends the system instruction, prompt and output caps with retries disabled', async () => {
  const { generateReply, clients, calls } = load(() => reply(' Hola '));
  assert.deepEqual(plain(await generateReply('¿Qué tal?', settings)), {
    text: 'Hola',
    totalTokens: 42,
  });
  await generateReply('otra', settings);

  assert.deepEqual(plain(clients), [
    {
      vertexai: true,
      apiKey: 'test-key',
      httpOptions: { timeout: 20000, retryOptions: { attempts: 1 } },
    },
  ]);
  const { systemInstruction, ...config } = calls[0].config;
  assert.match(systemInstruction, /^System prompt\n\nCurrent date and time: /);
  assert.deepEqual(plain({ ...calls[0], config }), {
    model: 'test-model',
    contents: '¿Qué tal?',
    config: {
      maxOutputTokens: 256,
      thinkingConfig: { thinkingLevel: 'LOW' },
    },
  });
});

test('adds the Google Search tool only when enabled', async () => {
  const { generateReply, calls } = load(() => reply('ok'));
  await generateReply('x', { ...settings, googleSearch: true });
  assert.deepEqual(plain(calls[0].config.tools), [{ googleSearch: {} }]);
});

test('maps quota, request and blocked failures to typed errors', async () => {
  const failWith = (status) => () => {
    throw new ApiError({ message: `status ${status}`, status });
  };
  for (const [respond, reason] of [
    [failWith(429), 'quota'],
    [failWith(402), 'quota'],
    [failWith(500), 'request'],
    [() => ({ promptFeedback: { blockReason: 'SAFETY' } }), 'blocked'],
  ]) {
    const { generateReply, GeminiError } = load(respond);
    await assert.rejects(generateReply('x', settings), (error) => {
      assert.ok(error instanceof GeminiError);
      assert.equal(error.reason, reason);
      return true;
    });
  }
});

test('an empty answer still reports the tokens that were billed', async () => {
  const { generateReply } = load(() => ({
    text: undefined,
    candidates: [{ finishReason: 'MAX_TOKENS' }],
    usageMetadata: { totalTokenCount: 256 },
  }));
  await assert.rejects(generateReply('x', settings), (error) => {
    assert.equal(error.reason, 'empty');
    assert.equal(error.totalTokens, 256);
    assert.match(error.message, /MAX_TOKENS/);
    return true;
  });
});

test('tells the model the current date and time in the configured timezone', async () => {
  const { generateReply, calls } = load(() => reply('ok'));
  const previous = process.env.TZ;
  process.env.TZ = 'America/Bogota';
  try {
    await generateReply('¿qué hora es?', settings, new Date('2026-11-13T20:45:00Z'));
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
  const { systemInstruction } = calls[0].config;
  assert.match(systemInstruction, /viernes, 13 de noviembre de 2026/);
  assert.match(systemInstruction, /3:45/);
  assert.ok(systemInstruction.endsWith('(America/Bogota).'), systemInstruction);
});
