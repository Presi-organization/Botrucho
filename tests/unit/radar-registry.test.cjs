require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { getRadarProvider, RADAR_PROVIDER_IDS } = require('@/services/radar/registry');
const { workerRadarProcess } = require('@/workers/radar.process');

test('registry resolves a provider by id and rejects unknown ones', () => {
  assert.equal(getRadarProvider('siata').id, 'siata');
  assert.equal(getRadarProvider('gibs').id, 'gibs');
  assert.equal(getRadarProvider('gibs'), getRadarProvider('gibs'));
  assert.throws(() => getRadarProvider('nope'), /Unknown radar provider/);
  assert.deepEqual(RADAR_PROVIDER_IDS, ['siata', 'gibs']);
  for (const id of RADAR_PROVIDER_IDS) assert.ok(getRadarProvider(id).maps.length > 0);
});

test('the radar cron refreshes every provider, not only the default one', async () => {
  const refreshed = [];
  const originals = RADAR_PROVIDER_IDS.map((id) => {
    const provider = getRadarProvider(id);
    const original = provider.refresh;
    provider.refresh = async () => {
      refreshed.push(id);
      if (id === 'siata') throw new Error('feed down');
    };
    return [provider, original];
  });

  await workerRadarProcess();
  for (const [provider, original] of originals) provider.refresh = original;

  assert.deepEqual(refreshed, ['siata', 'gibs'], 'one failing source does not stop the others');
});
