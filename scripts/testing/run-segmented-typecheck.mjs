import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const tempDir = path.join(repoRoot, 'tmp', 'typecheck-segments');
const segmentedNextEnvPath = path.join(tempDir, 'next-env.segment.d.ts');
const tscBin = path.join(
  repoRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tsc.cmd' : 'tsc'
);

const CONFIG_RELATIVE_PREFIX = '../../';
const COMMON_INCLUDE_PATTERNS = [
  'types/**/*.d.ts',
  'src/global.d.ts',
  'src/shared/contracts/ambient.d.ts',
];

const COMMON_EXCLUDE_PATTERNS = [
  'node_modules',
  'apps',
  'packages',
  '.next',
  '.next-dev',
  '.next-dev-*',
  'bazel-*',
  'bazel-bin',
  'bazel-out',
  'bazel-testlogs',
  'tmp',
  '**/__tests__/**',
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.test.js',
  '**/*.test.jsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
  '**/*.spec.js',
  '**/*.spec.jsx',
];

const SEGMENTS = [
  {
    id: 'shared',
    include: ['src/shared/**/*.ts', 'src/shared/**/*.tsx', 'src/shared/**/*.js', 'src/shared/**/*.jsx'],
  },
  {
    id: 'kangur',
    include: [
      'src/features/kangur/**/*.ts',
      'src/features/kangur/**/*.tsx',
      'src/features/kangur/**/*.js',
      'src/features/kangur/**/*.jsx',
    ],
  },
  {
    id: 'ai',
    include: [
      'src/features/ai/**/*.ts',
      'src/features/ai/**/*.tsx',
      'src/features/ai/**/*.js',
      'src/features/ai/**/*.jsx',
      'src/features/prompt-engine/**/*.ts',
      'src/features/prompt-engine/**/*.tsx',
      'src/features/prompt-engine/**/*.js',
      'src/features/prompt-engine/**/*.jsx',
      'src/features/prompt-exploder/**/*.ts',
      'src/features/prompt-exploder/**/*.tsx',
      'src/features/prompt-exploder/**/*.js',
      'src/features/prompt-exploder/**/*.jsx',
      'src/features/playwright/**/*.ts',
      'src/features/playwright/**/*.tsx',
      'src/features/playwright/**/*.js',
      'src/features/playwright/**/*.jsx',
    ],
  },
  {
    id: 'commerce',
    include: [
      'src/features/products/**/*.ts',
      'src/features/products/**/*.tsx',
      'src/features/products/**/*.js',
      'src/features/products/**/*.jsx',
      'src/features/integrations/**/*.ts',
      'src/features/integrations/**/*.tsx',
      'src/features/integrations/**/*.js',
      'src/features/integrations/**/*.jsx',
      'src/features/cms/**/*.ts',
      'src/features/cms/**/*.tsx',
      'src/features/cms/**/*.js',
      'src/features/cms/**/*.jsx',
      'src/features/case-resolver/**/*.ts',
      'src/features/case-resolver/**/*.tsx',
      'src/features/case-resolver/**/*.js',
      'src/features/case-resolver/**/*.jsx',
      'src/features/filemaker/**/*.ts',
      'src/features/filemaker/**/*.tsx',
      'src/features/filemaker/**/*.js',
      'src/features/filemaker/**/*.jsx',
      'src/features/auth/**/*.ts',
      'src/features/auth/**/*.tsx',
      'src/features/auth/**/*.js',
      'src/features/auth/**/*.jsx',
      'src/features/admin/**/*.ts',
      'src/features/admin/**/*.tsx',
      'src/features/admin/**/*.js',
      'src/features/admin/**/*.jsx',
      'src/features/observability/**/*.ts',
      'src/features/observability/**/*.tsx',
      'src/features/observability/**/*.js',
      'src/features/observability/**/*.jsx',
      'src/features/database/**/*.ts',
      'src/features/database/**/*.tsx',
      'src/features/database/**/*.js',
      'src/features/database/**/*.jsx',
      'src/features/data-import-export/**/*.ts',
      'src/features/data-import-export/**/*.tsx',
      'src/features/data-import-export/**/*.js',
      'src/features/data-import-export/**/*.jsx',
      'src/features/files/**/*.ts',
      'src/features/files/**/*.tsx',
      'src/features/files/**/*.js',
      'src/features/files/**/*.jsx',
      'src/features/foldertree/**/*.ts',
      'src/features/foldertree/**/*.tsx',
      'src/features/foldertree/**/*.js',
      'src/features/foldertree/**/*.jsx',
      'src/features/internationalization/**/*.ts',
      'src/features/internationalization/**/*.tsx',
      'src/features/internationalization/**/*.js',
      'src/features/internationalization/**/*.jsx',
      'src/features/notesapp/**/*.ts',
      'src/features/notesapp/**/*.tsx',
      'src/features/notesapp/**/*.js',
      'src/features/notesapp/**/*.jsx',
      'src/features/viewer3d/**/*.ts',
      'src/features/viewer3d/**/*.tsx',
      'src/features/viewer3d/**/*.js',
      'src/features/viewer3d/**/*.jsx',
      'src/features/document-editor/**/*.ts',
      'src/features/document-editor/**/*.tsx',
      'src/features/document-editor/**/*.js',
      'src/features/document-editor/**/*.jsx',
      'src/features/drafter/**/*.ts',
      'src/features/drafter/**/*.tsx',
      'src/features/drafter/**/*.js',
      'src/features/drafter/**/*.jsx',
      'src/features/product-sync/**/*.ts',
      'src/features/product-sync/**/*.tsx',
      'src/features/product-sync/**/*.js',
      'src/features/product-sync/**/*.jsx',
      'src/features/tooltip-engine/**/*.ts',
      'src/features/tooltip-engine/**/*.tsx',
      'src/features/tooltip-engine/**/*.js',
      'src/features/tooltip-engine/**/*.jsx',
      'src/features/app-embeds/**/*.ts',
      'src/features/app-embeds/**/*.tsx',
      'src/features/app-embeds/**/*.js',
      'src/features/app-embeds/**/*.jsx',
      'src/features/jobs/**/*.ts',
      'src/features/jobs/**/*.tsx',
      'src/features/jobs/**/*.js',
      'src/features/jobs/**/*.jsx',
      'src/features/gsap/**/*.ts',
      'src/features/gsap/**/*.tsx',
      'src/features/gsap/**/*.js',
      'src/features/gsap/**/*.jsx',
    ],
  },
  {
    id: 'app',
    include: [
      'src/app/**/*.ts',
      'src/app/**/*.tsx',
      'src/app/**/*.js',
      'src/app/**/*.jsx',
      'src/server/**/*.ts',
      'src/server/**/*.tsx',
      'src/server/**/*.js',
      'src/server/**/*.jsx',
      'src/i18n/**/*.ts',
      'src/i18n/**/*.tsx',
      'src/i18n/**/*.js',
      'src/i18n/**/*.jsx',
      'src/dev/**/*.ts',
      'src/dev/**/*.tsx',
      'src/dev/**/*.js',
      'src/dev/**/*.jsx',
      'src/mocks/**/*.ts',
      'src/mocks/**/*.tsx',
      'src/mocks/**/*.js',
      'src/mocks/**/*.jsx',
      'src/testing/**/*.ts',
      'src/testing/**/*.tsx',
      'src/testing/**/*.js',
      'src/testing/**/*.jsx',
    ],
  },
  {
    id: 'tooling',
    include: [
      'scripts/**/*.ts',
      'scripts/**/*.tsx',
      'scripts/**/*.js',
      'scripts/**/*.jsx',
      'e2e/**/*.ts',
      'e2e/**/*.tsx',
      'e2e/**/*.js',
      'e2e/**/*.jsx',
      'docs/**/*.ts',
      'docs/**/*.tsx',
      'docs/**/*.js',
      'docs/**/*.jsx',
      'vitest.config.ts',
      'vitest.setup.ts',
      'vitest.setup.mongo.ts',
      'vitest.setup.mongo-mock.ts',
      'playwright.config.ts',
      'tailwind.config.ts',
      'auto-keep-trying.js',
      '.next.cache.config.js',
    ],
  },
];

