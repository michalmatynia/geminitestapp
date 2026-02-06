const nextPlugin = require('@next/eslint-plugin-next');
const eslintrc = require('@eslint/eslintrc');
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const importPlugin = require('eslint-plugin-import');

module.exports = tseslint.config(
  {
    // Global ignores and common configurations
    ignores: ['node_modules/', '.next/', 'dist/', 'public/', 'build/', 'temp/', 'tmp/'],
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
      import: importPlugin,
      '@next/next': nextPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      // Custom rules and overrides
      'indent': ['error', 2, { 'SwitchCase': 1 }],
      'linebreak-style': ['error', 'unix'],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'no-unused-vars': 'off', // Prefer @typescript-eslint/no-unused-vars
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'off', // Handled by TypeScript and specific globals
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      // Suppress specific React-related rules for Next.js 13+ App Router
      'react/react-in-jsx-scope': 'off',
      'react/display-name': 'off',
      'react/prop-types': 'off',
      // Next.js specific rules
      '@next/next/no-img-element': 'warn', // Warn instead of error for <img>
      // Import plugin rules
      'import/order': [
        'error',
        {
          'groups': ['builtin', 'external', 'internal', ['parent', 'sibling', 'index'], 'object', 'type'],
          'pathGroups': [
            {
              'pattern': '@/**',
              'group': 'internal',
            },
          ],
          'newlines-between': 'always',
          'alphabetize': {
            'order': 'asc',
            'caseInsensitive': true,
          },
        },
      ],
      'import/no-restricted-paths': [
        'error',
        {
          'zones': [
            { target: './src/shared', from: './src/features' },
            { target: './src/app/api', from: './src/features' },
          ],
        },
      ],
      // Allow 'use client' and 'use server' directives
      "no-restricted-imports": ["error", {
        "patterns": [{
          "group": ["use client", "use server"],
          "message": "Prefer module-level directives over restricted imports."
        }]
      }]
    },
    settings: {
      react: {
        version: 'detect',
      },
      // Configure import plugin to resolve tsconfig paths
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
        node: true,
      },
    },
  },
  {
    // Configuration for client-side files (browser environment)
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    ignores: ['src/app/api/**', 'src/middleware.ts', 'src/instrumentation.ts', 'src/**/*.server.ts'],
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
      // Client-side specific rules
    },
  },
  {
    // Configuration for server-side files (Node.js environment)
    files: ['src/app/api/**', 'src/middleware.ts', 'src/instrumentation.ts', 'src/**/*.server.ts'],
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
      'import/no-restricted-paths': [
        'error',
        {
          'zones': [
            { target: './src/shared', from: './src/features' }, // Shared should not import from features
            // Add more server-side specific restrictions if needed
          ],
        },
      ],
    },
  },
  {
    // Configuration for test files
    files: ['__tests__/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        ...require('globals').jest, // Assuming Jest/Vitest for tests
        // Testing specific globals
        vi: 'readonly', // Vitest global
      },
    },
    rules: {
      'no-undef': 'off', // Test files often define globals or use test utilities
      '@typescript-eslint/no-explicit-any': 'off', // Allow any in tests
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