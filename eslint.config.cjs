const nextPlugin = require('@next/eslint-plugin-next');
const eslintrc = require('@eslint/eslintrc');
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');

const includeTestsFromEnv = process.env.ESLINT_INCLUDE_TESTS === '1';

module.exports = tseslint.config(
  {
    // Global ignores and common configurations
    ignores: [
      'node_modules/',
      '.next/',
      '.next-dev/',
      '.next-dev*/',
      'dist/',
      'public/',
      'build/',
      'temp/',
      'tmp/',
      ...(includeTestsFromEnv
        ? []
        : [
            '__tests__/**/*',
            '**/__tests__/**/*',
            '**/*.test.ts',
            '**/*.test.tsx',
            '**/*.spec.ts',
            '**/*.spec.tsx',
          ]),
      '*.cjs',
      '*.mjs',
      'auto-keep-trying.js',
      'scripts/',
      'prisma/',
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
    ],
  },
  {
    // Configuration for all files
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Common globals for both browser and Node.js environments
        console: 'readonly',
        module: 'readonly',
        require: 'readonly',
        // Next.js specific globals
        process: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      // import: importPlugin,
      '@next/next': nextPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      // Custom rules and overrides
      indent: ['error', 2, { SwitchCase: 1 }],
      'linebreak-style': ['error', 'unix'],
      quotes: ['error', 'single'],
      'jsx-quotes': ['error', 'prefer-single'],
      semi: ['error', 'always'],
      'no-unused-vars': 'off', // Prefer @typescript-eslint/no-unused-vars
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': ['error'],
      'no-dupe-class-members': 'off',
      '@typescript-eslint/no-dupe-class-members': ['error'],
      'no-loss-of-precision': 'off',
      '@typescript-eslint/no-loss-of-precision': ['error'],
      'no-undef': 'off', // Handled by TypeScript and specific globals
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/restrict-plus-operands': 'error',
      // Suppress specific React-related rules for Next.js 13+ App Router
      'react/react-in-jsx-scope': 'off',
      'react/display-name': 'off',
      'react/prop-types': 'off',
      // Next.js specific rules
      '@next/next/no-img-element': 'warn', // Warn instead of error for <img>
      // Allow 'use client' and 'use server' directives
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
    },
    settings: {
      react: {
        version: 'detect',
      },
      // Configure import plugin to resolve tsconfig paths
      /*
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
        node: true,
      },
      */
    },
  },
  {
    // App layer must consume feature public/server entrypoints instead of bare barrels.
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
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
              group: ['use client', 'use server'],
              message: 'Prefer module-level directives over restricted imports.',
            },
          ],
        },
      ],
    },
  },
  {
    // Configuration for client-side files (browser environment)
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    ignores: [
      'src/app/api/**',
      'src/middleware.ts',
      'src/instrumentation.ts',
      'src/**/*.server.ts',
    ],
    languageOptions: {
      globals: {
        ...require('globals').browser,
        // Client-side specific globals
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
        // React and related environment globals
        React: 'readonly',
        performance: 'readonly',
        crypto: 'readonly', // Common in modern browsers
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
    files: ['src/shared/lib/query-factories-v2.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    // Configuration for server-side files (Node.js environment)
    files: [
      'src/app/api/**/*.{ts,tsx,js,jsx}',
      'src/middleware.ts',
      'src/instrumentation.ts',
      'src/**/*.server.{ts,tsx,js,jsx}',
    ],
    languageOptions: {
      globals: {
        ...require('globals').node,
        // Server-side specific globals
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    rules: {
      // Server-side specific rules
      'no-console': 'warn', // Warn about console logs on the server
      /*
            'import/no-restricted-paths': [
              'error',
              {
                'zones': [
                  { target: './src/shared', from: './src/features' }, // Shared should not import from features
                  // Add more server-side specific restrictions if needed
                ],
              },
            ],
            */
    },
  },
  {
    // Configuration for test files
    files: [
      '**/__tests__/**/*.{js,jsx,ts,tsx}',
      'e2e/**/*.{js,jsx,ts,tsx}',
      '**/*.test.{js,jsx,ts,tsx}',
      '**/*.spec.{js,jsx,ts,tsx}',
    ],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint-tests.json',
      },
      globals: {
        ...require('globals').jest, // Assuming Jest/Vitest for tests
        // Testing specific globals
        vi: 'readonly', // Vitest global
      },
    },
    rules: {
      'no-undef': 'off', // Test files often define globals or use test utilities
      // Enable any-related rules for tests to achieve 100% coverage
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
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
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/shared/lib/api-hooks',
              message:
                'Use explicit v2 factories from "@/shared/lib/query-factories-v2" in feature code.',
            },
            {
              name: '@/shared/lib/mutation-factories',
              message:
                'Use explicit v2 mutation factories from "@/shared/lib/query-factories-v2" in feature code.',
            },
            {
              name: '@/shared/lib/query-factories',
              message:
                'Use explicit v2 factories from "@/shared/lib/query-factories-v2" in feature code.',
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
          ],
          patterns: [
            {
              group: ['use client', 'use server'],
              message: 'Prefer module-level directives over restricted imports.',
            },
          ],
        },
      ],
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
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/app/**/*',
      'src/features/ai/ai-paths/components/ai-paths-settings/AiPathsStateBridger.tsx',
      'src/features/ai/ai-paths/context/hooks/useStateBridge.ts',
      'src/features/ai/ai-paths/context/hooks/index.ts',
      'src/features/ai/ai-paths/context/index.ts',
      'src/features/ai/ai-paths/components/ai-paths-settings/useAiPathsPersistence.ts',
      'src/features/products/hooks/useAiPathSettings.ts',
      'src/shared/lib/ai-paths/hooks/useAiPathTriggerEvent.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
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
          ],
          patterns: [
            {
              group: [
                '**/context/hooks/useStateBridge',
                '**/components/ai-paths-settings/AiPathsStateBridger',
              ],
              message:
                'Bridge compatibility modules are deprecated. Use context-native hooks/actions instead.',
            },
          ],
        },
      ],
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
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/shared/lib/api-hooks',
              message:
                'Use explicit v2 factories from "@/shared/lib/query-factories-v2" in feature code.',
            },
            {
              name: '@/shared/lib/mutation-factories',
              message:
                'Use explicit v2 mutation factories from "@/shared/lib/query-factories-v2" in feature code.',
            },
            {
              name: '@/shared/lib/query-factories',
              message:
                'Use explicit v2 factories from "@/shared/lib/query-factories-v2" in feature code.',
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
          ],
          patterns: [
            {
              group: ['use client', 'use server'],
              message: 'Prefer module-level directives over restricted imports.',
            },
            {
              group: [
                '**/context/hooks/useStateBridge',
                '**/components/ai-paths-settings/AiPathsStateBridger',
              ],
              message:
                'Bridge compatibility modules are deprecated. Use context-native hooks/actions instead.',
            },
          ],
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
      // Allow dynamic key composition in query utility helpers.
      'no-restricted-syntax': 'off',
    },
  },
  {
    // General rules for .cjs files (like this config file)
    files: ['*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
    },
  }
);
