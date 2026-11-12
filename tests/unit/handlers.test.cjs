require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

test('event boundary catches both sync throws and promise rejections', async () => {
  const { safeHandler } = require('@/runtime/handlers');
  const errors = [];
  await safeHandler(
    () => {
      throw new Error('sync');
    },
    (e) => errors.push(e.message),
  )();
  await safeHandler(
    async () => {
      throw new Error('async');
    },
    (e) => errors.push(e.message),
  )();
  assert.deepEqual(errors, ['sync', 'async']);
});

test('error reply acknowledges new interactions and edits deferred replies without leaking internals', async () => {
  const { replyWithError } = require('@/runtime/handlers');
  const calls = [];
  const interaction = {
    deferred: false,
    replied: false,
    reply: async (payload) => calls.push(['reply', payload]),
    editReply: async (payload) => calls.push(['edit', payload]),
  };
  await replyWithError(interaction, () => assert.fail('unexpected failure'));
  interaction.deferred = true;
  await replyWithError(interaction, () => assert.fail('unexpected failure'));
  assert.equal(calls[0][0], 'reply');
  assert.equal(calls[1][0], 'edit');
  interaction.editReply = async () => {
    throw new Error('expired');
  };
  let reported = false;
  await replyWithError(interaction, () => {
    reported = true;
  });
  assert.equal(reported, true);
});
