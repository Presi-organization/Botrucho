require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { transformSync } = require('@swc/core');

const en = require('@languages/en.json');

const { code } = transformSync(
  readFileSync(
    'src/events/discord/interactionCreateHandlers/modalHandlers/cronJobs/editCron.handler.ts',
    'utf8',
  ),
  {
    swcrc: false,
    jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
    module: { type: 'commonjs' },
  },
);

class Builder {
  constructor() {
    this.data = {};
  }
  setCustomId(value) {
    this.data.customId = value;
    return this;
  }
  setLabel(value) {
    this.data.label = value;
    return this;
  }
  setStyle() {
    return this;
  }
  addComponents(...components) {
    this.data.components = components;
    return this;
  }
}

function setup({ cron, fields }) {
  const calls = { replies: [], created: [], updated: [] };
  const client = {
    guildData: {},
    cronData: {
      getCronById: async () => cron,
      createOrUpdateCron: async (value) => {
        calls.created.push(value);
        return value;
      },
    },
    cronManager: { updateCronJob: (value) => calls.updated.push(value) },
    deleted_messages: new Set(),
  };
  const exports = {};
  runInNewContext(code, {
    exports,
    require: (name) => {
      if (name === 'discord.js') {
        return {
          ActionRowBuilder: Builder,
          ButtonBuilder: Builder,
          ButtonStyle: { Primary: 1 },
          MessageFlags: { Ephemeral: 64 },
          inlineCode: (value) => `\`${value}\``,
        };
      }
      if (name === '@/utils') {
        return {
          Error: (data) => ({ kind: 'error', ...data }),
          Success: (data) => ({ kind: 'success', ...data }),
        };
      }
      if (name === '@/mongodb' || name === '@/types') return {};
      if (name === '@/events/discord/interactionCreateHandlers') return {};
      return require(name);
    },
  });
  const interaction = {
    customId: 'cron-setup-modal:cron-1',
    guild: null,
    isModalSubmit: () => true,
    translate: () => en.CRONS,
    fields: { getTextInputValue: (id) => fields[id] ?? '' },
    reply: async (payload) => calls.replies.push(payload),
  };
  const handler = new exports.EditCronHandler(client);
  return { handler, interaction, client, calls };
}

const baseFields = {
  'cron-edit-name-input': 'Daily post',
  'cron-edit-cron-input': '0 8 * * *',
  'cron-edit-run-on-init-input': '',
  'cron-edit-metadata-input': '',
};
const existing = { cronId: 'cron-1', cronName: 'Old', metadata: { keep: 'me' } };

test('ignores interactions that are not modal submits', async () => {
  const { handler, interaction } = setup({ cron: existing, fields: baseFields });
  interaction.isModalSubmit = () => false;
  assert.equal(await handler.handle(interaction), false);
});

test('invalid metadata replies once with a retry button and does not touch the cron', async () => {
  const { handler, interaction, calls } = setup({
    cron: existing,
    fields: { ...baseFields, 'cron-edit-metadata-input': '{broken' },
  });
  assert.equal(await handler.handle(interaction), true);
  assert.equal(calls.replies.length, 1);
  assert.equal(calls.replies[0].embeds[0].kind, 'error');
  assert.equal(calls.replies[0].embeds[0].description, en.CRONS.INVALID_METADATA);
  assert.equal(
    calls.replies[0].components[0].data.components[0].data.customId,
    'retry-cron-modal:cron-1',
  );
  assert.deepEqual(calls.created, []);
  assert.deepEqual(calls.updated, []);
});

test('invalid emoji reply names the offending fields', async () => {
  const { handler, interaction, calls } = setup({
    cron: existing,
    fields: { ...baseFields, 'cron-edit-metadata-input': '{"emojis":"abc","reactions":"x"}' },
  });
  await handler.handle(interaction);
  assert.match(calls.replies[0].embeds[0].description, /emojis, reactions/);
  assert.deepEqual(calls.created, []);
});

test('reports a missing cron without validating or saving', async () => {
  const { handler, interaction, calls } = setup({ cron: null, fields: baseFields });
  assert.equal(await handler.handle(interaction), true);
  assert.equal(calls.replies.length, 1);
  assert.equal(calls.replies[0].embeds[0].description, en.CRONS.JOB_NOT_FOUND);
  assert.deepEqual(calls.created, []);
});

test('valid input saves, reschedules the job and replies once', async () => {
  const { handler, interaction, client, calls } = setup({
    cron: existing,
    fields: {
      ...baseFields,
      'cron-edit-run-on-init-input': 'true',
      'cron-edit-metadata-input': '{"channel":"1"}',
    },
  });
  assert.equal(await handler.handle(interaction), true);
  assert.equal(calls.created.length, 1);
  assert.equal(calls.created[0].cronName, 'Daily post');
  assert.equal(calls.created[0].cronExpression, '0 8 * * *');
  assert.equal(calls.created[0].runOnInit, true);
  assert.deepEqual(calls.created[0].metadata, { channel: '1' });
  assert.equal(calls.updated.length, 1);
  assert.equal(calls.replies.length, 1);
  assert.equal(calls.replies[0].embeds[0].kind, 'success');
  assert.match(calls.replies[0].embeds[0].description, /Daily post/);
  assert.equal(client.deleted_messages.has(interaction), true);
});
