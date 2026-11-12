const fs = require('node:fs');
const swc = require('@swc/core');
const Module = require('node:module');
const path = require('node:path');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (request.startsWith('@/')) request = path.resolve(__dirname, '../../src', request.slice(2));
  else if (request.startsWith('@languages/'))
    request = path.resolve(__dirname, '../../languages', request.slice(11));
  return resolve.call(this, request, ...args);
};

require.extensions['.ts'] = (module, filename) => {
  const { code } = swc.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename,
    swcrc: false,
    jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
    module: { type: 'commonjs' },
  });
  module._compile(code, filename);
};
