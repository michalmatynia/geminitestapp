import path from 'node:path';
import { spawn } from 'node:child_process';

import { formatDuration, parseCommonCheckArgs, writeCheckArtifacts } from '../quality/lib/check-runner.mjs';
import { writeSummaryJson } from '../lib/check-cli.mjs';
import { accessibilityRouteCrawlRoutes } from './config/accessibility-route-crawl.config.mjs';
import {
  acquireRuntimeLease,
  buildBrokeredPlaywrightEnv,
  resolveNpxExecutable,
  resolvePlaywrightRunArtifacts,
  resolveRuntimeAgentId,
  stopBrokerRuntimeLease,
} from './lib/runtime-broker.mjs';
import {
  buildAccessibilityBrokerLeaseRequest,
  buildAccessibilityPlaywrightRuntimeContext,
} from './lib/accessibility-playwright-runtime-env.mjs';
import {
  buildAccessibilityRouteCrawlTitle,
  buildAccessibilityRouteCrawlHeartbeatLine,
  filterAccessibilityRouteEntries,
  normalizeAccessibilityRouteEntries,
  resolveAccessibilityRouteCrawlChunkSize,
  resolveAccessibilityRouteCrawlAgentId,
  summarizeAccessibilityRouteCrawlReport,
} from './lib/accessibility-route-crawl.mjs';

if (!process.env['PLAYWRIGHT_RUNTIME_PROBE_TIMEOUT_MS']) {
  process.env['PLAYWRIGHT_RUNTIME_PROBE_TIMEOUT_MS'] = '30000';
}

const root = process.cwd();

const routeEntries = filterAccessibilityRouteEntries(
  normalizeAccessibilityRouteEntries(accessibilityRouteCrawlRoutes),
  { env: process.env }
);
const defaultPlaywrightAgentId = resolveRuntimeAgentId({ env: process.env });
const accessibilityRuntime = buildAccessibilityPlaywrightRuntimeContext({
  env: process.env,
  agentId: resolveAccessibilityRouteCrawlAgentId({
    env: process.env,
    defaultAgentId: defaultPlaywrightAgentId,
  }),
});
const playwrightAgentId = accessibilityRuntime.agentId;
const shouldStopPlaywrightRuntime = accessibilityRuntime.shouldStopRuntime;

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# Accessibility Route Crawl Report');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Status: ${payload.status.toUpperCase()}`);
  lines.push(`- Routes: ${payload.summary.total}`);
  lines.push(`- Passed: ${payload.summary.passed}`);
  lines.push(`- Failed: ${payload.summary.failed}`);
  lines.push(`- Unexpected Playwright failures: ${payload.summary.unexpected}`);
  lines.push(`- Flaky results: ${payload.summary.flaky}`);
  lines.push(`- Skipped: ${payload.summary.skipped}`);
  lines.push(`- Error messages captured: ${payload.summary.errorCount}`);
  lines.push('');
  lines.push('## Route Status');
  lines.push('');
  lines.push('| Route | Audience | Status | Duration | Errors |');
  lines.push('| --- | --- | --- | ---: | ---: |');
  for (const result of payload.results) {
    lines.push(
      `| ${result.route} | ${result.audience} | ${result.status.toUpperCase()} | ${formatDuration(result.durationMs)} | ${result.errors.length} |`
    );
  }
  lines.push('');
  lines.push('## Errors');
  lines.push('');
  const failingRoutes = payload.results.filter((result) => result.errors.length > 0);
  if (failingRoutes.length === 0 && payload.externalErrors.length === 0) {
    lines.push('No route crawl errors detected.');
  } else {
    for (const result of failingRoutes) {
      lines.push(`### ${result.name}`);
      lines.push('');
      for (const error of result.errors) {
        lines.push(`- ${error}`);
      }
      lines.push('');
    }

    if (payload.externalErrors.length > 0) {
      lines.push('### Playwright Errors');
      lines.push('');
      for (const error of payload.externalErrors) {
        lines.push(`- ${error}`);
      }
      lines.push('');
    }
  }
  lines.push('## Notes');
  lines.push('');
  lines.push('- This crawl scans representative public and admin routes with the same axe helper used by the browser accessibility smoke suites.');
  lines.push('- Admin routes establish a signed-in session through the shared Playwright admin auth helper before scanning.');
  lines.push('- Run `npm run test:accessibility:gate` to execute component policies, smoke suites, and this route crawl together.');
  lines.push('- Strict mode fails when any route scan fails.');
  return `${lines.join('\n')}\n`;
};

