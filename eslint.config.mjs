import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const includeTestsFromEnv = process.env.ESLINT_INCLUDE_TESTS === '1';

const testFiles = [
  '**/__tests__/**/*.{js,jsx,ts,tsx}',
  'e2e/**/*.{js,jsx,ts,tsx}',
  '**/*.test.{js,jsx,ts,tsx}',
  '**/*.spec.{js,jsx,ts,tsx}',
];

const sourceFiles = ['src/**/*.{js,jsx,ts,tsx}'];
const serverFiles = [
  'src/app/api/**/*.{ts,tsx,js,jsx}',
  'src/middleware.ts',
  'src/instrumentation.ts',
  'src/**/*.server.{ts,tsx,js,jsx}',
];

const typedSourceLanguageOptions = {
  parser: tseslint.parser,
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: import.meta.dirname,
    ecmaFeatures: {
      jsx: true,
    },
  },
};

const typedTestLanguageOptions = {
  parser: tseslint.parser,
  parserOptions: {
    project: './tsconfig.eslint-tests.json',
    tsconfigRootDir: import.meta.dirname,
    ecmaFeatures: {
      jsx: true,
    },
  },
};

const sharedPluginConfig = {
  '@typescript-eslint': tseslint.plugin,
  react: reactPlugin,
  'react-hooks': reactHooksPlugin,
  import: importPlugin,
  '@next/next': nextPlugin,
};

const sharedSettings = {
  react: {
    version: 'detect',
  },
  'import/resolver': {
    typescript: {
      project: './tsconfig.json',
    },
    node: true,
  },
};

const commonRules = {
  ...js.configs.recommended.rules,
  indent: ['error', 2, { SwitchCase: 1 }],
  'linebreak-style': ['error', 'unix'],
  quotes: ['error', 'single'],
  'jsx-quotes': ['error', 'prefer-single'],
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
  'no-redeclare': 'off',
  '@typescript-eslint/no-redeclare': 'error',
  'no-dupe-class-members': 'off',
  '@typescript-eslint/no-dupe-class-members': 'error',
  'no-loss-of-precision': 'off',
  '@typescript-eslint/no-loss-of-precision': 'error',
  'no-undef': 'off',
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-unsafe-assignment': 'error',
  '@typescript-eslint/no-unsafe-call': 'error',
  '@typescript-eslint/no-unsafe-member-access': 'error',
  '@typescript-eslint/no-unsafe-argument': 'error',
  '@typescript-eslint/no-unsafe-return': 'error',
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/no-misused-promises': 'error',
  '@typescript-eslint/await-thenable': 'error',
  '@typescript-eslint/no-confusing-void-expression': [
    'error',
    { ignoreArrowShorthand: true },
  ],
  '@typescript-eslint/no-unnecessary-type-assertion': 'error',
  '@typescript-eslint/prefer-optional-chain': 'error',
  '@typescript-eslint/restrict-plus-operands': 'error',
  'react/react-in-jsx-scope': 'off',
  'react/display-name': 'off',
  'react/prop-types': 'off',
  '@next/next/no-img-element': 'warn',
  'import/order': [
    'warn',
    {
      groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index'], 'object', 'type'],
      pathGroups: [
        {
          pattern: '@/**',
          group: 'internal',
        },
      ],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true,
      },
    },
  ],
  'import/no-restricted-paths': [
    'error',
    {
      zones: [
        { target: './src/shared', from: './src/features' },
        { target: './src/app/api', from: './src/features' },
      ],
    },
  ],
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        {
          group: ['use client', 'use server'],
          message: 'Prefer module-level directives over restricted imports.',
        },
      ],
    },
  ],
};

export default defineConfig([
  globalIgnores([
    'node_modules/**',
    '.next/**',
    '.next-dev/**',
    '.next-dev*/**',
    '.next-codex-build/**',
    'dist/**',
    'public/**',
    'build/**',
    'out/**',
    'coverage/**',
    'temp/**',
    'tmp/**',
    '__tests__/mocks/**/*',
    '*.cjs',
    '*.mjs',
    'auto-keep-trying.js',
    'scripts/**',
    'prisma/**',
    'extract_errors.cjs',
    'summarize_errors.cjs',
    'summarize_eslint.cjs',
    'temp_summarize.cjs',
    'auto-keep-trying-interactive.mjs',
    'gemini-headless-fallback.sh',
    'gemini-headless-menu-fallback.sh',
    'gemini-headless-retry.sh',
    'gemini-retry.sh',
    'run-gemini.command',
    ...(includeTestsFromEnv ? [] : testFiles),
  ]),

  {
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
  },

  {
    files: sourceFiles,
    ignores: testFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      ...typedSourceLanguageOptions,
      globals: {
        console: 'readonly',
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
      },
    },
    plugins: sharedPluginConfig,
    settings: sharedSettings,
    rules: commonRules,
  },

  {
    files: sourceFiles,
    ignores: [...testFiles, 'src/app/api/**', 'src/middleware.ts', 'src/instrumentation.ts', 'src/**/*.server.{ts,tsx,js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        React: 'readonly',
        performance: 'readonly',
        crypto: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        structuredClone: 'readonly',
      },
    },
  },

  {
    files: serverFiles,
    languageOptions: {
      globals: {
        ...globals.node,
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    rules: {
      'no-console': 'warn',
      'import/no-restricted-paths': [
        'error',
        {
          zones: [{ target: './src/shared', from: './src/features' }],
        },
      ],
    },
  },

  {
    files: testFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      ...typedTestLanguageOptions,
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        vi: 'readonly',
      },
    },
    plugins: sharedPluginConfig,
    settings: sharedSettings,
    rules: {
      ...commonRules,
      'import/no-restricted-paths': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },

  {
    files: [
      'src/shared/hooks/query/*.ts',
      'src/shared/hooks/useQueryComposition.ts',
      'src/shared/hooks/useQueryScheduler.ts',
      'src/shared/hooks/useQueryAnalytics.ts',
      'src/features/products/hooks/useEnhancedQueries.ts',
      'src/features/products/hooks/useProductEnhancements.ts',
      'src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsRuntime.ts',
      'src/features/ai/ai-paths/context/hooks/useLegacySync.ts',
      'src/shared/dtos/*.ts',
      'src/mocks/__tests__/*.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },

  {
    files: ['*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
    },
  },
]);
