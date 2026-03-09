#!/usr/bin/env bash
set -euo pipefail

echo "==> Removing old ESLint flat config files that can conflict"
rm -f eslint.config.cjs
rm -f .eslintignore

echo "==> Writing eslint.config.mjs"
cat > eslint.config.mjs <<'EOF'
import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import nextVitals from 'eslint-config-next/core-web-vitals';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';

const includeTestsFromEnv = process.env.ESLINT_INCLUDE_TESTS === '1';

const asArray = (value) => (Array.isArray(value) ? value : [value]);

const testFiles = [
  '**/__tests__/**/*.{js,jsx,ts,tsx}',
  'e2e/**/*.{js,jsx,ts,tsx}',
  '**/*.test.{js,jsx,ts,tsx}',
  '**/*.spec.{js,jsx,ts,tsx}',
];

const typedSourceFiles = ['src/**/*.{ts,tsx}'];
const typedSourceIgnores = [
  '**/__tests__/**',
  '**/*.test.{js,jsx,ts,tsx}',
  '**/*.spec.{js,jsx,ts,tsx}',
  'e2e/**',
];

const noImgAllowedFiles = [
  'src/features/ai/image-studio/components/center-preview/SplitVariantPreview.tsx',
  'src/features/ai/image-studio/components/studio-modals/InlineImagePreviewCanvas.tsx',
  'src/features/ai/image-studio/components/studio-modals/SlotInlineEditCardTab.tsx',
  'src/features/ai/image-studio/components/studio-modals/SlotInlineEditCompositesTab.tsx',
  'src/features/ai/image-studio/components/studio-modals/SlotInlineEditMasksTab.tsx',
  'src/features/ai/image-studio/components/VersionGraphComparePanel.tsx',
  'src/features/ai/image-studio/components/VersionGraphInspector.tsx',
  'src/features/ai/image-studio/components/VersionNodeDetailsModal.tsx',
  'src/features/case-resolver/components/CaseResolverFileViewer.tsx',
  'src/features/case-resolver/components/page/CaseResolverScanFileEditor.tsx',
  'src/features/kangur/ui/components/KangurLessonDocumentRenderer.tsx',
  'src/features/products/components/form/studio/StudioPreviewCanvas.tsx',
  'src/features/products/components/ProductImageSlot.tsx',
  'src/shared/ui/vector-canvas/components/CanvasImageLayer.tsx',
];

const baseRestrictedImportPaths = [
  {
    name: '@base44/sdk',
    message:
      'Base44 vendor SDK is not allowed in canonical app code. Use the Kangur platform ports/adapters.',
  },
  {
    name: '@base44/sdk/dist/utils/axios-client',
    message:
      'Base44 vendor SDK is not allowed in canonical app code. Use the Kangur platform ports/adapters.',
  },
];

const baseRestrictedImportPatterns = [
  {
    group: ['use client', 'use server'],
    message: 'Prefer module-level directives over restricted imports.',
  },
  {
    group: ['@base44/*'],
    message:
      'Base44 vendor SDK is not allowed in canonical app code. Use the Kangur platform ports/adapters.',
  },
];

const queryFactoryRestrictedPaths = [
  {
    name: '@/shared/lib/api-hooks',
    message: 'Use explicit v2 factories from "@/shared/lib/query-factories-v2".',
  },
  {
    name: '@/shared/lib/mutation-factories',
    message: 'Use explicit v2 mutation factories from "@/shared/lib/query-factories-v2".',
  },
  {
    name: '@/shared/lib/query-factories',
    message: 'Use explicit v2 factories from "@/shared/lib/query-factories-v2".',
  },
  {
    name: '@/shared/lib/tanstack-factory-meta-inference',
    message: 'Define explicit v2 `meta` at call sites instead of using legacy inference.',
  },
  {
    name: '@/shared/lib/query-factories-v2',
    importNames: [
      'createListQuery',
      'createSingleQuery',
      'createMutation',
      'createCreateMutation',
      'createUpdateMutation',
      'createDeleteMutation',
    ],
    message: 'Use explicit V2 factory exports (e.g. createListQueryV2/createMutationV2).',
  },
];