const buildSummaryJsonSummary = (payload) => ({
  totalRoutes: payload.summary.total,
  passedRoutes: payload.summary.passed,
  failedRoutes: payload.summary.failed,
  playwrightDurationMs: payload.summary.durationMs,
  totalDurationMs: payload.durationMs,
  unexpectedResults: payload.summary.unexpected,
  flakyResults: payload.summary.flaky,
  skippedResults: payload.summary.skipped,
  errorCount: payload.summary.errorCount,
});

const buildSummaryJsonPaths = (outputs, shouldWriteHistory) =>
  outputs
    ? {
        latestJson: path.relative(root, outputs.latestJsonPath),
        latestMarkdown: path.relative(root, outputs.latestMdPath),
        historicalJson: shouldWriteHistory ? path.relative(root, outputs.historicalJsonPath) : null,
        historicalMarkdown: shouldWriteHistory ? path.relative(root, outputs.historicalMdPath) : null,
      }
    : null;

const chunkRouteEntries = (entries, chunkSize) => {
  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
  }

  const parsedChunkSize = Number.parseInt(String(chunkSize ?? ''), 10);
  const resolvedChunkSize =
    Number.isFinite(parsedChunkSize) && parsedChunkSize > 0 ? parsedChunkSize : null;
  if (!resolvedChunkSize || resolvedChunkSize >= entries.length) {
    return [entries];
  }

  const chunks = [];
  for (let index = 0; index < entries.length; index += resolvedChunkSize) {
    chunks.push(entries.slice(index, index + resolvedChunkSize));
  }

  return chunks;
};

const resolveChunkLabel = ({ chunkIndex, chunkCount }) => {
  if (!Number.isInteger(chunkCount) || chunkCount <= 1) {
    return null;
  }

  const resolvedIndex = Number.isInteger(chunkIndex) ? chunkIndex + 1 : 1;
  return `chunk-${resolvedIndex}-of-${chunkCount}`;
};

const resolveExitCode = (exitCodes = []) => {
  const resolved = exitCodes.filter((code) => code !== undefined);
  if (resolved.length === 0) {
    return null;
  }

  if (resolved.some((code) => code === null)) {
    return null;
  }

  const nonZero = resolved.find((code) => Number.isInteger(code) && code !== 0);
  return nonZero ?? 0;
};

