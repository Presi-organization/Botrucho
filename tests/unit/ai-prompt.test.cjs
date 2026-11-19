require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { buildAiPrompt } = require('@/runtime/ai-prompt');
const { redactSlurs } = require('@/runtime/ai-output-filter');

test('prompt without history is just the author and the message', () => {
  assert.equal(buildAiPrompt('Ana', 'hola', []), 'Message from Ana:\nhola');
});

test('history goes first, collapses whitespace, truncates and skips empty lines', () => {
  const prompt = buildAiPrompt('Ana', 'hola', [
    { author: 'Luis', text: 'uno\n\ndos   tres' },
    { author: 'Botrucho', text: '   ' },
    { author: 'Eva', text: 'x'.repeat(500) },
  ]);
  assert.equal(
    prompt,
    `Recent chat:\nLuis: uno dos tres\nEva: ${'x'.repeat(200)}\n\nMessage from Ana:\nhola`,
  );
});

test('lists a disabled command only when the message or the chat mentions it', () => {
  assert.equal(
    buildAiPrompt(
      'Ana',
      'no sirve',
      [{ author: 'Luis', text: 'el /Siata no abre' }],
      ['siata', 'play'],
    ),
    'Disabled here: /siata\n\nRecent chat:\nLuis: el /Siata no abre\n\nMessage from Ana:\nno sirve',
  );
  assert.equal(buildAiPrompt('Ana', 'hola', [], ['siata', 'multas']), 'Message from Ana:\nhola');
});

test('redacts the n-word in its disguised forms but leaves normal words alone', () => {
  for (const text of ['Nigger-Man', 'nigga', 'N i g g 3 r', 'nigger man']) {
    assert.equal(redactSlurs(`el gato ${text} era`), 'el gato [censurado] era', text);
  }
  assert.equal(
    redactSlurs('Fue a Nigeria, y snigger no cuenta'),
    'Fue a Nigeria, y snigger no cuenta',
  );
  assert.equal(redactSlurs('ese faggot'), 'ese [censurado]');
});
