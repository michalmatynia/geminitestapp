import os from 'node:os';
import { spawn } from 'node:child_process';
import fsPromises from 'node:fs/promises';
import path from 'node:path';

import { parseCommonCheckArgs, writeSummaryJson } from '../lib/check-cli.mjs';
import {
  acquireRuntimeLease,
  buildBrokeredPlaywrightEnv,
  cleanupBrokerRuntimeLeases,
  resolveNpxExecutable,
  resolvePlaywrightRunArtifacts,
  resolveRuntimeAgentId,
} from './lib/runtime-broker.mjs';

const root = process.cwd();
const PLAYWRIGHT_COMMANDS = new Set([
  'test',
  'show-report',
  'merge-reports',
  'install',
  'uninstall',
  'codegen',
  'open',
  'screenshot',
  'pdf',
]);
const MAX_CAPTURE_OUTPUT_BYTES = 160_000;
const SHARED_WRAPPER_FLAGS = new Set([
  '--ci',
  '--fail-on-warnings',
  '--no-history',
  '--no-write',
  '--strict',
  '--summary-json',
  '--write-history',
]);

const parseArgs = (argv) => {
  const commonOptions = parseCommonCheckArgs(argv);
  const runtimeOptions = {
    appId: process.env['PLAYWRIGHT_APP_ID'] || 'web',
    mode: process.env['PLAYWRIGHT_RUNTIME_MODE'] || 'dev',
    agentId: process.env['AI_AGENT_ID'] || null,
    host: process.env['HOST'] || '127.0.0.1',
    cleanup: false,
    stopAfter: process.env['PLAYWRIGHT_RUNTIME_KEEP_ALIVE'] === 'false',
    disableBroker: process.env['PLAYWRIGHT_DISABLE_RUNTIME_BROKER'] === '1',
  };
  const playwrightArgs = [];

  for (const arg of argv) {
    if (SHARED_WRAPPER_FLAGS.has(arg)) {
      continue;
    }
    if (arg === '--runtime-cleanup') {
      runtimeOptions.cleanup = true;
      continue;
    }
    if (arg === '--runtime-stop-after') {
      runtimeOptions.stopAfter = true;
      continue;
    }
    if (arg === '--runtime-no-broker') {
      runtimeOptions.disableBroker = true;
      continue;
    }
    if (arg.startsWith('--runtime-app=')) {
      runtimeOptions.appId = arg.slice('--runtime-app='.length) || runtimeOptions.appId;
      continue;
    }
    if (arg.startsWith('--runtime-mode=')) {
      runtimeOptions.mode = arg.slice('--runtime-mode='.length) || runtimeOptions.mode;
      continue;
    }
    if (arg.startsWith('--runtime-agent=')) {
      runtimeOptions.agentId = arg.slice('--runtime-agent='.length) || runtimeOptions.agentId;
      continue;
    }
    if (arg.startsWith('--runtime-host=')) {
      runtimeOptions.host = arg.slice('--runtime-host='.length) || runtimeOptions.host;
      continue;
    }

    playwrightArgs.push(arg);
  }

  return {
    commonOptions,
    runtimeOptions,
    playwrightArgs,
  };
};

const normalizePlaywrightArgs = (playwrightArgs) => {
  const args =
    playwrightArgs[0] === 'playwright' ? playwrightArgs.slice(1) : [...playwrightArgs];
  if (args.length === 0) {
    return ['test'];
  }

  if (PLAYWRIGHT_COMMANDS.has(args[0])) {
    return args;
  }

  return ['test', ...args];
};

const formatRuntimeLabel = (runtime) => {
  if (!runtime) {
    return 'unknown';
  }

  if (runtime.source === 'disabled') {
    return 'disabled';
  }

  return `${runtime.source}${runtime.reused ? ':reused' : ':started'}`;
};

const writeRunMetadata = async ({ artifacts, runtime, playwrightArgs }) => {
  await fsPromises.mkdir(artifacts.runRoot, { recursive: true });
  const metadata = {
    generatedAt: new Date().toISOString(),
    runtime,
    playwrightArgs,
    runId: artifacts.runId,
    outputDir: artifacts.outputDir,
    htmlReportDir: artifacts.htmlReportDir,
    junitOutputFile: artifacts.junitOutputFile,
  };
  await fsPromises.writeFile(artifacts.metadataFile, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
};

const createTransientArtifacts = async ({ appId, agentId, runId }) => {
  const tempRoot = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'playwright-suite-'));
  const transientEnv = {
    ...process.env,
    PLAYWRIGHT_RUN_ARTIFACTS_ROOT: path.join(tempRoot, 'artifacts'),
  };

  return {
    tempRoot,
    artifacts: resolvePlaywrightRunArtifacts({
      rootDir: tempRoot,
      appId,
      agentId,
      runId,
      env: transientEnv,
    }),
  };
};