const runPlaywrightRouteCrawl = async (
  playwrightRuntime,
  { emitHeartbeat = true, routeIds = null, runIdSuffix = null } = {}
) => {
  const runtimePayload = {
    source: playwrightRuntime.source,
    reused: playwrightRuntime.reused,
    baseUrl: playwrightRuntime.baseUrl,
    agentId: playwrightRuntime.agentId,
    leaseKey: playwrightRuntime.leaseKey ?? null,
  };
  const artifacts = resolvePlaywrightRunArtifacts({
    rootDir: root,
    appId: 'web',
    agentId: playwrightRuntime.agentId ?? playwrightAgentId,
    runId: runIdSuffix
      ? `${process.env['TEST_RUN_ID'] ?? 'accessibility-route-crawl'}-route-crawl-${runIdSuffix}`
      : `${process.env['TEST_RUN_ID'] ?? 'accessibility-route-crawl'}-route-crawl`,
    env: process.env,
  });

  return await new Promise((resolve) => {
    const startedAt = Date.now();
    const command = resolveNpxExecutable({
      preferredBrowserNodeBinDir: playwrightRuntime.preferredBrowserNodeBinDir,
    });
    const args = [
      'playwright',
      'test',
      'e2e/features/accessibility/accessibility-route-crawl.spec.ts',
      '--reporter=json',
    ];
    const heartbeatTimer = emitHeartbeat
      ? setInterval(() => {
          console.log(
            buildAccessibilityRouteCrawlHeartbeatLine({
              elapsedMs: Date.now() - startedAt,
              baseUrl: playwrightRuntime.baseUrl ?? null,
              agentId: playwrightRuntime.agentId ?? null,
              leaseKey: playwrightRuntime.leaseKey ?? null,
              formatDuration,
            })
          );
        }, 30_000)
      : null;
    heartbeatTimer?.unref?.();

    const child = spawn(command, args, {
      cwd: root,
      env: {
        ...buildBrokeredPlaywrightEnv({
          env: process.env,
          host: playwrightRuntime.host,
          baseUrl: playwrightRuntime.baseUrl,
          artifacts,
          preferredBrowserNodeBinDir: playwrightRuntime.preferredBrowserNodeBinDir,
          agentId: playwrightRuntime.agentId ?? playwrightAgentId,
          leaseKey: playwrightRuntime.leaseKey,
          distDir: playwrightRuntime.distDir,
        }),
        ...(Array.isArray(routeIds) && routeIds.length > 0
          ? { PLAYWRIGHT_ROUTE_CRAWL_IDS: routeIds.join(',') }
          : {}),
        FORCE_COLOR: '0',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      clearInterval(heartbeatTimer);
      resolve({
        exitCode: null,
        stdout,
        stderr: `${stderr}\n${error.stack ?? String(error)}`.trim(),
        command: [command, ...args].join(' '),
        runtime: runtimePayload,
      });
    });

    child.on('close', (exitCode) => {
      clearInterval(heartbeatTimer);
      resolve({
        exitCode,
        stdout,
        stderr: stderr.trim(),
        command: [command, ...args].join(' '),
        runtime: runtimePayload,
      });
    });
  });
};

const buildChunkParseFailureSummary = ({ chunkRoutes, execution, error, startedAt }) => ({
  status: 'failed',
  summary: {
    total: chunkRoutes.length,
    passed: 0,
    failed: chunkRoutes.length,
    durationMs: Date.now() - startedAt,
    unexpected: chunkRoutes.length,
    flaky: 0,
    skipped: 0,
    errorCount: chunkRoutes.length + 1,
  },
  command: execution.command,
  externalErrors: [
    `Playwright JSON output could not be parsed: ${error instanceof Error ? error.message : String(error)}`,
  ],
  results: chunkRoutes.map((routeEntry) => ({
    ...routeEntry,
    title: null,
    status: 'fail',
    durationMs: 0,
    errors: ['Playwright route crawl did not return a parseable JSON report.'],
  })),
  stderr: execution.stderr,
});

const runRouteCrawlChunk = async ({
  chunkRoutes,
  chunkIndex,
  chunkCount,
  emitHeartbeat,
  summaryJson,
  preserveManagedDistDirOnAcquire = false,
  preserveManagedDistDirOnStop = false,
}) => {
  if (!Array.isArray(chunkRoutes) || chunkRoutes.length === 0) {
    return {
      status: 'failed',
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        durationMs: 0,
        unexpected: 0,
        flaky: 0,
        skipped: 0,
        errorCount: 1,
      },
      command: '',
      externalErrors: ['No routes were provided for this accessibility route crawl chunk.'],
      results: [],
      stderr: '',
      runtime: null,
      exitCode: null,
    };
  }

  let playwrightRuntime = null;
  const chunkStartedAt = Date.now();
  const runIdSuffix = resolveChunkLabel({ chunkIndex, chunkCount });

  try {
    playwrightRuntime = await acquireRuntimeLease(
      buildAccessibilityBrokerLeaseRequest({
        rootDir: root,
        context: accessibilityRuntime,
        preserveManagedDistDir: preserveManagedDistDirOnAcquire,
      })
    );
    if (!summaryJson && chunkCount > 1) {
      console.log(
        `[accessibility-route-crawl] chunk ${chunkIndex + 1}/${chunkCount} routes=${chunkRoutes.length}`
      );
    }
    if (!summaryJson) {
      console.log(
        `[accessibility-route-crawl] runtime=${playwrightRuntime.source}${playwrightRuntime.reused ? ':reused' : ':started'} baseUrl=${playwrightRuntime.baseUrl} agent=${playwrightRuntime.agentId}`
      );
    }

    const execution = await runPlaywrightRouteCrawl(playwrightRuntime, {
      emitHeartbeat,
      routeIds: chunkRoutes.map((routeEntry) => routeEntry.id),
      runIdSuffix,
    });

    let summary = null;
    try {
      const playwrightReport = JSON.parse(execution.stdout);
      summary = summarizeAccessibilityRouteCrawlReport({
        report: playwrightReport,
        routeEntries: chunkRoutes,
        stderr: execution.stderr,
        command: execution.command,
      });
    } catch (error) {
      summary = buildChunkParseFailureSummary({
        chunkRoutes,
        execution,
        error,
        startedAt: chunkStartedAt,
      });
    }

    return {
      ...summary,
      runtime: execution.runtime ?? null,
      exitCode: execution.exitCode ?? null,
    };
  } finally {
    if (shouldStopPlaywrightRuntime && playwrightRuntime?.managed && playwrightRuntime.leaseFilePath) {
      await stopBrokerRuntimeLease({
        lease: playwrightRuntime,
        leaseFilePath: playwrightRuntime.leaseFilePath,
        preserveManagedDistDir: preserveManagedDistDirOnStop,
      });
    }
  }
};

