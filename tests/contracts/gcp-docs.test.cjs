const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

test('main README matches the current toolchain, test commands and deployment model', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.ok(
    fs.readdirSync('.').includes('README.md'),
    'Use the canonical uppercase README.md filename',
  );
  const readme = fs.readFileSync('README.md', 'utf8');
  assert.ok(readme.includes(`Node.js ${pkg.engines.node.match(/\d+/)[0]}`));
  assert.ok(readme.includes(`TypeScript ${pkg.devDependencies.typescript.split('.')[0]}`));
  for (const command of [
    'docker compose up --build',
    'npm run test:unit',
    'npm run test:integration',
    'npm run test:contracts',
  ]) {
    assert.ok(readme.includes(command), command);
  }
  assert.ok(readme.includes('`master`'));
  assert.match(readme, /does not bootstrap an empty VM/);
  assert.ok(readme.includes('terraform/README.md'));
  assert.ok(readme.includes('tests/README.md'));
});

test('GCP docs name all environment and SSH secrets and warn about IPv4 billing', async () => {
  const variables = ['DOTENV_PRIVATE_KEY_PRODUCTION'];
  const readme = fs.readFileSync('terraform/README.md', 'utf8');
  for (const name of [...variables, 'VM_HOST', 'VM_SSH_PRIVATE_KEY', 'VM_SSH_KNOWN_HOSTS'])
    assert.ok(readme.includes(name), name);
  assert.match(readme, /terraform apply/);
  assert.match(readme, /0,005/);
  assert.match(readme, /dist\/src\/sharder\.js/);
});

test('Terraform state, env and key files are ignored while examples remain visible', () => {
  for (const name of [
    'terraform/.terraform/a',
    'terraform/test.tfstate.backup',
    'terraform/test.tfvars',
    '.env',
    'test-key',
    'secret.pem',
  ]) {
    assert.ok(
      execFileSync('git', ['check-ignore', '--no-index', name], { encoding: 'utf8' }).trim(),
      name,
    );
  }
  const ignored = require('node:child_process').spawnSync('git', [
    'check-ignore',
    '--no-index',
    'terraform/terraform.tfvars.example',
  ]);
  assert.equal(ignored.status, 1);
});
