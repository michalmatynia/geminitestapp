import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();

const DEFAULT_ENVIRONMENT = 'local';
const OUTPUT_DIR = path.join('docs', 'migrations', 'reports');
const DEFAULT_TIMEOUT_MS = 2 * 60_000;

const WAVE1_COMMANDS = [
  {
    id: 'products-normalize-v2',
    label: 'Products canonical shape normalization',
    command: 'npm run products:normalize:v2',
    expectedMode: 'dry-run',
  },
  {
    id: 'ai-paths-config-contract-v2',
    label: 'AI Paths config contract migration',
    command: 'npm run migrate:ai-paths:config-contract:v2',
    expectedMode: 'dry-run',
  },
  {
    id: 'base-import-parameter-link-map-v2',
    label: 'Base import parameter link-map migration',
    command: 'npm run migrate:base-import-parameter-link-map:v2',
    expectedMode: 'dry-run',
  },
  {
    id: 'base-export-warehouse-preferences-v2',
    label: 'Base export warehouse preferences migration',
    command: 'npm run migrate:base-export-warehouse-preferences:v2',
    expectedMode: 'dry-run',
  },
  {
    id: 'base-connection-token-storage-v2',
    label: 'Base connection token storage migration',
    command: 'npm run migrate:base-connection-token-storage:v2',
    expectedMode: 'dry-run',
  },
  {
    id: 'base-token-encryption-v2',
    label: 'Base token encryption migration',
    command: 'npm run migrate:base-token-encryption:v2',
    expectedMode: 'dry-run',
  },
  {
    id: 'tradera-api-credential-storage-v2',
    label: 'Tradera API credential storage migration',
    command: 'npm run migrate:tradera-api-credential-storage:v2',
    expectedMode: 'dry-run',
  },
  {
    id: 'tradera-api-user-id-storage-v2',
    label: 'Tradera API user-id storage migration',
    command: 'npm run migrate:tradera-api-user-id-storage:v2',
    expectedMode: 'dry-run',
  },
  {
    id: 'case-resolver-workspace-detached-contract-v2',
    label: 'Case Resolver detached workspace contract migration',
    command: 'npm run migrate:case-resolver:workspace-detached-contract:v2',
    expectedMode: 'dry-run',
  },
  {
    id: 'cms-page-builder-template-settings-v2',
    label: 'CMS page-builder template settings migration',
    command: 'npm run migrate:cms:page-builder-template-settings:v2',
    expectedMode: 'dry-run',
  },
];

const parseArgs = (argv) => {
  const options = {
    environment: DEFAULT_ENVIRONMENT,
    run: false,
    write: false,
    output: null,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };

  argv.forEach((arg) => {
    if (arg === '--run') {
      options.run = true;
      return;
    }
    if (arg === '--write' || arg === '--apply') {
      options.run = true;
      options.write = true;
      return;
    }
    if (arg.startsWith('--env=')) {
      const raw = arg.slice('--env='.length).trim();
      if (raw.length > 0) options.environment = raw;
      return;
    }
    if (arg.startsWith('--output=')) {
      const raw = arg.slice('--output='.length).trim();
      if (raw.length > 0) options.output = raw;
      return;
    }
    if (arg.startsWith('--timeout-ms=')) {
      const raw = Number.parseInt(arg.slice('--timeout-ms='.length), 10);
      if (Number.isFinite(raw) && raw > 0) options.timeoutMs = raw;
    }
  });

  return options;
};

const sanitizeEnvironment = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-');