const buildAggregatedPayload = ({ chunkResults, routeEntries: targetEntries, startedAt }) => {
  const resultsById = new Map();
  const externalErrors = [];
  const commands = [];
  const stderrs = [];
  const runtimes = [];
  const exitCodes = [];
  let playwrightDurationMs = 0;
  let unexpected = 0;
  let flaky = 0;
  let skipped = 0;

  for (const chunkResult of chunkResults) {
    if (!chunkResult) {
      continue;
    }

    const summary = chunkResult.summary ?? null;
    if (summary) {
      playwrightDurationMs += Number.isFinite(summary.durationMs) ? summary.durationMs : 0;
      unexpected += Number.isFinite(summary.unexpected) ? summary.unexpected : 0;
      flaky += Number.isFinite(summary.flaky) ? summary.flaky : 0;
      skipped += Number.isFinite(summary.skipped) ? summary.skipped : 0;
    }

    if (Array.isArray(chunkResult.externalErrors)) {
      externalErrors.push(...chunkResult.externalErrors);
    }
    if (chunkResult.command) {
      commands.push(chunkResult.command);
    }
    if (chunkResult.stderr) {
      stderrs.push(chunkResult.stderr);
    }
    if (chunkResult.runtime) {
      runtimes.push(chunkResult.runtime);
    }
    exitCodes.push(chunkResult.exitCode);

    if (Array.isArray(chunkResult.results)) {
      for (const result of chunkResult.results) {
        resultsById.set(result.id, result);
      }
    }
  }

  const results = targetEntries.map((routeEntry) => {
    const existing = resultsById.get(routeEntry.id);
    if (existing) {
      return existing;
    }

    const title = buildAccessibilityRouteCrawlTitle(routeEntry);
    return {
      ...routeEntry,
      title,
      status: 'fail',
      durationMs: 0,
      errors: [`No Playwright result was recorded for ${title}.`],
    };
  });

  const passed = results.filter((result) => result.status === 'pass').length;
  const failed = results.length - passed;
  const errorCount =
    results.reduce((total, result) => total + result.errors.length, 0) + externalErrors.length;

  return {
    generatedAt: new Date().toISOString(),
    status: failed > 0 || externalErrors.length > 0 ? 'failed' : 'passed',
    runtime: runtimes[0] ?? null,
    ...(runtimes.length > 1 ? { runtimes } : {}),
    summary: {
      total: results.length,
      passed,
      failed,
      durationMs: playwrightDurationMs,
      unexpected,
      flaky,
      skipped,
      errorCount,
    },
    command: commands.length <= 1 ? (commands[0] ?? '') : commands.join(' && '),
    externalErrors,
    results,
    stderr: stderrs.filter(Boolean).join('\n').trim(),
    durationMs: Date.now() - startedAt,
    exitCode: resolveExitCode(exitCodes),
  };
};

