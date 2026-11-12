const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : file.endsWith('.ts') ? [file] : [];
  });
}

test('source imports use configured aliases instead of parent-directory traversal', () => {
  for (const file of files('src')) {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /(?:from\s*|import\s*\()['"]\.\.\//, file);
  }
});

test('SWC rewrites a runtime alias into a relative compiled import', () => {
  const swc = require('@swc/core');
  const result = swc.transformSync(
    "import { createShutdown } from '@/runtime/lifecycle'; console.log(createShutdown);",
    {
      filename: path.resolve('src/sharder.ts'),
      jsc: { baseUrl: path.resolve('.'), paths: { '@/*': ['./src/*'] } },
    },
  );
  assert.doesNotMatch(result.code, /require\(["']@\//);
  assert.match(result.code, /runtime\/lifecycle/);
});