const aiPathsRestrictedPaths = [
  {
    name: '@/features/ai/ai-paths/context',
    importNames: [
      'useStateBridgeSelection',
      'useStateBridgeCanvas',
      'useStateBridgeGraph',
      'useStateBridgeRuntime',
      'useStateBridgePersistence',
      'useStateBridgePresets',
      'useStateBridgeRunHistory',
      'useStateBridgeAll',
    ],
    message:
      'State bridge hooks are legacy compatibility only. Use context-native hooks/actions instead.',
  },
  {
    name: '@/features/ai/ai-paths/context/hooks/useStateBridge',
    message:
      'State bridge hooks are legacy compatibility only. Use context-native hooks/actions instead.',
  },
  {
    name: '@/features/ai/ai-paths/components/ai-paths-settings/AiPathsStateBridger',
    message:
      'AiPathsStateBridger is a temporary compatibility seam. Do not add new runtime imports.',
  },
  {
    name: '@/shared/lib/ai-paths',
    importNames: ['LEGACY_PATH_INDEX_KEY'],
    message:
      'LEGACY_PATH_INDEX_KEY reads are migration-only. Do not introduce new legacy key dependencies.',
  },
  {
    name: '@/shared/lib/ai-paths/core/constants',
    importNames: ['LEGACY_PATH_INDEX_KEY'],
    message:
      'LEGACY_PATH_INDEX_KEY reads are migration-only. Do not introduce new legacy key dependencies.',
  },
];

const aiPathsRestrictedPatterns = [
  {
    group: [
      '**/context/hooks/useStateBridge',
      '**/components/ai-paths-settings/AiPathsStateBridger',
    ],
    message:
      'Bridge compatibility modules are deprecated. Use context-native hooks/actions instead.',
  },
];

const makeRestrictedImports = ({ extraPaths = [], extraPatterns = [] } = {}) => [
  'error',
  {
    paths: [...baseRestrictedImportPaths, ...extraPaths],
    patterns: [...baseRestrictedImportPatterns, ...extraPatterns],
  },
];

