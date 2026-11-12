import babelParser from '@babel/eslint-parser';
import prettier from 'eslint-config-prettier';
import importX from 'eslint-plugin-import-x';

// TypeScript 7 checking belongs to tsc; this parser only supplies syntax to
// import-order rules. Oxlint handles TypeScript lint without a TS compiler peer.
export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: { plugins: ['@babel/plugin-syntax-typescript'] },
      },
    },
    plugins: { 'import-x': importX },
    rules: {
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object'],
          pathGroups: [
            { pattern: '@/**', group: 'internal' },
            { pattern: '@languages/**', group: 'internal' },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
  prettier,
];
