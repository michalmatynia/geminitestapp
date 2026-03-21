import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

import {
  acquireRuntimeLease,
  buildBrokeredPlaywrightEnv,
  resolveNpxExecutable,
  resolvePlaywrightRunArtifacts,
  resolveRuntimeAgentId,
  stopBrokerRuntimeLease,
} from './lib/runtime-broker.mjs';
import { detectExistingPlaywrightServer } from './lib/playwright-suite-runtime.mjs';
import {
  buildAccessibilityBrokerLeaseRequest,
  buildAccessibilityPlaywrightRuntimeContext,
} from './lib/accessibility-playwright-runtime-env.mjs';
import { writeMetricsMarkdownFile } from '../docs/metrics-frontmatter.mjs';
import { parseCommonCheckArgs, writeSummaryJson } from '../lib/check-cli.mjs';

const args = new Set(process.argv.slice(2));
const { strictMode, shouldWriteHistory, noWrite, summaryJson } = parseCommonCheckArgs();
const failOnWarningBudgetExceed = args.has('--fail-on-warning-budget-exceed');
const warningBudgetArg = [...args].find((arg) => arg.startsWith('--warning-budget='));
const warningBudget = Number.parseInt(warningBudgetArg?.split('=')[1] ?? '10', 10);

const root = process.cwd();
const outDir = path.join(root, 'docs', 'metrics');
const MAX_OUTPUT_BYTES = 100_000;
const accessibilityRuntime = buildAccessibilityPlaywrightRuntimeContext({
  env: process.env,
  agentId: resolveRuntimeAgentId({ env: process.env }),
});
const playwrightAgentId = accessibilityRuntime.agentId;
const shouldStopPlaywrightRuntime = accessibilityRuntime.shouldStopRuntime;
const shouldReusePlaywrightRuntimeAcrossSuites = !shouldStopPlaywrightRuntime;

const suites = [
  {
    id: 'app-shell-a11y',
    name: 'App Shell Accessibility',
    runner: 'vitest',
    tests: ['src/app/__tests__/shell-accessibility.test.tsx'],
  },
  {
    id: 'auth-signin-a11y',
    name: 'Auth Sign-In Accessibility',
    runner: 'vitest',
    tests: ['__tests__/features/auth/pages/signin-page.test.tsx'],
  },
  {
    id: 'products-edit-a11y',
    name: 'Products Edit Form Accessibility',
    runner: 'vitest',
    tests: ['__tests__/features/products/pages/product-edit-page.test.tsx'],
  },
  {
    id: 'image-studio-a11y',
    name: 'Image Studio UI Accessibility',
    runner: 'vitest',
    tests: ['src/features/ai/image-studio/components/__tests__/ImageStudioAnalysisTab.apply-intent.test.tsx'],
  },
  {
    id: 'ai-paths-a11y',
    name: 'AI Paths Canvas Accessibility',
    runner: 'vitest',
    tests: ['src/features/ai/ai-paths/components/__tests__/AiPathsRuntimeAnalysis.test.tsx'],
  },
  {
    id: 'case-resolver-a11y',
    name: 'Case Resolver Header Accessibility',
    runner: 'vitest',
    tests: ['src/features/case-resolver/__tests__/case-resolver-tree-header.test.tsx'],
  },
  {
    id: 'case-resolver-browser-a11y',
    name: 'Case Resolver Accessibility',
    runner: 'playwright',
    tests: ['e2e/features/accessibility/case-resolver-accessibility.spec.ts'],
  },
  {
    id: 'kangur-profile-a11y',
    name: 'Kangur Profile Accessibility',
    runner: 'vitest',
    tests: ['__tests__/features/kangur/kangur-accessibility-smoke.test.tsx'],
  },
  {
    id: 'public-auth-routes-browser-a11y',
    name: 'Public Auth Route Accessibility',
    runner: 'playwright',
    tests: ['e2e/features/accessibility/public-auth-accessibility.spec.ts'],
  },
  {
    id: 'admin-dashboard-browser-a11y',
    name: 'Admin Dashboard Accessibility',
    runner: 'playwright',
    tests: ['e2e/features/accessibility/admin-dashboard-accessibility.spec.ts'],
  },
  {
    id: 'products-list-browser-a11y',
    name: 'Products List Accessibility',
    runner: 'playwright',
    tests: ['e2e/features/accessibility/products-list-accessibility.spec.ts'],
  },
  {
    id: 'cms-pages-browser-a11y',
    name: 'CMS Pages Accessibility',
    runner: 'playwright',
    tests: ['e2e/features/accessibility/cms-pages-accessibility.spec.ts'],
  },
  {
    id: 'notes-workspace-browser-a11y',
    name: 'Notes Workspace Accessibility',
    runner: 'playwright',
    tests: ['e2e/features/accessibility/notes-workspace-accessibility.spec.ts'],
  },
  {
    id: 'cms-builder-browser-a11y',
    name: 'CMS Builder Accessibility',
    runner: 'playwright',
    tests: ['e2e/features/accessibility/cms-builder-accessibility.spec.ts'],
  },
];

