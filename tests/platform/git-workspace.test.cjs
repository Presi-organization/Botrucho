const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

test(
  'workflow fixes container checkout ownership without trusting other repositories',
  {
    skip: process.platform !== 'linux' || process.getuid() !== 0,
  },
  (t) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'botrucho git-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const env = {
      ...process.env,
      GIT_CONFIG_GLOBAL: path.join(root, 'gitconfig'),
      GIT_CONFIG_NOSYSTEM: '1',
    };
    const repos = ['checkout', 'unrelated'].map((name) => path.join(root, name));
    for (const repo of repos) {
      execFileSync('git', ['init', '-q', repo], { env });
      fs.writeFileSync(path.join(repo, '.gitignore'), '.env\n');
      execFileSync('chown', ['-R', '1001:1001', repo]);
    }
    const check = (cwd) =>
      spawnSync('git', ['check-ignore', '--no-index', '.env'], { cwd, env, encoding: 'utf8' });
    const before = check(repos[0]);
    assert.equal(before.status, 128);
    assert.match(before.stderr, /dubious ownership/);

    const command = fs
      .readFileSync('.github/workflows/deploy.yml', 'utf8')
      .split(/\r?\n/)
      .find((line) => line.includes('git config --global --add safe.directory'));
    assert.ok(command, 'Workflow must explicitly trust the checked-out workspace');
    execFileSync('bash', ['-c', command.trim()], { env: { ...env, GITHUB_WORKSPACE: repos[0] } });
    assert.equal(check(repos[0]).status, 0);
    assert.equal(check(repos[0]).stdout.trim(), '.env');
    assert.equal(check(repos[1]).status, 128, 'Unrelated repositories must remain untrusted');
  },
);
