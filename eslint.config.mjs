import path from 'node:path';

import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const includeTestsFromEnv = process.env.ESLINT_INCLUDE_TESTS === '1';
const workspaceRootDir = process.cwd();
const sourceTsProject = path.join(workspaceRootDir, 'tsconfig.eslint-src.json');
const testTsProject = path.join(workspaceRootDir, 'tsconfig.eslint-tests.json');

const testFiles = [
  'src/**/__tests__/**/*.{js,jsx,ts,tsx}',
  'e2e/**/*.{js,jsx,ts,tsx}',
  'src/**/*.test.{js,jsx,ts,tsx}',
  'src/**/*.spec.{js,jsx,ts,tsx}',
];

const sourceFiles = ['src/**/*.{js,jsx,ts,tsx}'];
const serverFiles = [
  'src/app/api/**/*.{ts,tsx,js,jsx}',
  'src/middleware.ts',
  'src/instrumentation.ts',
  'src/**/*.server.{ts,tsx,js,jsx}',
];
const scannerScriptMjsFiles = [
  'scripts/ai-paths/**/*.mjs',
  'scripts/architecture/**/*.mjs',
  'scripts/cleanup/**/*.mjs',
  'scripts/canonical/**/*.mjs',
  'scripts/db/**/*.mjs',
  'scripts/docs/**/*.mjs',
  'scripts/lib/**/*.mjs',
  'scripts/observability/**/*.mjs',
  'scripts/perf/**/*.mjs',
  'scripts/quality/**/*.mjs',
  'scripts/testing/**/*.mjs',
];
const scannerScriptTsFiles = [
  'scripts/ai-paths/**/*.ts',
  'scripts/architecture/**/*.test.ts',
  'scripts/auth/**/*.ts',
  'scripts/canonical/**/*.test.ts',
  'scripts/cleanup/**/*.ts',
  'scripts/db/**/*.ts',
  'scripts/docs/**/*.ts',
  'scripts/observability/**/*.test.ts',
  'scripts/perf/**/*.ts',
  'scripts/quality/**/*.test.ts',
  'scripts/testing/**/*.ts',
];

const typedSourceLanguageOptions = {
  parser: tseslint.parser,
  parserOptions: {
    project: sourceTsProject,
    tsconfigRootDir: workspaceRootDir,
    ecmaFeatures: {
      jsx: true,
    },
  },
};

const typedTestLanguageOptions = {
  parser: tseslint.parser,
  parserOptions: {
    project: testTsProject,
    tsconfigRootDir: workspaceRootDir,
    ecmaFeatures: {
      jsx: true,
    },
  },
};

const sharedPluginConfig = {
  '@typescript-eslint': tseslint.plugin,
};

const sharedSettings = {
  react: {
    version: 'detect',
  },
};

const preservedLegacyCoreRuleOffs = {
  'no-useless-assignment': 'off',
  'preserve-caught-error': 'off',
};

const commonRules = {
  ...js.configs.recommended.rules,
  ...preservedLegacyCoreRuleOffs,
  indent: 'off',
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
    'auto-keep-trying.js',
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
    files: scannerScriptMjsFiles,
    ignores: ['scripts/architecture/debug-edges.mjs'],
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
      ...preservedLegacyCoreRuleOffs,
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
    },
  },

  {
    files: scannerScriptTsFiles,
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
      ...preservedLegacyCoreRuleOffs,
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
    files: [
      'src/shared/hooks/use-folder-tree-profile.ts',
      'src/shared/hooks/useAdminChatbotSessionAccess.ts',
      'src/shared/hooks/useDraftQueries.ts',
      'src/shared/lib/ai-brain/components/BrainCatalogTree.tsx',
      'src/shared/lib/ai-brain/components/BrainRoutingTree.tsx',
      'src/shared/lib/api/api-handler.ts',
      'src/shared/lib/case-resolver-capture-adapter.ts',
      'src/shared/lib/data-import-export-adapter.ts',
      'src/shared/lib/db/services/database-backup-scheduler.ts',
      'src/shared/lib/db/services/database-engine-access.ts',
      'src/shared/lib/image-studio-adapter.ts',
      'src/shared/lib/kangur-ai-context-provider.ts',
      'src/shared/lib/kangur-cms-adapter.ts',
      'src/shared/lib/observability/runtime-context/hydrate-system-log-runtime-context.ts',
      'src/shared/lib/product-integrations-adapter.ts',
      'src/shared/lib/product-integrations-server.ts',
      'src/shared/lib/product-sync-adapter.ts',
      'src/shared/lib/product-validator-admin.ts',
      'src/shared/ui/files.ts',
      'src/shared/utils/observability/error-system.ts',
      'src/shared/lib/auth/settings-manage-access.ts',
    ],
  },

  {
    files: ['*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
    },
  },
]);
