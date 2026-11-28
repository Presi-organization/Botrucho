require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { SiataProvider } = require('@/services/radar/siata/siata.provider');

const norm = (p) => p.split(path.sep).join('/');

test('siata keeps the hand-tuned crops, folders and inversion of the old command', async () => {
  const siata = new SiataProvider();
  const still = await siata.prepareStill({ map: 'stadia', locations: true, circles: 2 });
  assert.equal(still.invertRadarLegend, true);
  assert.equal(still.legendScale, 0.17);
  assert.deepEqual(still.mapCrop, { x: 1024, y: 540, width: 720, height: 720 });
  assert.deepEqual(still.radarCrop, { x: 480, y: 503, width: 450, height: 450 });
  assert.ok(norm(still.mapPath).endsWith('siata/smoothdark/locations/map2x.png'));
  assert.ok(norm(still.radarPath).endsWith('siata/radar.png'));

  const google = await siata.prepareStill({ map: 'google', locations: false, circles: 1 });
  assert.equal(google.invertRadarLegend, false);
  assert.deepEqual(google.mapCrop, { x: 1024, y: 540, width: 650, height: 650 });
  assert.ok(norm(google.mapPath).endsWith('googlestreets/clean/map1x.png'));
});
