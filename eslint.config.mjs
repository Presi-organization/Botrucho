// @ts-check

import tseslint from 'typescript-eslint';
import eslint from '@eslint/js';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  {
    rules: {
      'quotes': ['error', 'single'],
      'no-console': 'warn',
    },
    ignores: ['dist/**/*', 'node_modules/**', 'src/utils/logger/logger.util.ts'],
  }
)