const formatDuration = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) return '0ms';
  if (ms < 1000) return `${ms}ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)}s`;
  return `${(sec / 60).toFixed(1)}m`;
};

const countActWarnings = (value) => (value.match(/not wrapped in act\(\.\.\.\)/g) ?? []).length;

const formatRuntimeLabel = (runtime) =>
  runtime ? `${runtime.source}${runtime.reused ? ':reused' : ':started'}` : 'none';

const resolveSuiteCommand = (suite, playwrightRuntime) => {
  if (suite.runner === 'playwright') {
    const artifacts = resolvePlaywrightRunArtifacts({
      rootDir: root,
      appId: 'web',
      agentId: playwrightRuntime.agentId ?? playwrightAgentId,
      runId: `${process.env['TEST_RUN_ID'] ?? 'accessibility-smoke'}-${suite.id}`,
      env: process.env,
    });
    return {
      command: resolveNpxExecutable({
        preferredBrowserNodeBinDir: playwrightRuntime.preferredBrowserNodeBinDir,
      }),
      args: ['playwright', 'test', ...suite.tests],
      env: buildBrokeredPlaywrightEnv({
        env: process.env,
        host: playwrightRuntime.host,
        baseUrl: playwrightRuntime.baseUrl,
        artifacts,
        preferredBrowserNodeBinDir: playwrightRuntime.preferredBrowserNodeBinDir,
        agentId: playwrightRuntime.agentId ?? playwrightAgentId,
        leaseKey: playwrightRuntime.leaseKey,
        distDir: playwrightRuntime.distDir,
      }),
    };
  }

  return {
    command: 'npx',
    args: ['vitest', 'run', '--project', 'unit', ...suite.tests],
    env: {},
  };
};

