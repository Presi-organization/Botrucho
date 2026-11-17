require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  validateCronEdit,
} = require('@/events/discord/interactionCreateHandlers/modalHandlers/cronJobs/cron-edit.validation');

const valid = { cronExpression: '0 8 * * *', runOnInit: '', metadata: '' };

test('accepts a minimal valid edit with defaults', () => {
  assert.deepEqual(validateCronEdit(valid), {
    ok: true,
    values: { cronExpression: '0 8 * * *', runOnInit: false, metadata: {} },
  });
});

test('parses runOnInit case-insensitively', () => {
  assert.equal(validateCronEdit({ ...valid, runOnInit: 'TRUE' }).values.runOnInit, true);
  assert.equal(validateCronEdit({ ...valid, runOnInit: 'false' }).values.runOnInit, false);
});

test('rejects an invalid runOnInit value', () => {
  assert.equal(validateCronEdit({ ...valid, runOnInit: 'yes' }).error, 'INVALID_RUN_ON_INIT');
});

test('rejects an invalid cron expression', () => {
  assert.equal(validateCronEdit({ ...valid, cronExpression: 'nope' }).error, 'INVALID_CRON');
});

for (const metadata of ['{broken', '[1,2]', '"text"', 'null']) {
  test(`rejects non-object metadata ${metadata}`, () => {
    const result = validateCronEdit({ ...valid, metadata });
    assert.equal(result.ok, false);
    assert.equal(result.error, 'INVALID_METADATA');
  });
}

test('accepts a JSON object and keeps its fields', () => {
  const result = validateCronEdit({ ...valid, metadata: '{"channel":"1","n":2}' });
  assert.deepEqual(result.values.metadata, { channel: '1', n: 2 });
});

test('accepts unicode and custom discord emojis in emoji fields', () => {
  const metadata = JSON.stringify({ reactions: '✅ <:ok:123> <a:spin:456>' });
  assert.equal(validateCronEdit({ ...valid, metadata }).ok, true);
});

test('rejects text in emoji fields and names the field', () => {
  const result = validateCronEdit({ ...valid, metadata: '{"emojis":"abc","title":"x"}' });
  assert.equal(result.error, 'INVALID_EMOJI');
  assert.deepEqual(result.fields, ['emojis']);
});

test('ignores non-string values and non-emoji fields', () => {
  const metadata = JSON.stringify({ emojis: ['x'], title: 'plain text' });
  assert.equal(validateCronEdit({ ...valid, metadata }).ok, true);
});
