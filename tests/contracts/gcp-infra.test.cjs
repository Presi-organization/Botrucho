const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('GCP instance stays in the requested region, machine and disk classes', () => {
  const tf = fs.readFileSync('terraform/modules/gcp/main.tf', 'utf8');
  assert.match(tf, /google_compute_instance/);
  for (const value of [
    'us-east1-b',
    'e2-micro',
    'pd-standard',
    'debian-cloud\/debian-13',
    'STANDARD',
  ])
    assert.match(tf, new RegExp(value));
  assert.match(tf, /size\s*=\s*20/);
  assert.doesNotMatch(tf, /pd-balanced|google_compute_snapshot|google_compute_address/);
  assert.match(fs.readFileSync('terraform/outputs.tf', 'utf8'), /vm_external_ip/);
});

test('existing VM adoption declares an import and protects against instance destruction', () => {
  const imports = fs.readFileSync('terraform/imports.tf', 'utf8');
  assert.match(imports, /to\s*=\s*module\.gcp\.google_compute_instance\.bot/);
  assert.ok(
    imports.includes('projects/${var.project_id}/zones/us-east1-b/instances/${var.instance_name}'),
  );
  const resource = fs.readFileSync('terraform/modules/gcp/main.tf', 'utf8');
  assert.match(resource, /prevent_destroy\s*=\s*true/);
  assert.match(resource, /startup-script\s*=\s*templatefile/);
  assert.doesNotMatch(resource, /metadata_startup_script\s*=/);
  assert.ok(resource.includes('boot_disk[0].initialize_params[0].image'));
});

test('CI and local containers match the existing Debian13 VM', () => {
  assert.match(
    fs.readFileSync('.github/workflows/deploy.yml', 'utf8'),
    /container: node:26-trixie/,
  );
  assert.match(fs.readFileSync('docker/Dockerfile.ci', 'utf8'), /FROM node:26-trixie/);
  assert.match(fs.readFileSync('docker/Dockerfile', 'utf8'), /FROM node:26-trixie-slim/);
});

test('startup guards swap, installs Node26 without compiling the bot and gates first start', () => {
  const script = fs.readFileSync('terraform/modules/gcp/startup.sh.tftpl', 'utf8');
  assert.match(script, /\[ ! -f \/swapfile \]/);
  assert.match(script, /grep.*swapfile/);
  assert.match(script, /setup_26\.x/);
  assert.match(script, /libatomic1/);
  assert.match(script, /--max-old-space-size=512/);
  assert.match(script, /\/opt\/discord-bot\/dist\/src\/sharder\.js/);
  assert.match(script, /WorkingDirectory=\/opt\/discord-bot\/dist/);
  assert.match(script, /EnvironmentFile=\/opt\/discord-bot\/\.env\.keys/);
  assert.match(script, /ConditionPathExists=/);
  assert.match(script, /Restart=always/);
  assert.doesNotMatch(script, /npm (?:ci|install|run build)/);
});