const typedSourceLanguageOptions = {
  parser: tseslint.parser,
  parserOptions: {
    projectService: true,
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

export default defineConfig([
  ...nextVitals,

  globalIgnores([
    '.next/**',
    '.next-dev/**',
    '.next-dev*/**',
    '.next-codex-build/**',
    'out/**',
    'build/**',
    'dist/**',
    'coverage/**',
    'node_modules/**',
    'public/**',
    'temp/**',
    'tmp/**',
    'scripts/**',
    'prisma/**',
    'externalkangur/**',
    'next-env.d.ts',
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
    ...(includeTestsFromEnv
      ? []
      : [
          '**/__tests__/**',
          '**/*.test.{js,jsx,ts,tsx}',
          '**/*.spec.{js,jsx,ts,tsx}',
          'e2e/**',
        ]),
  ]),

  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },

  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    plugins: {
      'jsx-a11y': jsxA11yPlugin,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...jsxA11yPlugin.configs.recommended.rules,

      curly: ['error', 'all'],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-alert': 'error',
      'no-debugger': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'object-shorthand': ['error', 'always'],
      'prefer-template': 'error',
      'no-else-return': ['error', { allowElseIf: false }],
      'no-nested-ternary': 'error',
      'no-useless-return': 'error',

      quotes: ['error', 'single', { avoidEscape: true }],
      'jsx-quotes': ['error', 'prefer-single'],
      semi: ['error', 'always'],

      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-shadow': 'off',
      'no-redeclare': 'off',
      'no-dupe-class-members': 'off',
      'no-loss-of-precision': 'off',

      'react/react-in-jsx-scope': 'off',
      'react/display-name': 'off',
      'react/prop-types': 'off',
      'react/jsx-boolean-value': ['error', 'never'],
      'react/self-closing-comp': 'error',

      'react-hooks/exhaustive-deps': 'error',

      '@next/next/no-img-element': 'error',

      'no-restricted-imports': makeRestrictedImports(),
    },
  },

  ...asArray(tseslint.configs.strictTypeChecked).map((config) => ({
    ...config,
    files: typedSourceFiles,
    ignores: typedSourceIgnores,
    languageOptions: {
      ...config.languageOptions,
      ...typedSourceLanguageOptions,
      parserOptions: {
        ...(config.languageOptions?.parserOptions ?? {}),
        ...typedSourceLanguageOptions.parserOptions,
      },
    },
  })),

  ...asArray(tseslint.configs.stylisticTypeChecked).map((config) => ({
    ...config,
    files: typedSourceFiles,
    ignores: typedSourceIgnores,
    languageOptions: {
      ...config.languageOptions,
      ...typedSourceLanguageOptions,
      parserOptions: {
        ...(config.languageOptions?.parserOptions ?? {}),
        ...typedSourceLanguageOptions.parserOptions,
      },
    },
  })),

  {
    files: typedSourceFiles,
    ignores: typedSourceIgnores,
    languageOptions: typedSourceLanguageOptions,
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',

      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'error',

      'no-dupe-class-members': 'off',
      '@typescript-eslint/no-dupe-class-members': 'error',

      'no-loss-of-precision': 'off',
      '@typescript-eslint/no-loss-of-precision': 'error',

      'no-array-constructor': 'off',
      '@typescript-eslint/no-array-constructor': 'error',

      'default-param-last': 'off',
      '@typescript-eslint/default-param-last': 'error',

      'dot-notation': 'off',
      '@typescript-eslint/dot-notation': 'error',

      'no-implied-eval': 'off',
      '@typescript-eslint/no-implied-eval': 'error',

      'require-await': 'off',
      '@typescript-eslint/require-await': 'error',

      'no-throw-literal': 'off',
      '@typescript-eslint/only-throw-error': 'error',

      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-type-assertion': 'error',

      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-confusing-void-expression': [
        'error',
        { ignoreArrowShorthand: true },
      ],
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unnecessary-type-arguments': 'error',
      '@typescript-eslint/no-unnecessary-type-conversion': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/restrict-plus-operands': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/method-signature-style': ['error', 'property'],
      '@typescript-eslint/unified-signatures': 'error',

      'no-restricted-imports': makeRestrictedImports({
        extraPaths: queryFactoryRestrictedPaths,
      }),
    },
  },

  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    ignores: [
      'src/app/api/**',
      'src/middleware.ts',
      'src/instrumentation.ts',
      'src/**/*.server.ts',
      'src/**/*.server.tsx',
      'src/**/*.server.js',
      'src/**/*.server.jsx',
    ],
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
    rules: {
      'no-console': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='fetchQuery']",
          message:
            'Use telemetrized manual query helpers from "@/shared/lib/query-factories-v2" instead of raw .fetchQuery(...).',
        },
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='prefetchQuery']",
          message:
            'Use telemetrized manual query helpers from "@/shared/lib/query-factories-v2" instead of raw .prefetchQuery(...).',
        },
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='ensureQueryData']",
          message:
            'Use telemetrized manual query helpers from "@/shared/lib/query-factories-v2" instead of raw .ensureQueryData(...).',
        },
      ],
    },
  },

  {
    files: [
      'src/app/api/**/*.{ts,tsx,js,jsx}',
      'src/middleware.ts',
      'src/instrumentation.ts',
      'src/**/*.server.{ts,tsx,js,jsx}',
    ],
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

  ...asArray(tseslint.configs.strictTypeChecked).map((config) => ({
    ...config,
    files: testFiles,
    languageOptions: {
      ...config.languageOptions,
      ...typedTestLanguageOptions,
      globals: {
        ...(config.languageOptions?.globals ?? {}),
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        vi: 'readonly',
      },
      parserOptions: {
        ...(config.languageOptions?.parserOptions ?? {}),
        ...typedTestLanguageOptions.parserOptions,
      },
    },
  })),

  ...asArray(tseslint.configs.stylisticTypeChecked).map((config) => ({
    ...config,
    files: testFiles,
    languageOptions: {
      ...config.languageOptions,
      ...typedTestLanguageOptions,
      globals: {
        ...(config.languageOptions?.globals ?? {}),
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        vi: 'readonly',
      },
      parserOptions: {
        ...(config.languageOptions?.parserOptions ?? {}),
        ...typedTestLanguageOptions.parserOptions,
      },
    },
  })),

  {
    files: testFiles,
    languageOptions: {
      ...typedTestLanguageOptions,
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        vi: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
      'no-console': 'off',

      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
    },
  },

  {
    files: noImgAllowedFiles,
    rules: {
      '@next/next/no-img-element': 'off',
    },
  },

  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': makeRestrictedImports({
        extraPatterns: [
          {
            group: [
              '@/features/*',
              '!@/features/*/public',
              '!@/features/*/server',
              '!@/features/*/server/*',
            ],
            message:
              'Import features through "@/features/<feature>/public" (UI) or server entrypoints.',
          },
          {
            group: [
              '@/features/kangur/legacy/components/ui/*',
              '@/features/kangur/legacy/components/dashboard/*',
              '@/features/kangur/legacy/components/progress/*',
              '@/features/kangur/legacy/components/game/*',
              '@/features/kangur/legacy/components/game/mathQuestions',
              '@/features/kangur/legacy/components/kangur/kangurQuestions',
              '@/features/kangur/legacy/components/kangur/KangurSetup',
              '@/features/kangur/legacy/components/UserNotRegisteredError',
              '@/features/kangur/legacy/lib/utils',
              '@/features/kangur/legacy/lib/*',
              '@/features/kangur/legacy/pages/*',
              '@/features/kangur/legacy/utils/*',
            ],
            message:
              'Kangur legacy UI/lib/page/utils paths were pruned. Use canonical feature/shared modules instead.',
          },
        ],
      }),
    },
  },

  {
    files: [
      'src/shared/lib/query-factories-v2.ts',
      'src/shared/lib/tanstack-factory-v2/executors.ts',
    ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },

  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': makeRestrictedImports({
        extraPaths: queryFactoryRestrictedPaths,
      }),
      'no-restricted-syntax': [
        'error',
        {
          selector: "Property[key.name='queryKey'] > ArrayExpression",
          message: 'Use QUERY_KEYS key factories instead of inline query key arrays.',
        },
        {
          selector: "Property[key.name='mutationKey'] > ArrayExpression",
          message: 'Use QUERY_KEYS key factories instead of inline mutation key arrays.',
        },
        {
          selector:
            "JSXOpeningElement[name.name='Tooltip'] > JSXAttribute[name.name='content'][value.type='Literal']",
          message:
            'Hardcoded Tooltip content is not allowed. Source tooltip copy via the documentation + tooltip-engine integration.',
        },
      ],
    },
  },

  {
    files: ['src/shared/hooks/query/**/*.{ts,tsx}', 'src/shared/hooks/useQueryComposition.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Property[key.name='queryKey'] > ArrayExpression",
          message: 'Use QUERY_KEYS key factories instead of inline query key arrays.',
        },
        {
          selector: "Property[key.name='mutationKey'] > ArrayExpression",
          message: 'Use QUERY_KEYS key factories instead of inline mutation key arrays.',
        },
      ],
    },
  },

  {
    files: [
      'src/shared/hooks/useQueryComposition.ts',
      'src/shared/hooks/query/useAdvancedQueries.ts',
      'src/shared/hooks/query/useInfiniteQuery.ts',
    ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },

  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/app/**/*',
      'src/features/ai/ai-paths/components/ai-paths-settings/AiPathsStateBridger.tsx',
      'src/features/ai/ai-paths/context/hooks/useStateBridge.ts',
      'src/features/ai/ai-paths/context/hooks/index.ts',
      'src/features/ai/ai-paths/context/index.ts',
      'src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsPersistence.ts',
      'src/shared/lib/ai-paths/hooks/useAiPathTriggerEvent.ts',
    ],
    rules: {
      'no-restricted-imports': makeRestrictedImports({
        extraPaths: aiPathsRestrictedPaths,
        extraPatterns: aiPathsRestrictedPatterns,
      }),
    },
  },

  {
    files: ['src/features/ai/ai-paths/**/*.{ts,tsx}'],
    ignores: [
      'src/features/ai/ai-paths/components/ai-paths-settings/AiPathsStateBridger.tsx',
      'src/features/ai/ai-paths/context/index.ts',
      'src/features/ai/ai-paths/context/hooks/index.ts',
      'src/features/ai/ai-paths/context/hooks/useStateBridge.ts',
    ],
    rules: {
      'no-restricted-imports': makeRestrictedImports({
        extraPaths: [...queryFactoryRestrictedPaths, ...aiPathsRestrictedPaths],
        extraPatterns: aiPathsRestrictedPatterns,
      }),
    },
  },

  {
    files: ['src/features/kangur/ui/pages/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/features/kangur/legacy/components/*',
                '@/features/kangur/legacy/utils/*',
              ],
              message:
                'Kangur UI pages should depend on canonical ui/components and ui/services modules.',
            },
          ],
        },
      ],
    },
  },
]);
EOF

echo "==> Patching package.json scripts"
node <<'NODE'
const fs = require('fs');
const path = require('path');

const pkgPath = path.resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.scripts ||= {};

pkg.scripts.lint = 'eslint src --no-error-on-unmatched-pattern';
pkg.scripts['lint:fix'] = 'eslint src --fix --no-error-on-unmatched-pattern';
pkg.scripts['lint:tests'] = 'ESLINT_INCLUDE_TESTS=1 eslint src e2e --no-error-on-unmatched-pattern';
pkg.scripts['lint:fix:tests'] = 'ESLINT_INCLUDE_TESTS=1 eslint src e2e --fix --no-error-on-unmatched-pattern';
pkg.scripts['lint:config:check'] = 'eslint --print-config src/app/api/agent/resources/route.ts > /dev/null';

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
NODE

echo "==> Done"
echo "Run:"
echo "  npm run lint:config:check"
echo "  npm run lint:fix"
echo "  npm run lint:fix:tests"
