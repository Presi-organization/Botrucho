const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync, spawnSync } = require('node:child_process');

test(
  'isolated Linux policy denies root commands despite metadata group and validates systemd',
  {
    skip:
      process.platform !== 'linux'
        ? 'Requires Linux'
        : process.env.BOT_VERIFY_SUDO !== '1'
          ? 'Enable BOT_VERIFY_SUDO=1 only inside the disposable verification container'
          : false,
  },
  () => {
    // Enabled ONLY in the disposable verification container, never on a VM.
    assert.equal(process.getuid(), 0);
    const source = fs.readFileSync('terraform/modules/gcp/startup.sh.tftpl', 'utf8');
    const content = (marker) =>
      source.match(new RegExp(`<<'${marker}'\\n([\\s\\S]*?)\\n${marker}`))[1] + '\n';
    if (spawnSync('getent', ['group', 'google-sudoers']).status !== 0)
      execFileSync('groupadd', ['google-sudoers']);
    if (spawnSync('id', ['botuser']).status !== 0)
      execFileSync('useradd', ['--create-home', '-G', 'google-sudoers', 'botuser']);
    fs.mkdirSync('/etc/sudoers.d', { recursive: true });
    fs.writeFileSync('/etc/sudoers.d/google_sudoers', content('GOOGLE_SUDOERS'), { mode: 0o440 });
    fs.writeFileSync('/etc/sudoers.d/discord-bot', content('SUDOERS'), { mode: 0o440 });
    execFileSync('visudo', ['-cf', '/etc/sudoers']);
    assert.equal(spawnSync('sudo', ['-n', '-U', 'botuser', '-l', '/usr/bin/id']).status, 1);
    assert.equal(
      spawnSync('sudo', ['-n', '-U', 'botuser', '-l', '/usr/bin/systemctl', 'stop', 'discord-bot'])
        .status,
      1,
    );
    assert.equal(
      spawnSync('sudo', [
        '-n',
        '-U',
        'botuser',
        '-l',
        '/usr/bin/systemctl',
        'restart',
        'discord-bot',
      ]).status,
      0,
    );
    fs.writeFileSync('/tmp/discord-bot.service', content('UNIT'));
    if (!fs.existsSync('/usr/bin/node')) fs.symlinkSync(process.execPath, '/usr/bin/node');
    fs.mkdirSync('/opt/discord-bot/node_modules/.bin', { recursive: true });
    if (!fs.existsSync('/opt/discord-bot/node_modules/.bin/dotenvx')) {
      fs.symlinkSync(
        require('node:path').resolve('node_modules/.bin/dotenvx'),
        '/opt/discord-bot/node_modules/.bin/dotenvx',
      );
    }
    execFileSync('systemd-analyze', ['verify', '/tmp/discord-bot.service']);
  },
);
