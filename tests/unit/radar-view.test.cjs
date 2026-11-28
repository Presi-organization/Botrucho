require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { basemapUrl } = require('@/services/radar/gibs/basemap');
const { basemapZoom, mercatorBbox, tilePlan } = require('@/services/radar/gibs/view');

test('the satellite view is a Web Mercator square centered on the old Leaflet view', () => {
  for (const circles of [1, 2]) {
    const [west, south, east, north] = mercatorBbox(circles);
    assert.ok(Math.abs(east - west - (north - south)) < 1e-6);
    const { x, y } = { x: (west + east) / 2, y: (south + north) / 2 };
    assert.ok(Math.abs(x - -8407839.1) < 1, 'x meters of -75.52890');
    assert.ok(Math.abs(y - 690502.0) < 1, 'y meters of 6.19080');
  }
  assert.ok(mercatorBbox(2)[2] - mercatorBbox(2)[0] > mercatorBbox(1)[2] - mercatorBbox(1)[0]);
});

test('the street tiles cover the same view the satellite request does', () => {
  for (const circles of [1, 2]) {
    const plan = tilePlan(circles);
    assert.equal(plan.zoom, basemapZoom(circles));
    assert.ok(plan.size >= 600 && plan.size <= 800, 'the native size of the old maps');
    const xs = plan.tiles.map((t) => t.x);
    const ys = plan.tiles.map((t) => t.y);
    assert.ok(
      Math.min(...xs) * 256 <= plan.left && (Math.max(...xs) + 1) * 256 >= plan.left + plan.size,
    );
    assert.ok(
      Math.min(...ys) * 256 <= plan.top && (Math.max(...ys) + 1) * 256 >= plan.top + plan.size,
    );
    assert.ok(plan.tiles.length <= 100);
  }
  assert.equal(tilePlan(1).zoom, 11, 'zoom 11 like the old circles=1 map');
  assert.equal(tilePlan(2).zoom, 10, 'zoom 10 like the old circles=2 map');
});

test('the basemap url hides poi labels and restyles Google tiles for the dark theme', () => {
  assert.ok(basemapUrl(11, 1188, 1976).includes('lyrs=m&x=1188&y=1976&z=11&apistyle=s.t'));
  assert.ok(basemapUrl(11, 1188, 1976, 'dark').includes('apistyle=s.e%3Aall%7Cp.il%3Atrue'));
});
