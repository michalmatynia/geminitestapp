import { readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import importPlugin from "eslint-plugin-import";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const featureNames = readdirSync(join(__dirname, "src", "features"), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const sharedUiRestrictions = [
  {
    group: ["@/shared/ui/**", "@/shared/components/**"],
    message: "Import shared UI from '@/shared/ui'.",
  },
];

const sharedUiPathRestrictions = [
  {
    name: "@/shared/components",
    message: "Import shared UI from '@/shared/ui'.",
  },
];

const buildRestrictedImportsRule = (extraPatterns = [], extraPaths = []) => [
  "error",
  {
    paths: [...sharedUiPathRestrictions, ...extraPaths],
    patterns: [...sharedUiRestrictions, ...extraPatterns],
  },
];

const featureBaseRestrictions = [
  {
    group: ["@/app/**"],
    message: "Features must not import from app.",
  },
];

const layerBoundaryConfigs = [
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-restricted-imports": buildRestrictedImportsRule(),
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./src/shared",
              from: "./src/features",
              message: "Shared layer must not import from features.",
            },
            {
              target: "./src/shared",
              from: "./src/app",
              message: "Shared layer must not import from app.",
            },
            {
              target: "./src/features",
              from: "./src/app",
              message: "Features must not import from app.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/app/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-restricted-imports": buildRestrictedImportsRule([
        {
          group: [
            "@/features/*/!(server)",
            "@/features/*/!(server)/**",
            "@/features/*/server/**",
          ],
          message:
            "Import feature public APIs only (use '@/features/<name>' or '@/features/<name>/server').",
        },
      ]),
    },
  },
  {
    files: ["src/shared/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-restricted-imports": buildRestrictedImportsRule([
        {
          group: ["@/features/**"],
          message: "Shared layer must not import from features.",
        },
        {
          group: ["@/app/**"],
          message: "Shared layer must not import from app.",
        },
      ]),
    },
  },
  ...featureNames.map((feature) => ({
    files: [`src/features/${feature}/**/*.{ts,tsx,js,jsx}`],
    rules: {
      "no-restricted-imports": buildRestrictedImportsRule([
        ...featureBaseRestrictions,
        {
          group: [
            `@/features/!(${feature})/!(server)`,
            `@/features/!(${feature})/!(server)/**`,
            `@/features/!(${feature})/server/**`,
          ],
          message:
            "Import other features via their public API (use '@/features/<name>' or '@/features/<name>/server').",
        },
      ]),
    },
  })),
];

const configFiles = [
  "eslint.config.js",
  "vitest.config.ts",
  "vitest.setup.ts",
  "next.config.mjs",
  "postcss.config.mjs",
  "prisma/seed.js",
  "server.cjs",
  "scripts/check-catalog.mjs",
  "scripts/check-db-tables.mjs",
  "scripts/check-job.mjs",
  "scripts/debug-db.cjs",
  "scripts/debug-product.mjs",
  "scripts/cleanup-base-export-templates.mjs",
  "scripts/backfill-note-colors.mjs",
];

const disableTypeCheckedForConfigFiles = compat
  .extends("plugin:@typescript-eslint/disable-type-checked")
  .map((config) => ({
    ...config,
    files: configFiles,
  }));

const nextRouteConfig = {
  files: [
    "src/app/**/page.{ts,tsx,js,jsx}",
    "src/app/**/layout.{ts,tsx,js,jsx}",
    "src/app/**/route.{ts,tsx,js,jsx}",
    "src/app/**/loading.{ts,tsx,js,jsx}",
    "src/app/**/error.{ts,tsx,js,jsx}",
    "src/app/**/not-found.{ts,tsx,js,jsx}",
    "src/app/**/template.{ts,tsx,js,jsx}",
    "src/app/**/default.{ts,tsx,js,jsx}",
  ],
  rules: {
    "no-restricted-syntax": [
      "warn",
      {
        selector:
          "ExportNamedDeclaration[source] > ExportSpecifier[exported.name='runtime']",
        message:
          "Next.js Route Segment Config 'runtime' must be a static string literal. Do not re-export it.",
      },
      {
        selector:
          "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name='runtime'][init.type!='Literal']",
        message:
          "Next.js Route Segment Config 'runtime' must be a static string literal.",
      },
    ],
  },
};

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
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_",
          "ignoreRestSiblings": true
        }
      ],
      "@typescript-eslint/no-explicit-any": "error",
      // "@typescript-eslint/no-misused-promises": "off",
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
  ...layerBoundaryConfigs,
  nextRouteConfig,
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
