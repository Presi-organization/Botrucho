// Test-only process chain: no Discord, credentials, database or network.
require('../helpers/register-typescript.cjs');
const { createShutdown } = require('@/runtime/lifecycle');
const { stopChild } = require('@/runtime/supervisor');
const { fork } = require('node:child_process');

const isChild = process.argv.includes('--child');
const keepAlive = setInterval(() => {}, 1000);
const child = isChild ? null : fork(__filename, ['--child']);
const shutdown = createShutdown({
  timeoutMs: isChild ? 8000 : 12000,
  report: (error) => console.error(error),
  exit: (code) => {
    console.log(`${isChild ? 'child' : 'manager'}:exit:${code}`);
    process.exit(code);
  },
  steps: [() => clearInterval(keepAlive), () => (child ? stopChild(child) : undefined)],
});
process.on('SIGTERM', () => void shutdown(0));
process.on('SIGINT', () => void shutdown(0));
process.on('message', (message) => {
  if (message === 'botrucho:shutdown') void shutdown(0);
});
if (child) child.on('message', () => console.log('manager:ready'));
else process.send('ready');
