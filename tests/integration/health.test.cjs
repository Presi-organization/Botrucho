require('../helpers/register-typescript.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

test('health reports 503 until ready, 200 after ready, and 503 after readiness loss', async () => {
  const { createHealthRoute } = require('@/routes/health');
  let ready = false;
  const app = express();
  app.use(createHealthRoute(() => ready));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/`;
    assert.equal((await fetch(url)).status, 503);
    ready = true;
    assert.equal((await fetch(url)).status, 200);
    ready = false;
    assert.equal((await fetch(url)).status, 503);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
