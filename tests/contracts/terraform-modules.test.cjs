const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('one Terraform root activates only GCP and preserves an inactive Portainer module', () => {
  assert.equal(fs.existsSync('infra'), false);
  const root = fs.readFileSync('terraform/main.tf', 'utf8');
  assert.match(root, /module "gcp"/);
  assert.match(root, /source\s*=\s*"\.\/modules\/gcp"/);
  assert.doesNotMatch(root, /module "portainer"|docker_image|google_compute_instance/);
  assert.ok(fs.existsSync('terraform/modules/portainer/docker.tf'));
  assert.ok(fs.existsSync('terraform/modules/gcp/main.tf'));
});

test('GCP sudo policy excludes metadata users from blanket Google sudo grants', () => {
  const script = fs.readFileSync('terraform/modules/gcp/startup.sh.tftpl', 'utf8');
  assert.match(script, /%google-sudoers, !botuser/);
  assert.match(script, /visudo -cf \/etc\/sudoers.d\/google_sudoers/);
});
