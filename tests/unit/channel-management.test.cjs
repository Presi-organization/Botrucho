require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ChannelType, PermissionsBitField } = require('discord.js');

const { createTextChannel } = require('@/utils/guildManagement/channel.util');

test('creates a public read-only text channel with an explicit bot posting overwrite', async () => {
  let options;
  const channel = { id: 'new-channel' };
  const client = {
    user: { id: 'bot' },
    guilds: {
      fetch: async (id) => {
        assert.equal(id, 'guild');
        return {
          roles: { everyone: { id: 'guild' } },
          channels: {
            create: async (payload) => {
              options = payload;
              return channel;
            },
          },
        };
      },
    },
  };

  assert.equal(await createTextChannel(client, 'guild', 'category', 'football'), channel);
  assert.equal(options.name, 'football');
  assert.equal(options.type, ChannelType.GuildText);
  assert.equal(options.parent, 'category');
  assert.equal(options.permissionOverwrites.length, 2);

  const everyone = options.permissionOverwrites.find(({ id }) => id === 'guild');
  assert.ok(
    new PermissionsBitField(everyone.allow).has([
      'ViewChannel',
      'ReadMessageHistory',
      'AddReactions',
    ]),
  );
  assert.ok(
    new PermissionsBitField(everyone.deny).has([
      'SendMessages',
      'SendMessagesInThreads',
      'CreatePublicThreads',
      'CreatePrivateThreads',
      'UseApplicationCommands',
    ]),
  );
  assert.equal(new PermissionsBitField(everyone.deny).has('ViewChannel'), false);
  assert.equal(new PermissionsBitField(everyone.deny).has('AddReactions'), false);

  const bot = options.permissionOverwrites.find(({ id }) => id === 'bot');
  assert.ok(bot, 'the bot needs its own overwrite to bypass the @everyone sending deny');
  assert.ok(
    new PermissionsBitField(bot.allow).has([
      'ViewChannel',
      'SendMessages',
      'ReadMessageHistory',
      'EmbedLinks',
      'AttachFiles',
    ]),
  );
  assert.equal(new PermissionsBitField(bot.allow).has('Administrator'), false);
});

test('propagates guild lookup failures without attempting channel creation', async () => {
  const error = new Error('Missing Access');
  const client = {
    guilds: {
      fetch: async () => {
        throw error;
      },
    },
  };
  await assert.rejects(createTextChannel(client, 'guild', 'category', 'football'), error);
});
