require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createCanvas, loadImage } = require('canvas');

const { keyOutGray } = require('@/services/radar/gibs/cloud-mask');
const { FileCache } = require('@/services/radar/gibs/file-cache');
const { SerialQueue } = require('@/services/radar/gibs/serial-queue');
const {
  findLatestFrame,
  floorToStep,
  isoTime,
  wmsUrl,
} = require('@/services/radar/gibs/gibs.client');
const { GibsProvider } = require('@/services/radar/gibs/gibs.provider');

const norm = (p) => p.split(path.sep).join('/');
const STEP = 10 * 60_000;
const NOW = Date.parse('2026-11-27T22:07:30Z');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'radar-'));

test('gibs builds a Web Mercator WMS request for the GOES infrared layer', () => {
  const url = new URL(wmsUrl('LAYER', [1, 2, 3, 4], 64, '2026-11-27T21:00:00Z'));
  assert.equal(url.searchParams.get('LAYERS'), 'LAYER');
  assert.equal(url.searchParams.get('SRS'), 'EPSG:3857');
  assert.equal(url.searchParams.get('BBOX'), '1,2,3,4');
  assert.equal(url.searchParams.get('TIME'), '2026-11-27T21:00:00Z');
  assert.ok(url.pathname.includes('epsg3857'));
});

test('gibs floors to 10-minute frames and formats WMS times', () => {
  assert.equal(isoTime(floorToStep(NOW)), '2026-11-27T22:00:00Z');
  assert.equal(floorToStep(NOW) % STEP, 0);
});

test('the latest frame is found by stepping back until a probe has imagery', async () => {
  const probed = [];
  const time = await findLatestFrame(
    async (url) => {
      probed.push(new URL(url).searchParams.get('TIME'));
      return Buffer.from(url);
    },
    async () => probed.length === 3,
    [1, 2, 3, 4],
    NOW,
  );
  assert.deepEqual(probed, [
    '2026-11-27T22:00:00Z',
    '2026-11-27T21:50:00Z',
    '2026-11-27T21:40:00Z',
  ]);
  assert.equal(time, Date.parse('2026-11-27T21:40:00Z'));

  await assert.rejects(
    findLatestFrame(
      async () => Buffer.alloc(0),
      async () => false,
      [1, 2, 3, 4],
      NOW,
    ),
    /No GIBS imagery/,
  );
});

test('the file cache writes once, reuses the file and prunes old frames', async () => {
  const dir = tmp();
  let produced = 0;
  const cache = new FileCache(dir, () => NOW);
  const produce = async () => Buffer.from(`v${++produced}`);

  const first = await cache.ensure('frames/1_100.png', produce);
  assert.equal(await cache.ensure('frames/1_100.png', produce), first);
  assert.equal(produced, 1);
  assert.equal(fs.readFileSync(first, 'utf8'), 'v1');
  assert.deepEqual(fs.readdirSync(path.join(dir, 'frames')), ['1_100.png'], 'no tmp files left');

  await cache.ensure(`frames/1_${NOW}.png`, produce);
  await cache.pruneOlderThan('frames', STEP);
  assert.deepEqual(fs.readdirSync(path.join(dir, 'frames')), [`1_${NOW}.png`]);
  fs.rmSync(dir, { recursive: true });
});

const harness = (availableUntil) => {
  const dir = tmp();
  const urls = [];
  const basemaps = [];
  const provider = new GibsProvider({
    dir,
    now: () => NOW,
    fetchImage: async (url) => {
      urls.push(url);
      const time = new URL(url).searchParams.get('TIME');
      return Buffer.from(Date.parse(time) > availableUntil ? 'blank' : `img:${time}`);
    },
    hasImagery: async (png) => png.toString() !== 'blank',
    keyOut: async (png) => Buffer.concat([png, Buffer.from('+key')]),
    basemap: async (circles, theme, markers) => {
      basemaps.push([circles, theme, markers]);
      return Buffer.from(`map:${circles}:${theme}:${markers}`);
    },
  });
  return { dir, urls, basemaps, provider };
};

test('gibs probes back from now until a frame has imagery and caches the answer', async () => {
  const { dir, urls, basemaps, provider } = harness(Date.parse('2026-11-27T21:00:00Z'));
  const scene = await provider.prepareStill({ map: 'google', locations: false, circles: 1 });

  assert.ok(norm(scene.radarPath).endsWith('frames/1_1795813200000.png'));
  assert.equal(fs.readFileSync(scene.radarPath, 'utf8'), 'img:2026-11-27T21:00:00Z+key');
  assert.equal(scene.radarOpacity, 0.75);
  assert.deepEqual(scene.mapCrop, { x: 512, y: 512, width: 1024, height: 1024 });
  assert.deepEqual(scene.radarCrop, scene.mapCrop);
  assert.equal(urls.filter((u) => u.includes('WIDTH=64')).length, 7);
  assert.deepEqual(basemaps, [[1, 'google', false]]);

  const before = urls.length;
  await provider.prepareStill({ map: 'google', locations: false, circles: 1 });
  assert.equal(urls.length, before, 'frame, map and latest time are all cached');
  assert.equal(basemaps.length, 1);
  fs.rmSync(dir, { recursive: true });
});