const runSuite = async (suite, playwrightRuntime) => {
  const startedAt = Date.now();
  const { command, args: commandArgs, env: suiteEnv } = resolveSuiteCommand(
    suite,
    playwrightRuntime
  );

  return await new Promise((resolve) => {
    const child = spawn(command, commandArgs, {
      cwd: root,
      env: {
        ...process.env,
        ...(suiteEnv ?? {}),
        FORCE_COLOR: '0',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';

    const append = (chunk) => {
      output += chunk.toString();
      if (output.length > MAX_OUTPUT_BYTES) {
        output = output.slice(-MAX_OUTPUT_BYTES);
      }
    };

    child.stdout?.on('data', append);
    child.stderr?.on('data', append);

    child.on('error', (error) => {
      const durationMs = Date.now() - startedAt;
      const resolvedOutput = `${output}\n${error.stack ?? String(error)}`.trim();
      resolve({
        id: suite.id,
        name: suite.name,
        runner: suite.runner ?? 'vitest',
        tests: suite.tests,
        command: [command, ...commandArgs].join(' '),
        status: 'fail',
        exitCode: null,
        durationMs,
        actWarnings: countActWarnings(resolvedOutput),
        output: resolvedOutput,
      });
    });

    child.on('close', (exitCode) => {
      const durationMs = Date.now() - startedAt;
      resolve({
        id: suite.id,
        name: suite.name,
        runner: suite.runner ?? 'vitest',
        tests: suite.tests,
        command: [command, ...commandArgs].join(' '),
        status: exitCode === 0 ? 'pass' : 'fail',
        exitCode,
        durationMs,
        actWarnings: countActWarnings(output),
        output: output.trim(),
      });
    });
  });
};

const acquirePlaywrightRuntime = async () =>
  await acquireRuntimeLease(
    buildAccessibilityBrokerLeaseRequest({
      rootDir: root,
      context: accessibilityRuntime,
    })
  );

const stopManagedPlaywrightRuntime = async (runtime) => {
  if (!runtime?.managed || !runtime.leaseFilePath) {
    return;
  }

  await stopBrokerRuntimeLease({
    lease: runtime,
    leaseFilePath: runtime.leaseFilePath,
  });
};

const ensurePlaywrightRuntime = async (runtime) => {
  if (!runtime) {
    return await acquirePlaywrightRuntime();
  }

  const healthy = await detectExistingPlaywrightServer({
    baseUrl: runtime.baseUrl,
  });
  if (healthy) {
    return runtime;
  }

  await stopManagedPlaywrightRuntime(runtime);
  return await acquirePlaywrightRuntime();
};

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# Accessibility Smoke Report');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Suites: ${payload.summary.total}`);
  lines.push(`- Passed: ${payload.summary.passed}`);
  lines.push(`- Failed: ${payload.summary.failed}`);
  lines.push(`- React act warnings: ${payload.summary.actWarnings}`);
  lines.push(`- Warning budget: ${payload.summary.warningBudget}`);
  lines.push(`- Warning budget status: ${payload.summary.warningBudgetStatus}`);
  lines.push(`- Warning budget enforcement: ${payload.summary.warningBudgetEnforcement}`);
  lines.push('');
  lines.push('## Suite Status');
  lines.push('');
  lines.push('| Suite | Runner | Status | Duration | Exit | Tests |');
  lines.push('| --- | --- | --- | ---: | ---: | --- |');
  for (const result of payload.results) {
    lines.push(
      `| ${result.name} | ${result.runner} | ${result.status.toUpperCase()} | ${formatDuration(result.durationMs)} | ${result.exitCode ?? '-'} | ${result.tests.map((test) => `\`${test}\``).join(', ')} |`
    );
  }
  lines.push('');
  lines.push('## Warning Details');
  lines.push('');
  lines.push('| Suite | React act warnings |');
  lines.push('| --- | ---: |');
  for (const result of payload.results) {
    lines.push(`| ${result.name} | ${result.actWarnings} |`);
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- This smoke suite tracks keyboard/focus/label checks plus axe-core scans across critical user flows.');
  lines.push('- Unit suites cover shared semantics and component states; Playwright suites cover browser-rendered routes.');
  lines.push('- Run `npm run test:accessibility:gate` before UI-facing changes.');
  lines.push('- Use `--fail-on-warning-budget-exceed` in strict mode to fail when warning budget is exceeded.');
  return `${lines.join('\n')}\n`;
};

const writeArtifacts = async (payload) => {
  await fs.mkdir(outDir, { recursive: true });
  const stamp = payload.generatedAt.replace(/[:.]/g, '-');

  const latestJsonPath = path.join(outDir, 'accessibility-smoke-latest.json');
  const latestMdPath = path.join(outDir, 'accessibility-smoke-latest.md');
  const historicalJsonPath = path.join(outDir, `accessibility-smoke-${stamp}.json`);
  const historicalMdPath = path.join(outDir, `accessibility-smoke-${stamp}.md`);

  await fs.writeFile(latestJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeMetricsMarkdownFile({
    root,
    targetPath: latestMdPath,
    content: toMarkdown(payload),
  });

  if (shouldWriteHistory) {
    await fs.writeFile(historicalJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await writeMetricsMarkdownFile({
      root,
      targetPath: historicalMdPath,
      content: toMarkdown(payload),
    });
  }

  return {
    latestJson: path.relative(root, latestJsonPath),
    latestMarkdown: path.relative(root, latestMdPath),
    historicalJson: shouldWriteHistory ? path.relative(root, historicalJsonPath) : null,
    historicalMarkdown: shouldWriteHistory ? path.relative(root, historicalMdPath) : null,
  };
};

const buildSummaryJsonSummary = (payload) => ({
  totalSuites: payload.summary.total,
  passedSuites: payload.summary.passed,
  failedSuites: payload.summary.failed,
  actWarnings: payload.summary.actWarnings,
  warningBudget: payload.summary.warningBudget,
  warningBudgetStatus: payload.summary.warningBudgetStatus,
  warningBudgetEnforcement: payload.summary.warningBudgetEnforcement,
  totalDurationMs: payload.summary.totalDurationMs,
});

const run = async () => {
  let initialPlaywrightRuntime = null;
  let playwrightRuntime = null;

  try {
    const results = [];
    for (const suite of suites) {
      if (suite.runner === 'playwright') {
        const previousBaseUrl = playwrightRuntime?.baseUrl ?? null;
        playwrightRuntime = await ensurePlaywrightRuntime(playwrightRuntime);
        initialPlaywrightRuntime ??= playwrightRuntime;

        if (!summaryJson && previousBaseUrl !== playwrightRuntime.baseUrl) {
          console.log(
            `[a11y-smoke] runtime=${formatRuntimeLabel(playwrightRuntime)} baseUrl=${playwrightRuntime.baseUrl} agent=${playwrightRuntime.agentId}`
          );
        }
      }

      const result = await runSuite(suite, playwrightRuntime);
      results.push(result);
      if (!summaryJson) {
        console.log(
          `[a11y-smoke] ${suite.name.padEnd(38, ' ')} ${result.status.toUpperCase().padEnd(4, ' ')} ${formatDuration(result.durationMs)}`
        );
      }

      if (suite.runner === 'playwright' && !shouldReusePlaywrightRuntimeAcrossSuites) {
        await stopManagedPlaywrightRuntime(playwrightRuntime);
        playwrightRuntime = null;
      }
    }

    const summary = {
      total: results.length,
      passed: results.filter((result) => result.status === 'pass').length,
      failed: results.filter((result) => result.status === 'fail').length,
      actWarnings: results.reduce((acc, result) => acc + (result.actWarnings ?? 0), 0),
      warningBudget: Number.isFinite(warningBudget) ? warningBudget : 10,
      warningBudgetStatus: 'ok',
      warningBudgetEnforcement: failOnWarningBudgetExceed ? 'fail-on-exceed' : 'telemetry-only',
      totalDurationMs: results.reduce((acc, result) => acc + result.durationMs, 0),
    };
    summary.warningBudgetStatus =
      summary.actWarnings <= summary.warningBudget ? 'ok' : 'exceeded';

    const payload = {
      generatedAt: new Date().toISOString(),
      strictMode,
      failOnWarningBudgetExceed,
      runtime: {
        source: initialPlaywrightRuntime?.source ?? 'none',
        reused: initialPlaywrightRuntime?.reused ?? false,
        baseUrl: initialPlaywrightRuntime?.baseUrl ?? null,
        agentId: initialPlaywrightRuntime?.agentId ?? null,
        leaseKey: initialPlaywrightRuntime?.leaseKey ?? null,
        strategy: shouldReusePlaywrightRuntimeAcrossSuites ? 'shared' : 'per-playwright-suite',
      },
      summary,
      results,
    };
    const paths = noWrite ? null : await writeArtifacts(payload);
    const exceededWarningBudget = summary.warningBudgetStatus === 'exceeded';
    const status =
      summary.failed > 0 || (failOnWarningBudgetExceed && exceededWarningBudget) ? 'failed' : 'ok';

    if (summaryJson) {
      writeSummaryJson({
        scannerName: 'accessibility-smoke',
        generatedAt: payload.generatedAt,
        status,
        summary: buildSummaryJsonSummary(payload),
        details: {
          runtime: payload.runtime,
          results: payload.results,
        },
        paths,
        filters: {
          strictMode,
          failOnWarningBudgetExceed,
          historyDisabled: !shouldWriteHistory,
          noWrite,
          ci: args.has('--ci'),
          warningBudget: Number.isFinite(warningBudget) ? warningBudget : 10,
        },
        notes: ['accessibility smoke report result'],
      });

      if (strictMode && summary.failed > 0) {
        process.exit(1);
      }

      if (strictMode && failOnWarningBudgetExceed && exceededWarningBudget) {
        process.exit(1);
      }
      return;
    }

    console.log(
      `[a11y-smoke] summary pass=${summary.passed} fail=${summary.failed} total=${summary.total} duration=${formatDuration(summary.totalDurationMs)} actWarnings=${summary.actWarnings} budget=${summary.warningBudget} status=${summary.warningBudgetStatus}`
    );
    if (paths) {
      console.log(`Wrote ${paths.latestJson}`);
      console.log(`Wrote ${paths.latestMarkdown}`);
      if (paths.historicalJson) {
        console.log(`Wrote ${paths.historicalJson}`);
        console.log(`Wrote ${paths.historicalMarkdown}`);
      }
    } else {
      console.log('Skipped writing accessibility smoke artifacts (--no-write).');
    }

    if (strictMode && summary.failed > 0) {
      process.exitCode = 1;
    }

    if (strictMode && failOnWarningBudgetExceed && summary.warningBudgetStatus === 'exceeded') {
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
  console.error('[a11y-smoke] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