const run = async () => {
  const startedAt = Date.now();
  const { strictMode, failOnWarnings, shouldWriteHistory, noWrite, summaryJson } =
    parseCommonCheckArgs();
  void failOnWarnings;

  if (routeEntries.length === 0) {
    throw new Error('No accessibility route crawl routes matched the current filters.');
  }

  const chunkSize = resolveAccessibilityRouteCrawlChunkSize({
    env: process.env,
    strictMode,
    totalRoutes: routeEntries.length,
  });
  const routeChunks = chunkRouteEntries(routeEntries, chunkSize);
  const chunkResults = [];

  for (const [index, chunkRoutes] of routeChunks.entries()) {
    chunkResults.push(
      await runRouteCrawlChunk({
        chunkRoutes,
        chunkIndex: index,
        chunkCount: routeChunks.length,
        emitHeartbeat: !summaryJson,
        summaryJson,
        preserveManagedDistDirOnAcquire: index > 0 && routeChunks.length > 1,
        preserveManagedDistDirOnStop: index < routeChunks.length - 1,
      })
    );
  }

  const payload = buildAggregatedPayload({
    chunkResults,
    routeEntries,
    startedAt,
  });

  const markdown = toMarkdown(payload);
  const outputs = noWrite
    ? null
    : await writeCheckArtifacts({
        root,
        slug: 'accessibility-route-crawl',
        payload,
        markdown,
        shouldWriteHistory,
      });

  if (summaryJson) {
    writeSummaryJson({
      scannerName: 'accessibility-route-crawl',
      generatedAt: payload.generatedAt,
      status: payload.status === 'passed' ? 'ok' : 'failed',
      summary: buildSummaryJsonSummary(payload),
      details: {
        runtime: payload.runtime,
        ...(payload.runtimes ? { runtimes: payload.runtimes } : {}),
        command: payload.command,
        externalErrors: payload.externalErrors,
        results: payload.results,
        stderr: payload.stderr,
        exitCode: payload.exitCode,
      },
      paths: buildSummaryJsonPaths(outputs, shouldWriteHistory),
      filters: {
        strictMode,
        historyDisabled: !shouldWriteHistory,
        noWrite,
        ci: process.argv.includes('--ci'),
      },
      notes: ['accessibility route crawl result'],
    });

    if (strictMode && payload.status !== 'passed') {
      process.exit(1);
    }
    return;
  }

  console.log(
    `[accessibility-route-crawl] status=${payload.status} routes=${payload.summary.total} pass=${payload.summary.passed} fail=${payload.summary.failed} duration=${formatDuration(payload.durationMs)}`
  );
  if (outputs) {
    console.log(`Wrote ${path.relative(root, outputs.latestJsonPath)}`);
    console.log(`Wrote ${path.relative(root, outputs.latestMdPath)}`);
    if (shouldWriteHistory) {
      console.log(`Wrote ${path.relative(root, outputs.historicalJsonPath)}`);
      console.log(`Wrote ${path.relative(root, outputs.historicalMdPath)}`);
    }
  } else {
    console.log('Skipped writing accessibility route crawl artifacts (--no-write).');
  }

  if (strictMode && payload.status !== 'passed') {
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error('[accessibility-route-crawl] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
