const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

test(
  'workflow fingerprints the requested VM rather than the first known host',
  { skip: process.platform === 'win32' },
  (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'botrucho-known-hosts-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    for (const name of ['other', 'target']) {
      execFileSync('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-f', path.join(root, name)]);
    }
    fs.writeFileSync(
      path.join(root, 'bot_known_hosts'),
      `203.0.113.2 ${fs.readFileSync(path.join(root, 'other.pub'), 'utf8')}203.0.113.1 ${fs.readFileSync(path.join(root, 'target.pub'), 'utf8')}`,
    );
    const line = fs
      .readFileSync('.github/workflows/deploy.yml', 'utf8')
      .split(/\r?\n/)
      .find((value) => value.trim().startsWith('fingerprint='));
    assert.ok(line);
    const actual = execFileSync(
      'bash',
      ['-c', `set -euo pipefail\n${line}\nprintf '%s' "$fingerprint"`],
      {
        env: { ...process.env, RUNNER_TEMP: root, VM_HOST: '203.0.113.1' },
        encoding: 'utf8',
      },
    );
    const expected = execFileSync(
      'ssh-keygen',
      ['-lf', path.join(root, 'target.pub'), '-E', 'sha256'],
      { encoding: 'utf8' },
    ).split(/\s+/)[1];
    assert.equal(actual, expected);
  },
);
