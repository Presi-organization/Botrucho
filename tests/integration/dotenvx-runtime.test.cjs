const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync, spawn } = require('node:child_process');
const { once } = require('node:events');

const cli = path.resolve('node_modules/@dotenvx/dotenvx/src/cli/dotenvx.js');
const signalProbe = path.resolve('tests/fixtures/signal-probe.cjs');
const isolatedOptions = ['--no-armor', '--no-native', '--no-1password', '--no-bitwarden'];

function fixture(t) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'botrucho-dotenvx-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  const env = { ...process.env };
  for (const name of Object.keys(env)) if (name.startsWith('DOTENV_')) delete env[name];
  fs.writeFileSync(path.join(cwd, '.env.production'), 'TEST_VALUE=synthetic-only\nSHARDS=auto\n');
  execFileSync(process.execPath, [cli, 'encrypt', '-f', '.env.production', ...isolatedOptions], {
    cwd,
    env,
  });
  const keysFile = path.join(cwd, '.env.keys');
  const key = fs
    .readFileSync(keysFile, 'utf8')
    .match(/^DOTENV_PRIVATE_KEY_PRODUCTION=["']?([a-f0-9]{64})["']?\s*$/m)?.[1];
  assert.ok(key, 'Encryption should generate an isolated test key');
  fs.unlinkSync(keysFile); // Decryption must use the environment key, like systemd.
  return { cwd, env: { ...env, DOTENV_PRIVATE_KEY_PRODUCTION: key, SHARDS: '1' } };
}

test('one dotenvx key decrypts config and preserves the explicit single-shard override', (t) => {
  const options = fixture(t);
  const output = execFileSync(
    process.execPath,
    [
      cli,
      'run',
      '--strict',
      '-f',
      '.env.production',
      ...isolatedOptions,
      '--',
      process.execPath,
      '-e',
      'console.log(JSON.stringify({value:process.env.TEST_VALUE,shards:process.env.SHARDS}))',
    ],
    { ...options, encoding: 'utf8' },
  );
  const result = JSON.parse(output.split('\n').find((line) => line.startsWith('{')));
  assert.deepEqual(result, { value: 'synthetic-only', shards: '1' });
});

test('strict dotenvx startup fails before launching Node when the key is wrong', (t) => {
  const options = fixture(t);
  options.env.DOTENV_PRIVATE_KEY_PRODUCTION = 'b'.repeat(64);
  const result = spawnSync(
    process.execPath,
    [
      cli,
      'run',
      '--strict',
      '-f',
      '.env.production',
      ...isolatedOptions,
      '--',
      process.execPath,
      '-e',
      'console.log("NODE_RAN")',
    ],
    { ...options, encoding: 'utf8' },
  );
  assert.notEqual(result.status, 0);
  assert.ok(!result.stdout.includes('NODE_RAN'));
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  test(
    `dotenvx forwards ${signal} through manager and child for clean shutdown`,
    { skip: process.platform === 'win32', timeout: 15_000 },
    async (t) => {
      const options = fixture(t);
      const child = spawn(
        process.execPath,
        [
          cli,
          'run',
          '--strict',
          '-f',
          '.env.production',
          ...isolatedOptions,
          '--',
          process.execPath,
          signalProbe,
        ],
        {
          ...options,
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
      t.after(() => {
        try {
          process.kill(-child.pid, 'SIGKILL');
        } catch (error) {
          if (error.code !== 'ESRCH') throw error;
        }
      });
      let output = '';
      let errors = '';
      child.stderr.on('data', (data) => {
        errors += data;
      });
      const closed = once(child, 'close');
      await new Promise((resolve, reject) => {
        child.on('error', reject);
        child.once('exit', () => reject(new Error(`Probe exited before readiness: ${errors}`)));
        child.stdout.on('data', (data) => {
          output += data;
          if (output.includes('manager:ready')) resolve();
        });
      });
      child.kill(signal);
      const [code] = await closed;
      assert.equal(code, 0, errors);
      assert.match(output, /child:exit:0/);
      assert.match(output, /manager:exit:0/);
    },
  );
}