const toConfigPattern = (pattern) => `${CONFIG_RELATIVE_PREFIX}${pattern}`;

const parseArgs = (argv) => {
  const forwarded = [];
  const requestedSegments = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--segment') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value after --segment');
      }
      requestedSegments.push(value);
      index += 1;
      continue;
    }
    if (arg.startsWith('--segment=')) {
      requestedSegments.push(arg.slice('--segment='.length));
      continue;
    }
    forwarded.push(arg);
  }

  return { forwarded, requestedSegments };
};

const buildSegmentConfig = (segment) => ({
  extends: '../../tsconfig.json',
  compilerOptions: {
    noEmit: true,
    incremental: false,
  },
  include: [
    './next-env.segment.d.ts',
    ...COMMON_INCLUDE_PATTERNS.map(toConfigPattern),
    ...segment.include.map(toConfigPattern),
  ],
  exclude: COMMON_EXCLUDE_PATTERNS.map(toConfigPattern),
});

const ensureSegmentExists = (segmentId) => {
  if (!SEGMENTS.some((segment) => segment.id === segmentId)) {
    const known = SEGMENTS.map((segment) => segment.id).join(', ');
    throw new Error(`Unknown typecheck segment "${segmentId}". Known segments: ${known}`);
  }
};

const run = () => {
  const { forwarded, requestedSegments } = parseArgs(process.argv.slice(2));
  requestedSegments.forEach(ensureSegmentExists);

  const selectedSegments =
    requestedSegments.length > 0
      ? SEGMENTS.filter((segment) => requestedSegments.includes(segment.id))
      : SEGMENTS;

  mkdirSync(tempDir, { recursive: true });
  writeFileSync(
    segmentedNextEnvPath,
    '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n'
  );

  for (const segment of selectedSegments) {
    const configPath = path.join(tempDir, `${segment.id}.json`);
    writeFileSync(configPath, `${JSON.stringify(buildSegmentConfig(segment), null, 2)}\n`);

    console.log(`[typecheck] ${segment.id}`);
    const result = spawnSync(
      tscBin,
      ['-p', configPath, '--noEmit', '--incremental', 'false', ...forwarded],
      {
        cwd: repoRoot,
        stdio: 'inherit',
      }
    );

    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }

  console.log(`[typecheck] ${selectedSegments.length} segment(s) passed`);
};

try {
  run();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[typecheck] ${message}`);
  process.exit(1);
}
