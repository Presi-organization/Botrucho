require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { HELP_GROUP_COMMANDS, buildHelpGroups } = require('@/commands/help-groups');
const { commandRegistry } = require('@/commands/registry');

const entries = (...names) => names.map((name) => ({ name, description: `${name} desc` }));

test('every registered command belongs to a help group', () => {
  const grouped = new Set(Object.values(HELP_GROUP_COMMANDS).flat());
  const missing = commandRegistry
    .map((Command) => new Command().name)
    .filter((name) => !grouped.has(name));
  assert.deepEqual(missing, []);
});

test('help hides disabled commands, owner-only commands for others, and empty groups', () => {
  const commands = entries('play', 'pause', 'siata', 'ai', 'event');
  const groups = buildHelpGroups(commands, ['pause'], false);
  assert.deepEqual(groups, [
    { group: 'MUSIC', lines: ['`/play` play desc'] },
    { group: 'INFO', lines: ['`/siata` siata desc'] },
    { group: 'SERVER', lines: ['`/event` event desc'] },
  ]);
});

test('owners also see the owner-only commands, sorted inside the group', () => {
  const [group] = buildHelpGroups(entries('lang', 'ai', 'event'), [], true);
  assert.deepEqual(group, {
    group: 'SERVER',
    lines: ['`/ai` ai desc', '`/event` event desc', '`/lang` lang desc'],
  });
});
