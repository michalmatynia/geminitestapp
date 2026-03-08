import { spawn } from 'node:child_process';
import fsPromises from 'node:fs/promises';
import path from 'node:path';

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

const parseArgs = (argv) => {
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

const runPlaywright = async ({ args, env, preferredBrowserNodeBinDir }) =>
  await new Promise((resolve, reject) => {
    const child = spawn(
      resolveNpxExecutable({ preferredBrowserNodeBinDir }),
      ['playwright', ...args],
      {
        cwd: root,
        env,
        stdio: 'inherit',
      }
    );

    child.on('error', reject);
    child.on('close', (code, signal) => {
      resolve({
        code,
        signal,
      });
    });
  });

const main = async () => {
  const { runtimeOptions, playwrightArgs } = parseArgs(process.argv.slice(2));
  const resolvedAgentId = runtimeOptions.agentId || resolveRuntimeAgentId({ env: process.env });

  if (runtimeOptions.cleanup) {
    const summary = await cleanupBrokerRuntimeLeases({
      rootDir: root,
      appId: runtimeOptions.appId,
      agentId: resolvedAgentId,
      env: process.env,
    });
    console.log(
      `[playwright-suite] cleaned leases app=${runtimeOptions.appId} agent=${resolvedAgentId} inspected=${summary.inspected} stopped=${summary.stopped} removed=${summary.removed}`
    );
    return;
  }

  const normalizedPlaywrightArgs = normalizePlaywrightArgs(playwrightArgs);
  const artifacts = resolvePlaywrightRunArtifacts({
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

    await writeRunMetadata({
      artifacts,
      runtime,
      playwrightArgs: normalizedPlaywrightArgs,
    });

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

    const relativeRunRoot = path.relative(root, artifacts.runRoot) || artifacts.runRoot;
    console.log(
      `[playwright-suite] app=${runtimeOptions.appId} agent=${resolvedAgentId} runtime=${formatRuntimeLabel(runtime)} baseUrl=${runtime.baseUrl} artifacts=${relativeRunRoot}`
    );

    const result = await runPlaywright({
      args: normalizedPlaywrightArgs,
      env,
      preferredBrowserNodeBinDir: runtime.preferredBrowserNodeBinDir,
    });

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
  }
};

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
