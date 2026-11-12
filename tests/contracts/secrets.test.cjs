const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

test('real SSH key is absent and ignored; example contains no private key material', () => {
  assert.equal(fs.existsSync('terraform/botrucho'), false);
  const example = fs.readFileSync('terraform/modules/portainer/botrucho.example', 'utf8');
  assert.match(example, /placeholder/i);
  assert.doesNotMatch(example, /-----BEGIN .*PRIVATE KEY-----/);
  assert.equal(
    execFileSync('git', ['check-ignore', '--no-index', 'terraform/botrucho'], {
      encoding: 'utf8',
    }).trim(),
    'terraform/botrucho',
  );
});
