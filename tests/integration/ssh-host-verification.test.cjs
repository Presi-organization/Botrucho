const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

test(
  'rsync can read the prepared known-hosts file when runner and container temp paths differ',
  { skip: process.platform === 'win32' },
  (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'botrucho-container-hosts-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const containerTemp = path.join(root, 'container-temp');
    fs.mkdirSync(containerTemp);
    const host = '203.0.113.1';
    const key = path.join(root, 'host-key');
    execFileSync('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-f', key]);
    const knownHosts = path.join(containerTemp, 'bot_known_hosts');
    fs.writeFileSync(knownHosts, `${host} ${fs.readFileSync(`${key}.pub`, 'utf8')}`);

    const workflow = fs.readFileSync('.github/workflows/deploy.yml', 'utf8');
    const outputCommand = workflow
      .split(/\r?\n/)
      .find((line) => line.includes('echo "known_hosts_file='));
    assert.ok(outputCommand, 'Preparation must emit its actual container-side file path');
    const output = path.join(root, 'step-output');
    execFileSync('bash', ['-c', outputCommand.trim()], {
      env: { ...process.env, RUNNER_TEMP: containerTemp, GITHUB_OUTPUT: output },
    });
    const emitted = fs
      .readFileSync(output, 'utf8')
      .trim()
      .replace(/^known_hosts_file=/, '');
    assert.equal(emitted, knownHosts);

    const template = workflow.split(/\r?\n/).find((line) => line.includes('SSH_CMD_ARGS:'));
    const rendered = template
      .replace(/\$\{\{\s*steps\.ssh\.outputs\.known_hosts_file\s*\}\}/g, emitted)
      .replace(/\$\{\{\s*runner\.temp\s*\}\}/g, path.join(root, 'unmounted-host-temp'));
    const sshFile = rendered.match(/UserKnownHostsFile=([^,]+)/)?.[1];
    assert.equal(sshFile, knownHosts);
    execFileSync('ssh-keygen', ['-F', host, '-f', sshFile]);
  },
);

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