test('gibs draws the markers only for locations and offers a google and a dark map', async () => {
  const { dir, basemaps, provider } = harness(Date.parse('2026-11-27T21:00:00Z'));
  const labelled = await provider.prepareStill({ map: 'dark', locations: true, circles: 2 });
  assert.deepEqual(basemaps, [[2, 'dark', true]]);
  assert.ok(norm(labelled.mapPath).endsWith('maps/dark_locations_2.png'));
  assert.deepEqual(
    provider.maps.map((map) => map.name),
    ['google', 'dark'],
  );
  fs.rmSync(dir, { recursive: true });
});

test('gibs timelapse returns frames oldest first on the plain map and skips missing ones', async () => {
  const { dir, basemaps, provider } = harness(Date.parse('2026-11-27T21:00:00Z'));
  const scene = await provider.prepareTimelapse({ map: 'google', locations: false, circles: 1 });
  const times = scene.radarImages.map((f) => Number(path.basename(f, '.png').split('_')[1]));
  assert.equal(times.length, 8);
  assert.deepEqual(
    times,
    [...times].sort((a, b) => a - b),
  );
  assert.equal(times.at(-1), Date.parse('2026-11-27T21:00:00Z'));
  assert.deepEqual(basemaps, [[1, 'google', false]]);
  fs.rmSync(dir, { recursive: true });
});

test('gibs fails loudly when no imagery exists at all', async () => {
  const { dir, provider } = harness(0);
  await assert.rejects(
    provider.prepareStill({ map: 'google', locations: false, circles: 1 }),
    /No GIBS imagery/,
  );
  fs.rmSync(dir, { recursive: true });
});

test('the file cache shares one computation between concurrent callers', async () => {
  const dir = tmp();
  const cache = new FileCache(dir, () => NOW);
  let produced = 0;
  const produce = async () => {
    produced++;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return Buffer.from('x');
  };
  const [a, b] = await Promise.all([
    cache.ensure('maps/a.png', produce),
    cache.ensure('maps/a.png', produce),
  ]);
  assert.equal(a, b);
  assert.equal(produced, 1);

  await assert.rejects(
    cache.ensure('maps/bad.png', async () => {
      throw new Error('boom');
    }),
    /boom/,
  );
  assert.equal(
    await cache.ensure('maps/bad.png', async () => Buffer.from('ok')).then(() => 'retried'),
    'retried',
  );
  fs.rmSync(dir, { recursive: true });
});

test('the serial queue runs one task at a time and survives a failing task', async () => {
  const queue = new SerialQueue();
  let running = 0;
  let peak = 0;
  const task = (id, fail) => async () => {
    peak = Math.max(peak, ++running);
    await new Promise((resolve) => setTimeout(resolve, 5));
    running--;
    if (fail) throw new Error('fail ' + id);
    return id;
  };
  const results = await Promise.allSettled([
    queue.run(task(1)),
    queue.run(task(2, true)),
    queue.run(task(3)),
  ]);
  assert.equal(peak, 1);
  assert.deepEqual(
    results.map((r) => r.status),
    ['fulfilled', 'rejected', 'fulfilled'],
  );
  assert.equal(results[2].value, 3);
});

test('concurrent requests share one latest-frame probe', async () => {
  const { dir, urls, provider } = harness(Date.parse('2026-11-27T21:00:00Z'));
  await Promise.all([
    provider.prepareStill({ map: 'google', locations: false, circles: 1 }),
    provider.prepareStill({ map: 'google', locations: false, circles: 2 }),
  ]);
  assert.equal(urls.filter((u) => u.includes('WIDTH=64')).length, 7, 'one probe walk, not two');
  fs.rmSync(dir, { recursive: true });
});

test('keyOutGray keeps colored cloud tops, closes small holes and clears the gray ground', async () => {
  const size = 64;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgb(120,120,120)';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = 'rgb(0,200,255)';
  ctx.fillRect(24, 24, 24, 24);
  ctx.fillStyle = 'rgb(20,20,20)';
  ctx.fillRect(32, 32, 8, 8);

  const out = await loadImage(await keyOutGray(canvas.toBuffer('image/png')));
  const alphaAt = (x, y) => {
    const c = createCanvas(size, size);
    const g = c.getContext('2d');
    g.drawImage(out, 0, 0);
    return g.getImageData(x, y, 1, 1).data[3];
  };
  assert.ok(alphaAt(28, 28) > 200, 'colored blob stays');
  assert.ok(alphaAt(36, 36) > 100, 'the dark core it encloses stays');
  assert.equal(alphaAt(2, 2), 0, 'gray ground is transparent');
});