const buildSummaryJsonPaths = ({ artifacts, noWrite }) =>
  noWrite
    ? null
    : {
        runRoot: path.relative(root, artifacts.runRoot),
        outputDir: path.relative(root, artifacts.outputDir),
        htmlReportDir: path.relative(root, artifacts.htmlReportDir),
        junitOutputFile: path.relative(root, artifacts.junitOutputFile),
        metadataFile: path.relative(root, artifacts.metadataFile),
      };

const buildRunSummaryJsonSummary = ({
  runtime,
  runtimeOptions,
  normalizedPlaywrightArgs,
  result,
  noWrite,
}) => ({
  command: normalizedPlaywrightArgs[0] ?? 'test',
  argumentCount: normalizedPlaywrightArgs.length,
  exitCode: typeof result.code === 'number' ? result.code : null,
  signal: result.signal ?? null,
  runtimeSource: runtime?.source ?? 'unknown',
  runtimeReused: Boolean(runtime?.reused),
  brokerEnabled: !runtimeOptions.disableBroker,
  artifactsRetained: !noWrite,
});

const buildSummaryJsonFilters = ({ runtimeOptions, noWrite, cleanup = false }) => ({
  cleanup,
  noWrite,
  ci: process.argv.includes('--ci'),
  runtimeApp: runtimeOptions.appId,
  runtimeMode: runtimeOptions.mode,
  runtimeHost: runtimeOptions.host,
  runtimeStopAfter: runtimeOptions.stopAfter,
  runtimeBrokerDisabled: runtimeOptions.disableBroker,
});

const appendCapturedOutput = (value, chunk) => {
  const next = `${value}${chunk.toString()}`;
  if (next.length <= MAX_CAPTURE_OUTPUT_BYTES) {
    return next;
  }
  return next.slice(-MAX_CAPTURE_OUTPUT_BYTES);
};

const runPlaywright = async ({ args, env, preferredBrowserNodeBinDir, captureOutput = false }) =>
  await new Promise((resolve) => {
    const command = resolveNpxExecutable({ preferredBrowserNodeBinDir });
    const child = spawn(command, ['playwright', ...args], {
      cwd: root,
      env,
      stdio: captureOutput ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });

    let stdout = '';
    let stderr = '';

    if (captureOutput) {
      child.stdout?.on('data', (chunk) => {
        stdout = appendCapturedOutput(stdout, chunk);
      });
      child.stderr?.on('data', (chunk) => {
        stderr = appendCapturedOutput(stderr, chunk);
      });
    }

    child.on('error', (error) => {
      const resolvedStderr = captureOutput
        ? `${stderr}\n${error.stack ?? String(error)}`.trim()
        : error.stack ?? String(error);
      resolve({
        code: null,
        signal: null,
        command: [command, 'playwright', ...args].join(' '),
        stdout: captureOutput ? stdout.trim() : null,
        stderr: resolvedStderr,
      });
    });

    child.on('close', (code, signal) => {
      resolve({
        code,
        signal,
        command: [command, 'playwright', ...args].join(' '),
        stdout: captureOutput ? stdout.trim() : null,
        stderr: captureOutput ? stderr.trim() : null,
      });
    });
  });

