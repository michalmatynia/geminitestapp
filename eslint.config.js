import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import importPlugin from "eslint-plugin-import";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const configFiles = [
  "eslint.config.js",
  "jest.config.cjs",
  "next.config.mjs",
  "postcss.config.mjs",
  "prisma/seed.js",
  "server.cjs",
];

const disableTypeCheckedForConfigFiles = compat
  .extends("plugin:@typescript-eslint/disable-type-checked")
  .map((config) => ({
    ...config,
    files: configFiles,
  }));

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    ignores: ["lib/generated/prisma/**", "scripts/backfill-note-colors.mjs"],
  },
  ...compat.extends(
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ),
  {
    languageOptions: {
      parser: (await import("@typescript-eslint/parser")).default,
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      "no-undef": "off",
      "tailwindcss/no-custom-classname": "off",
      "react/no-unknown-property": "error",
      "react/display-name": "error",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      // Added to disable specific TypeScript rules
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      // "@typescript-eslint/no-unused-vars": [
      //   "error",
      //   {
      //     "argsIgnorePattern": "^_",
      //     "varsIgnorePattern": "^_",
      //     "caughtErrorsIgnorePattern": "^_",
      //     "ignoreRestSiblings": true
      //   }
      // ],
      // "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-misused-promises": "off",
      "import/order": "off",
    },
    settings: {
      react: {
        version: "detect",
      },
      "import/resolver": {
        typescript: true,
        node: true,
      },
    },
  },
  {
    files: ["lib/generated/prisma/**/*.ts", "lib/generated/prisma/**/*.js"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unnecessary-type-constraint": "off",
      "@typescript-eslint/no-wrapper-object-types": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
    },
  },
  ...disableTypeCheckedForConfigFiles,
  {
    files: configFiles,
    languageOptions: {
      parserOptions: {
        project: null,
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
