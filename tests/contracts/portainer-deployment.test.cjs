const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

test('optional Portainer deployment validates and passes a single-shard default', () => {
  const variables = readFileSync('terraform/modules/portainer/variables.tf', 'utf8');
  const deployment = readFileSync('terraform/modules/portainer/ssh-connect.tf', 'utf8');
  assert.match(variables, /variable "shards"/);
  assert.match(variables, /var\.shards >= 1/);
  assert.match(variables, /floor\(var\.shards\) == var\.shards/);
  assert.match(variables, /variable "shards"[\s\S]*?default\s*=\s*1/);
  assert.match(deployment, /-e SHARDS=\$\{var\.shards\}/);
  assert.match(deployment, /shards\s*=\s*var\.shards/);
});

test('local Compose provides an explicit positive shard default over encrypted legacy config', () => {
  const compose = readFileSync('docker-compose.yml', 'utf8');
  assert.match(compose, /SHARDS=\$\{SHARDS:-1\}/);
});

test('Terraform constrains resources and stops before removing the container', () => {
  const tf = readFileSync('terraform/modules/portainer/ssh-connect.tf', 'utf8');
  const variables = readFileSync('terraform/modules/portainer/variables.tf', 'utf8');
  assert.match(tf, /--memory=\$\{var\.memory_mb\}m/);
  assert.match(tf, /--memory-swap=\$\{var\.memory_mb\}m/);
  assert.match(tf, /--cpus=\$\{var\.cpu_limit\}/);
  assert.match(tf, /--log-opt max-size=10m --log-opt max-file=3/);
  assert.match(tf, /docker stop --time 15 botrucho/);
  assert.doesNotMatch(tf, /docker rm -f/);
  assert.match(variables, /variable "memory_mb"/);
});

test('Terraform private env file precedes upload and key is not interpolated into shell', () => {
  const tf = readFileSync('terraform/modules/portainer/ssh-connect.tf', 'utf8');
  assert.match(tf, /provisioner "file"/);
  assert.ok(tf.indexOf('umask 077') < tf.indexOf('provisioner "file"'));
  assert.match(tf, /--env-file/);
  assert.doesNotMatch(tf, /docker run -e DOTENV_PRIVATE_KEY_PRODUCTION/);
});

test('production has readiness healthcheck, no npx wrapper, and compose has matching limits', () => {
  const dockerfile = readFileSync('docker/Dockerfile', 'utf8');
  const compose = readFileSync('docker-compose.yml', 'utf8');
  assert.match(dockerfile, /HEALTHCHECK/);
  assert.match(dockerfile, /CMD \["\.\/node_modules\/\.bin\/dotenvx"/);
  assert.match(dockerfile, /--max-old-space-size=96/);
  assert.match(compose, /mem_limit: 700m/);
  assert.match(compose, /stop_grace_period: 15s/);
  assert.match(compose, /max-size: ['"]10m['"]/);
});
