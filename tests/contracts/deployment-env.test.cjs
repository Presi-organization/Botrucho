const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('deployment uses one application key instead of reconstructing application settings', () => {
  const workflow = fs.readFileSync('.github/workflows/deploy.yml', 'utf8');
  const secrets = [
    ...new Set([...workflow.matchAll(/secrets\.([A-Z_0-9]+)/g)].map((match) => match[1])),
  ].sort();
  assert.deepEqual(
    secrets,
    ['DOTENV_PRIVATE_KEY_PRODUCTION', 'VM_HOST', 'VM_SSH_KNOWN_HOSTS', 'VM_SSH_PRIVATE_KEY'].sort(),
  );
  assert.doesNotMatch(workflow, /buildEnvironment|ENV_FILE|REMOTE_DEPLOY|rollback|releases\//);
  assert.match(workflow, /umask 077/);
  assert.match(workflow, /chmod 600 \.env\.keys/);
  assert.match(workflow, /DOTENV_PRIVATE_KEY_PRODUCTION=%s/);
});

test('predefined transfer and restart actions retain explicit host verification', () => {
  const workflow = fs.readFileSync('.github/workflows/deploy.yml', 'utf8');
  assert.match(workflow, /uses: easingthemes\/ssh-deploy@[a-f0-9]{40}/);
  assert.match(workflow, /uses: appleboy\/ssh-action@[a-f0-9]{40}/);
  assert.match(
    workflow,
    /SOURCE:.*dist.*node_modules.*package\.json.*\.env\.production.*\.env\.keys/,
  );
  assert.match(workflow, /StrictHostKeyChecking=yes/);
  assert.match(workflow, /fingerprint:.*steps\.ssh\.outputs\.fingerprint/);
  const fingerprintCommand = workflow
    .split('\n')
    .find((line) => line.trim().startsWith('fingerprint='));
  assert.match(fingerprintCommand, /ssh-keygen -F "\$VM_HOST"/);
  assert.doesNotMatch(workflow, /SCRIPT_AFTER|StrictHostKeyChecking=no/);
  assert.match(
    workflow,
    /sudo systemctl restart discord-bot && systemctl is-active --quiet discord-bot/,
  );
});

test('Docker and systemd share a pinned core dotenvx CLI and encrypted config', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.equal(pkg.dependencies['@dotenvx/dotenvx'], '2.38.2');
  assert.equal(pkg.dependencies['@dotenvx/dotenvx-pro'], undefined);
  const dockerfile = fs.readFileSync('docker/Dockerfile', 'utf8');
  assert.match(dockerfile, /node_modules\/\.bin\/dotenvx/);
  assert.doesNotMatch(dockerfile, /dotenvx\.sh\/install/);
  const startup = fs.readFileSync('terraform/modules/gcp/startup.sh.tftpl', 'utf8');
  assert.match(startup, /EnvironmentFile=\/opt\/discord-bot\/\.env\.keys/);
  assert.match(startup, /ExecStart=\/opt\/discord-bot\/node_modules\/\.bin\/dotenvx run/);
  assert.match(startup, /WorkingDirectory=\/opt\/discord-bot\/dist/);
  assert.doesNotMatch(startup, /current\/|\/releases/);
});

test('application secrets remain encrypted in the committed production config', () => {
  const config = fs.readFileSync('.env.production', 'utf8');
  for (const name of [
    'DISCORD_TOKEN',
    'MONGO_URI',
    'AISPEECH_TOKEN',
    'WEBOOK_TOKEN',
    'RIOT_TOKEN',
    'FOOTBALL_TOKEN',
  ]) {
    const value = config.match(new RegExp(`^${name}=(.*)$`, 'm'))?.[1]?.replace(/^["']|["']$/g, '');
    assert.ok(value?.startsWith('encrypted:'), `${name} must remain encrypted`);
  }
});
