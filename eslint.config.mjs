import path from 'node:path';

import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
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
  'jsx-a11y': jsxA11y,
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

const kangurObservabilityContractImportNames = [
  'KangurKnowledgeGraphPreviewRequest',
  'KangurKnowledgeGraphPreviewResponse',
  'KangurKnowledgeGraphSemanticReadiness',
  'KangurKnowledgeGraphStatusSnapshot',
  'KangurKnowledgeGraphSyncRequest',
  'KangurKnowledgeGraphSyncResponse',
  'KangurRecentAnalyticsEvent',
  'kangurKnowledgeGraphPreviewRequestSchema',
  'kangurKnowledgeGraphSyncRequestSchema',
  'kangurKnowledgeGraphSyncResponseSchema',
];

const kangurObservabilityContractImportGuardMessage =
  'Import Kangur observability contracts from "@/shared/contracts/kangur-observability".';

const commonRestrictedImportPaths = [
  {
    name: '@/shared/contracts',
    importNames: kangurObservabilityContractImportNames,
    message: kangurObservabilityContractImportGuardMessage,
  },
  {
    name: '@/shared/contracts/admin',
    importNames: kangurObservabilityContractImportNames,
    message: kangurObservabilityContractImportGuardMessage,
  },
  {
    name: '@/shared/contracts/kangur',
    importNames: kangurObservabilityContractImportNames,
    message: kangurObservabilityContractImportGuardMessage,
  },
];

const commonRestrictedImportPatterns = [
  {
    group: ['use client', 'use server'],
    message: 'Prefer module-level directives over restricted imports.',
  },
];

const integrationsPublicRestriction = {
  name: '@/features/integrations/public',
  message:
    'Import product-facing integrations code from "@/features/integrations/product-integrations-adapter", route pages from "@/features/integrations/pages.public", or a narrower module directly.',
};

const commonRules = {
  ...js.configs.recommended.rules,
  ...preservedLegacyCoreRuleOffs,
  // --- complexity & size limits ---
  complexity: ['error', 8],
  'max-depth': ['error', 3],
  'max-params': ['error', 4],
  'max-lines-per-function': ['error', { max: 60, skipBlankLines: true, skipComments: true }],
  'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
  // --- style ---
  indent: 'off',
  'linebreak-style': ['error', 'unix'],
  quotes: ['error', 'single'],
  'jsx-quotes': ['error', 'prefer-single'],
  semi: ['error', 'always'],
  // --- correctness ---
  eqeqeq: ['error', 'always'],
  'no-var': 'error',
  'prefer-const': 'error',
  'no-console': 'error',
  'no-shadow': 'off',                          // superseded by TS rule below
  'no-throw-literal': 'off',                   // superseded by TS rule below
  'no-else-return': ['error', { allowElseIf: false }],
  'no-nested-ternary': 'error',
  'no-unneeded-ternary': 'error',
  'no-implicit-coercion': 'error',
  'object-shorthand': ['error', 'always'],
  'prefer-arrow-callback': 'error',
  'prefer-template': 'error',
  'no-param-reassign': ['error', { props: true }],
  'no-return-assign': 'error',
  'consistent-return': 'error',
  // --- unused vars ---
  'no-unused-vars': 'off',
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    },
  ],
  // --- TS duplicates of core rules ---
  'no-redeclare': 'off',
  '@typescript-eslint/no-redeclare': 'error',
  'no-dupe-class-members': 'off',
  '@typescript-eslint/no-dupe-class-members': 'error',
  'no-loss-of-precision': 'off',
  '@typescript-eslint/no-loss-of-precision': 'error',
  'no-undef': 'off',
  // --- TS strictness ---
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
  '@typescript-eslint/no-shadow': 'error',
  '@typescript-eslint/only-throw-error': 'error',
  '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'inline-type-imports' }],
  '@typescript-eslint/no-unnecessary-condition': 'error',
  '@typescript-eslint/strict-boolean-expressions': ['error', { allowNullableBoolean: false, allowNullableString: false, allowNullableNumber: false, allowString: false, allowNumber: false }],
  '@typescript-eslint/prefer-nullish-coalescing': ['error', { ignorePrimitives: { string: true } }],
  '@typescript-eslint/no-non-null-assertion': 'error',
  '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true, allowTypedFunctionExpressions: true }],
  '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' }],
  '@typescript-eslint/no-unnecessary-type-parameters': 'error',
  // --- naming & exports ---
  '@typescript-eslint/naming-convention': [
    'error',
    { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'] },
    { selector: 'function', format: ['camelCase', 'PascalCase'] },
    { selector: 'typeLike', format: ['PascalCase'] },
    { selector: 'enumMember', format: ['UPPER_CASE'] },
    { selector: 'interface', format: ['PascalCase'], custom: { regex: '^I[A-Z]', match: false } },
  ],
  // --- promise hygiene ---
  '@typescript-eslint/require-await': 'error',
  '@typescript-eslint/no-redundant-type-constituents': 'error',
  // --- defensive coding ---
  'no-promise-executor-return': 'error',
  'no-constructor-return': 'error',
  'no-unreachable-loop': 'error',
  'no-self-compare': 'error',
  'no-template-curly-in-string': 'error',
  'require-atomic-updates': 'error',
  'no-await-in-loop': 'error',
  'guard-for-in': 'error',
  'no-extend-native': 'error',
  'no-iterator': 'error',
  'no-proto': 'error',
  'no-sequences': 'error',
  'no-void': ['error', { allowAsStatement: false }],
  'prefer-object-spread': 'error',
  'prefer-rest-params': 'error',
  'prefer-spread': 'error',
  // --- import guard ---
  'no-restricted-imports': [
    'error',
    {
      paths: commonRestrictedImportPaths,
      patterns: commonRestrictedImportPatterns,
    },
  ],
};

const a11yRules = {
  'jsx-a11y/alt-text': 'error',
  'jsx-a11y/anchor-has-content': 'error',
  'jsx-a11y/control-has-associated-label': ['error', { labelAttributes: ['aria-label', 'aria-labelledby', 'alt', 'title'] }],
  'jsx-a11y/label-has-associated-control': ['error', { assert: 'either', depth: 3 }],
  'jsx-a11y/anchor-is-valid': ['error', { aspects: ['noHref', 'invalidHref', 'preferButton'] }],
  'jsx-a11y/media-has-caption': 'error',
  'jsx-a11y/aria-role': 'error',
  'jsx-a11y/role-has-required-aria-props': 'error',
  'jsx-a11y/role-supports-aria-props': 'error',
  'jsx-a11y/no-autofocus': ['error', { ignoreNonDOM: true }],
  'jsx-a11y/tabindex-no-positive': 'error',
  'jsx-a11y/interactive-supports-focus': 'error',
  'jsx-a11y/no-redundant-roles': 'error',
  'jsx-a11y/heading-has-content': 'error',
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
    rules: {
      ...commonRules,
      ...a11yRules,
    },
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
    files: [
      'src/features/products/**/*.{js,jsx,ts,tsx}',
      'src/features/kangur/**/*.{js,jsx,ts,tsx}',
      'src/features/integrations/**/*.{js,jsx,ts,tsx}',
      'src/app/(admin)/admin/integrations/**/*.{js,jsx,ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [...commonRestrictedImportPaths, integrationsPublicRestriction],
          patterns: commonRestrictedImportPatterns,
        },
      ],
    },
  },

  {
    files: ['*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
    },
  },
]);
