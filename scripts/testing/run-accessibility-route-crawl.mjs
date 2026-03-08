import path from 'node:path';
import { spawn } from 'node:child_process';

import { parseCommonCheckArgs, formatDuration, writeCheckArtifacts } from '../quality/lib/check-runner.mjs';
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
  normalizeAccessibilityRouteEntries,
  summarizeAccessibilityRouteCrawlReport,
} from './lib/accessibility-route-crawl.mjs';

const root = process.cwd();

const routeEntries = normalizeAccessibilityRouteEntries(accessibilityRouteCrawlRoutes);
const playwrightHost = process.env['HOST'] || '127.0.0.1';
const playwrightBaseUrl = process.env['PLAYWRIGHT_BASE_URL'] || `http://${playwrightHost}:3000`;
const playwrightAgentId = resolveRuntimeAgentId({ env: process.env });
const shouldStopPlaywrightRuntime = process.env['PLAYWRIGHT_RUNTIME_KEEP_ALIVE'] !== 'true';

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

const runPlaywrightRouteCrawl = async (playwrightRuntime) => {
  const artifacts = resolvePlaywrightRunArtifacts({
    rootDir: root,
    appId: 'web',
    agentId: playwrightRuntime.agentId ?? playwrightAgentId,
    runId: `${process.env['TEST_RUN_ID'] ?? 'accessibility-route-crawl'}-route-crawl`,
    env: process.env,
  });

  return await new Promise((resolve) => {
    const command = resolveNpxExecutable({
      preferredBrowserNodeBinDir: playwrightRuntime.preferredBrowserNodeBinDir,
    });
    const args = [
      'playwright',
      'test',
      'e2e/features/accessibility/accessibility-route-crawl.spec.ts',
      '--reporter=json',
    ];

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
      resolve({
        exitCode: null,
        stdout,
        stderr: `${stderr}\n${error.stack ?? String(error)}`.trim(),
        command: [command, ...args].join(' '),
      });
    });

    child.on('close', (exitCode) => {
      resolve({
        exitCode,
        stdout,
        stderr: stderr.trim(),
        command: [command, ...args].join(' '),
        runtime: {
          source: playwrightRuntime.source,
          reused: playwrightRuntime.reused,
          baseUrl: playwrightRuntime.baseUrl,
          agentId: playwrightRuntime.agentId,
          leaseKey: playwrightRuntime.leaseKey ?? null,
        },
      });
    });
  });
};

const run = async () => {
  const startedAt = Date.now();
  const { strictMode, failOnWarnings, shouldWriteHistory } = parseCommonCheckArgs();
  void failOnWarnings;

  let playwrightRuntime = null;

  try {
    playwrightRuntime = await acquireRuntimeLease({
      rootDir: root,
      appId: 'web',
      mode: 'dev',
      agentId: playwrightAgentId,
      host: playwrightHost,
      env: process.env,
    });
    console.log(
      `[accessibility-route-crawl] runtime=${playwrightRuntime.source}${playwrightRuntime.reused ? ':reused' : ':started'} baseUrl=${playwrightRuntime.baseUrl} agent=${playwrightRuntime.agentId}`
    );

    const execution = await runPlaywrightRouteCrawl(playwrightRuntime);

    let playwrightReport = null;
    try {
      playwrightReport = JSON.parse(execution.stdout);
    } catch (error) {
      const payload = {
        generatedAt: new Date().toISOString(),
        status: 'failed',
        summary: {
          total: routeEntries.length,
          passed: 0,
          failed: routeEntries.length,
          durationMs: Date.now() - startedAt,
          unexpected: routeEntries.length,
          flaky: 0,
          skipped: 0,
          errorCount: 1,
        },
        runtime: execution.runtime,
        command: execution.command,
        externalErrors: [
          `Playwright JSON output could not be parsed: ${error instanceof Error ? error.message : String(error)}`,
        ],
        results: routeEntries.map((routeEntry) => ({
          ...routeEntry,
          title: null,
          status: 'fail',
          durationMs: 0,
          errors: ['Playwright route crawl did not return a parseable JSON report.'],
        })),
        stderr: execution.stderr,
        durationMs: Date.now() - startedAt,
      };

      const markdown = toMarkdown(payload);
      const outputs = await writeCheckArtifacts({
        root,
        slug: 'accessibility-route-crawl',
        payload,
        markdown,
        shouldWriteHistory,
      });

      console.log(
        `[accessibility-route-crawl] status=${payload.status} routes=${payload.summary.total} pass=${payload.summary.passed} fail=${payload.summary.failed} duration=${formatDuration(payload.durationMs)}`
      );
      console.log(`Wrote ${path.relative(root, outputs.latestJsonPath)}`);
      console.log(`Wrote ${path.relative(root, outputs.latestMdPath)}`);
      if (shouldWriteHistory) {
        console.log(`Wrote ${path.relative(root, outputs.historicalJsonPath)}`);
        console.log(`Wrote ${path.relative(root, outputs.historicalMdPath)}`);
      }

      if (strictMode) {
        process.exitCode = 1;
      }
      return;
    }

    const summary = summarizeAccessibilityRouteCrawlReport({
      report: playwrightReport,
      routeEntries,
      stderr: execution.stderr,
      command: execution.command,
    });

    const payload = {
      generatedAt: new Date().toISOString(),
      status: summary.status,
      runtime: execution.runtime,
      summary: summary.summary,
      command: summary.command,
      externalErrors: summary.externalErrors,
      results: summary.results,
      stderr: summary.stderr,
      durationMs: Date.now() - startedAt,
      exitCode: execution.exitCode,
    };

    const markdown = toMarkdown(payload);
    const outputs = await writeCheckArtifacts({
      root,
      slug: 'accessibility-route-crawl',
      payload,
      markdown,
      shouldWriteHistory,
    });

    console.log(
      `[accessibility-route-crawl] status=${payload.status} routes=${payload.summary.total} pass=${payload.summary.passed} fail=${payload.summary.failed} duration=${formatDuration(payload.durationMs)}`
    );
    console.log(`Wrote ${path.relative(root, outputs.latestJsonPath)}`);
    console.log(`Wrote ${path.relative(root, outputs.latestMdPath)}`);
    if (shouldWriteHistory) {
      console.log(`Wrote ${path.relative(root, outputs.historicalJsonPath)}`);
      console.log(`Wrote ${path.relative(root, outputs.historicalMdPath)}`);
    }

    if (strictMode && payload.status !== 'passed') {
      process.exitCode = 1;
    }
  } finally {
    if (shouldStopPlaywrightRuntime && playwrightRuntime?.managed && playwrightRuntime.leaseFilePath) {
      await stopBrokerRuntimeLease({
        lease: playwrightRuntime,
        leaseFilePath: playwrightRuntime.leaseFilePath,
      });
    }
  }
};

run().catch((error) => {
  console.error('[accessibility-route-crawl] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