const truncateText = (value, maxLength = 32_000) => {
  if (typeof value !== 'string') return '';
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}\n...[truncated ${value.length - maxLength} chars]`;
};

const extractTrailingJsonObject = (rawText) => {
  const text = rawText.trim();
  if (!text) return null;

  let inString = false;
  let stringQuote = '';
  let escaped = false;
  let depth = 0;
  let startIndex = -1;
  let lastParsed = null;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === stringQuote) {
        inString = false;
        stringQuote = '';
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      stringQuote = char;
      continue;
    }

    if (char === '{') {
      if (depth === 0) startIndex = index;
      depth += 1;
      continue;
    }

    if (char === '}') {
      if (depth === 0) continue;
      depth -= 1;
      if (depth === 0 && startIndex >= 0) {
        const candidate = text.slice(startIndex, index + 1);
        try {
          lastParsed = JSON.parse(candidate);
        } catch {
          // ignore parse failures for non-JSON brace blocks
        }
        startIndex = -1;
      }
    }
  }

  return lastParsed;
};

const ensureOutputDir = (absoluteOutputPath) => {
  const dir = path.dirname(absoluteOutputPath);
  fs.mkdirSync(dir, { recursive: true });
};

const computeAggregate = (commands) => {
  const aggregate = {
    total: commands.length,
    pending: 0,
    success: 0,
    failed: 0,
    skipped: 0,
  };

  commands.forEach((command) => {
    if (command.status === 'pending') aggregate.pending += 1;
    if (command.status === 'success') aggregate.success += 1;
    if (command.status === 'failed') aggregate.failed += 1;
    if (command.status === 'skipped') aggregate.skipped += 1;
  });

  return aggregate;
};

const buildPendingCommandEntry = (definition) => ({
  id: definition.id,
  label: definition.label,
  command: definition.command,
  baseCommand: definition.command,
  expectedMode: definition.expectedMode,
  status: 'pending',
  exitCode: null,
  timedOut: null,
  startedAt: null,
  finishedAt: null,
  durationMs: null,
  parsedSummary: null,
  stdout: null,
  stderr: null,
});

const runCommand = (definition, timeoutMs, writeMode) => {
  const executableCommand = writeMode ? `${definition.command} -- --write` : definition.command;
  const startedAt = new Date();
  const result = spawnSync(executableCommand, {
    cwd: ROOT,
    shell: true,
    encoding: 'utf8',
    timeout: timeoutMs,
    env: process.env,
    maxBuffer: 32 * 1024 * 1024,
  });
  const finishedAt = new Date();

  const stdout = truncateText(result.stdout ?? '');
  const errorMessage = result.error
    ? `\n[runner-error] ${result.error.name}: ${result.error.message}\n`
    : '';
  const stderr = truncateText(`${result.stderr ?? ''}${errorMessage}`);
  const parsedSummary = extractTrailingJsonObject(stdout);
  const exitCode = result.status === null ? (result.error ? 1 : 0) : result.status;

  const timedOut = Boolean(result.error && result.error.message.includes('ETIMEDOUT'));

  return {
    id: definition.id,
    label: definition.label,
    command: executableCommand,
    baseCommand: definition.command,
    expectedMode: writeMode ? 'write' : definition.expectedMode,
    status: exitCode === 0 ? 'success' : 'failed',
    exitCode,
    timedOut,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    parsedSummary,
    stdout,
    stderr,
  };
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));
  const environment = sanitizeEnvironment(options.environment || DEFAULT_ENVIRONMENT);
  const defaultOutput = path.join(
    OUTPUT_DIR,
    options.write ? `wave1-write-${environment}.json` : `wave1-dry-run-${environment}.json`
  );
  const outputPath = options.output ? options.output : defaultOutput;
  const absoluteOutputPath = path.resolve(ROOT, outputPath);

  const commands = options.run
    ? WAVE1_COMMANDS.map((definition) => runCommand(definition, options.timeoutMs, options.write))
    : WAVE1_COMMANDS.map((definition) => ({
        ...buildPendingCommandEntry(definition),
        expectedMode: options.write ? 'write' : definition.expectedMode,
      }));

  const report = {
    schemaVersion: 1,
    wave: 'wave1-data-canonicalization-verification',
    reportMode: options.run
      ? options.write
        ? 'write-executed'
        : 'dry-run-executed'
      : options.write
        ? 'write-template'
        : 'template',
    environment,
    generatedAt: new Date().toISOString(),
    commandTimeoutMs: options.timeoutMs,
    aggregate: computeAggregate(commands),
    commands,
  };

  ensureOutputDir(absoluteOutputPath);
  fs.writeFileSync(absoluteOutputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log('[wave1:verify] report written');
  console.log(JSON.stringify({ output: outputPath, ...report.aggregate }, null, 2));

  if (options.run && report.aggregate.failed > 0) {
    process.exitCode = 1;
  }
};

main();