const main = async () => {
  const { commonOptions, runtimeOptions, playwrightArgs } = parseArgs(process.argv.slice(2));
  const { summaryJson, noWrite } = commonOptions;
  const resolvedAgentId = runtimeOptions.agentId || resolveRuntimeAgentId({ env: process.env });

  if (runtimeOptions.cleanup) {
    const summary = await cleanupBrokerRuntimeLeases({
      rootDir: root,
      appId: runtimeOptions.appId,
      agentId: resolvedAgentId,
      env: process.env,
    });

    if (summaryJson) {
      writeSummaryJson({
        scannerName: 'playwright-suite',
        generatedAt: new Date().toISOString(),
        status: 'ok',
        summary: {
          mode: 'runtime-cleanup',
          inspectedLeases: summary.inspected,
          stoppedLeases: summary.stopped,
          removedLeaseRecords: summary.removed,
        },
        details: {
          appId: runtimeOptions.appId,
          agentId: resolvedAgentId,
        },
        paths: null,
        filters: buildSummaryJsonFilters({
          runtimeOptions,
          noWrite,
          cleanup: true,
        }),
        notes: ['playwright suite runtime cleanup result'],
      });
      return;
    }

    console.log(
      `[playwright-suite] cleaned leases app=${runtimeOptions.appId} agent=${resolvedAgentId} inspected=${summary.inspected} stopped=${summary.stopped} removed=${summary.removed}`
    );
    return;
  }

  const normalizedPlaywrightArgs = normalizePlaywrightArgs(playwrightArgs);
  const transientArtifacts = noWrite
    ? await createTransientArtifacts({
        appId: runtimeOptions.appId,
        agentId: resolvedAgentId,
        runId: process.env['TEST_RUN_ID'],
      })
    : null;
  const artifacts =
    transientArtifacts?.artifacts ??
    resolvePlaywrightRunArtifacts({
      rootDir: root,
      appId: runtimeOptions.appId,
      agentId: resolvedAgentId,
      runId: process.env['TEST_RUN_ID'],
      env: process.env,
    });

  let runtime = null;

  try {
    if (runtimeOptions.disableBroker) {
      runtime = {
        source: 'disabled',
        managed: false,
        reused: false,
        appId: runtimeOptions.appId,
        mode: runtimeOptions.mode,
        agentId: resolvedAgentId,
        host: runtimeOptions.host,
        baseUrl: process.env['PLAYWRIGHT_BASE_URL'] || 'http://localhost:3000',
        port: null,
        pid: null,
        distDir: process.env['NEXT_DIST_DIR'] || null,
        leaseKey: null,
        leaseFilePath: null,
        logFilePath: null,
        preferredBrowserNodeBinDir: null,
      };
    } else {
      runtime = await acquireRuntimeLease({
        rootDir: root,
        appId: runtimeOptions.appId,
        mode: runtimeOptions.mode,
        agentId: resolvedAgentId,
        host: runtimeOptions.host,
        env: process.env,
        });
    }

    if (!noWrite) {
      await writeRunMetadata({
        artifacts,
        runtime,
        playwrightArgs: normalizedPlaywrightArgs,
      });
    }

    const env = runtimeOptions.disableBroker
      ? {
          ...process.env,
          PLAYWRIGHT_OUTPUT_DIR: artifacts.outputDir,
          PLAYWRIGHT_HTML_REPORT_DIR: artifacts.htmlReportDir,
          PLAYWRIGHT_JUNIT_OUTPUT_FILE: artifacts.junitOutputFile,
          PLAYWRIGHT_RUNTIME_RUN_ID: artifacts.runId,
          AI_AGENT_ID: resolvedAgentId,
        }
      : buildBrokeredPlaywrightEnv({
          env: process.env,
          host: runtime.host,
          baseUrl: runtime.baseUrl,
          artifacts,
          preferredBrowserNodeBinDir: runtime.preferredBrowserNodeBinDir,
          agentId: resolvedAgentId,
          leaseKey: runtime.leaseKey,
          distDir: runtime.distDir,
        });

    if (!summaryJson) {
      const relativeRunRoot = noWrite ? 'transient' : path.relative(root, artifacts.runRoot) || artifacts.runRoot;
      console.log(
        `[playwright-suite] app=${runtimeOptions.appId} agent=${resolvedAgentId} runtime=${formatRuntimeLabel(runtime)} baseUrl=${runtime.baseUrl} artifacts=${relativeRunRoot}`
      );
    }

    const result = await runPlaywright({
      args: normalizedPlaywrightArgs,
      env,
      preferredBrowserNodeBinDir: runtime.preferredBrowserNodeBinDir,
      captureOutput: summaryJson,
    });

    if (summaryJson) {
      writeSummaryJson({
        scannerName: 'playwright-suite',
        generatedAt: new Date().toISOString(),
        status: result.code === 0 ? 'ok' : 'failed',
        summary: buildRunSummaryJsonSummary({
          runtime,
          runtimeOptions,
          normalizedPlaywrightArgs,
          result,
          noWrite,
        }),
        details: {
          runtime,
          command: result.command,
          playwrightArgs: normalizedPlaywrightArgs,
          runId: artifacts.runId,
          stdout: result.stdout,
          stderr: result.stderr,
        },
        paths: buildSummaryJsonPaths({ artifacts, noWrite }),
        filters: buildSummaryJsonFilters({
          runtimeOptions,
          noWrite,
        }),
        notes: ['playwright suite run result'],
      });
    } else if (noWrite) {
      console.log('Skipped retaining Playwright run artifacts (--no-write).');
    }

    process.exitCode = typeof result.code === 'number' ? result.code : 1;
  } finally {
    if (runtimeOptions.stopAfter && runtime?.managed && runtime.leaseFilePath) {
      await cleanupBrokerRuntimeLeases({
        rootDir: root,
        appId: runtimeOptions.appId,
        agentId: resolvedAgentId,
        env: process.env,
      });
    }

    if (transientArtifacts?.tempRoot) {
      await fsPromises.rm(transientArtifacts.tempRoot, { recursive: true, force: true });
    }
  }
};

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
