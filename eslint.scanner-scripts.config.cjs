const js = require('@eslint/js');
const globals = require('globals');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
  },
  {
    files: [
      'scripts/ai-paths/**/*.mjs',
      'scripts/architecture/**/*.mjs',
      'scripts/canonical/**/*.mjs',
      'scripts/docs/**/*.mjs',
      'scripts/lib/**/*.mjs',
      'scripts/observability/**/*.mjs',
      'scripts/quality/**/*.mjs',
    ],
    ignores: [
      'scripts/architecture/debug-edges.mjs',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        console: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
    },
  },
  {
    files: [
      'scripts/ai-paths/**/*.ts',
      'scripts/architecture/**/*.test.ts',
      'scripts/canonical/**/*.test.ts',
      'scripts/docs/**/*.ts',
      'scripts/observability/**/*.test.ts',
      'scripts/quality/**/*.test.ts',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      globals: {
        ...globals.node,
        ...globals.jest,
        console: 'readonly',
        process: 'readonly',
        vi: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  }
);
