const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('runtime and toolchain declare Node26 and independent TypeScript7 checking', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.equal(pkg.engines.node, '>=26.0.0');
  assert.equal(fs.readFileSync('.nvmrc', 'utf8').trim(), '26');
  assert.equal(pkg.devDependencies.typescript, '7.0.2');
  assert.equal(pkg.devDependencies['typescript-eslint'], undefined);
  assert.match(pkg.scripts.lint, /eslint/);
  assert.match(pkg.scripts.typecheck, /tsc --noEmit/);
});

test('build uses standard SWC commands without a custom script directory', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.match(pkg.scripts.build, /swc src -d dist/);
  assert.doesNotMatch(JSON.stringify(pkg.scripts), /npx cpx|copy-env/);
  assert.match(pkg.scripts.build, /languages/);
  assert.match(pkg.scripts.build, /assets/);
  assert.equal(fs.existsSync('scripts'), false);
});
