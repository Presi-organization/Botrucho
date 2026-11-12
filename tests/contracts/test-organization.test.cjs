const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('major release metadata agrees across package and lockfile', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
  assert.ok(
    Number(pkg.version.split('.')[0]) >= 2,
    'The breaking migration requires major version 2 or newer',
  );
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
});

test('native test discovery covers every categorized test without custom runners', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const suites = ['unit', 'integration', 'contracts', 'platform'];
  assert.equal(pkg.scripts.test, 'node --test "tests/**/*.test.cjs"');
  for (const suite of suites) {
    assert.equal(pkg.scripts[`test:${suite}`], `node --test "tests/${suite}/**/*.test.cjs"`);
  }
  const all = fs.globSync('tests/**/*.test.cjs');
  const categorized = suites.flatMap((suite) => fs.globSync(`tests/${suite}/**/*.test.cjs`));
  assert.deepEqual([...all].sort(), categorized.sort());
  assert.ok(all.some((file) => file.endsWith(path.join('unit', 'lifecycle.test.cjs'))));
  assert.ok(all.some((file) => file.endsWith(path.join('integration', 'health.test.cjs'))));
  assert.ok(
    all.some((file) => file.endsWith(path.join('contracts', 'test-organization.test.cjs'))),
  );
  assert.ok(all.some((file) => file.endsWith(path.join('platform', 'linux-policy.test.cjs'))));
  assert.equal(new Set(all).size, all.length);
  assert.ok(all.every((file) => !/[\\/](helpers|fixtures)[\\/]/.test(file)));
  assert.equal(fs.readdirSync('tests').filter((file) => file.endsWith('.test.cjs')).length, 0);
  assert.equal(fs.existsSync('scripts'), false);
});

test('Linux deployment files declare LF checkouts', () => {
  const attributes = fs.readFileSync('.gitattributes', 'utf8');
  assert.match(attributes, /\*\.yml text eol=lf/);
  assert.match(attributes, /\*\.tftpl text eol=lf/);
});
