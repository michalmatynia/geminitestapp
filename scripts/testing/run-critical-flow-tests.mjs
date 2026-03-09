import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { writeMetricsMarkdownFile } from '../docs/metrics-frontmatter.mjs';
import { parseCommonCheckArgs, writeSummaryJson } from '../lib/check-cli.mjs';

const args = new Set(process.argv.slice(2));
const { strictMode, shouldWriteHistory, noWrite, summaryJson } = parseCommonCheckArgs();

const root = process.cwd();
const outDir = path.join(root, 'docs', 'metrics');
const MAX_OUTPUT_BYTES = 100_000;

const criticalFlows = [
  {
    id: 'auth-session',
    name: 'Authentication + Session Bootstrap',
    kpi: 'Successful sign-in completion rate',
    tests: ['__tests__/features/auth/pages/signin-page.test.tsx'],
  },
  {
    id: 'products-core-crud',
    name: 'Products CRUD + Listing Refresh',
    kpi: 'Create/edit success rate without retries',
    tests: ['__tests__/features/products/services/getSettingValue.test.ts'],
  },
  {
    id: 'image-studio-generate',
    name: 'Image Studio Generate + Preview',
    kpi: 'Generation completion under timeout budget',
    tests: ['src/features/ai/image-studio/utils/__tests__/studio-settings.test.ts'],
  },
  {
    id: 'ai-paths-runtime',
    name: 'AI Paths Run Execution',
    kpi: 'Run completion without fallback/error path',
    tests: ['__tests__/features/ai/ai-paths/services/path-run-executor.test.ts'],
  },
  {
    id: 'case-resolver-capture',
    name: 'Case Resolver OCR + Capture Mapping',
    kpi: 'Queue-to-review completion without manual recovery',
    tests: ['src/features/case-resolver/__tests__/workspace-persistence.test.ts'],
  },
  {
    id: 'products-trigger-queue-integration',
    name: 'Products Trigger Button Queue Integration',
    kpi: 'Trigger enqueue updates queue state without invalid run-id regressions',
    tests: [
      'src/features/ai/ai-paths/components/__tests__/job-queue-context.enqueue-events.test.tsx',
      'src/shared/contracts/__tests__/ai-paths-run-enqueued-event.contract-runtime.test.ts',
      'src/shared/lib/__tests__/query-invalidation.notify-ai-path-run-enqueued.test.ts',
      'src/shared/lib/__tests__/query-invalidation.optimistically-insert-run.test.ts',
      'src/shared/lib/ai-paths/__tests__/optimistic-run-queue.test.ts',
      'src/shared/lib/ai-paths/api/__tests__/enqueue-client-contract.test.ts',
      'src/features/products/hooks/useProductAiPathsRunSync.test.tsx',
      'src/features/products/state/queued-product-ops.test.ts',
      'src/shared/lib/ai-paths/hooks/trigger-event-selection.test.ts',
      'src/shared/lib/ai-paths/hooks/trigger-event-sanitization.test.ts',
      'src/shared/lib/ai-paths/hooks/trigger-event-utils.test.ts',
      'src/shared/lib/ai-paths/hooks/trigger-event-recovery.test.ts',
      'src/shared/lib/ai-paths/hooks/trigger-event-context.test.ts',
      'src/shared/lib/ai-paths/hooks/trigger-event-invalidation.test.ts',
      'src/shared/lib/ai-paths/hooks/trigger-event-settings.test.ts',
    ],
  },
];

const formatDuration = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '0ms';
  }
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const sec = ms / 1000;
  if (sec < 60) {
    return `${sec.toFixed(1)}s`;
  }
  return `${(sec / 60).toFixed(1)}m`;
};

const runVitestForFlow = (flow) =>
  new Promise((resolve) => {
    const startedAt = Date.now();
    const command = 'npx';
    const commandArgs = ['vitest', 'run', '--project', 'unit', ...flow.tests];

    const child = spawn(command, commandArgs, {
      cwd: root,
      env: {
        ...process.env,
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
      resolve({
        id: flow.id,
        name: flow.name,
        kpi: flow.kpi,
        tests: flow.tests,
        command: [command, ...commandArgs].join(' '),
        status: 'fail',
        exitCode: null,
        durationMs,
        output: `${output}\n${error.stack ?? String(error)}`.trim(),
      });
    });

    child.on('close', (exitCode) => {
      const durationMs = Date.now() - startedAt;
      resolve({
        id: flow.id,
        name: flow.name,
        kpi: flow.kpi,
        tests: flow.tests,
        command: [command, ...commandArgs].join(' '),
        status: exitCode === 0 ? 'pass' : 'fail',
        exitCode,
        durationMs,
        output: output.trim(),
      });
    });
  });

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# Critical Flow Regression Report');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Flows: ${payload.summary.total}`);
  lines.push(`- Passed: ${payload.summary.passed}`);
  lines.push(`- Failed: ${payload.summary.failed}`);
  lines.push('');
  lines.push('## Flow Status');
  lines.push('');
  lines.push('| Flow | KPI | Status | Duration | Exit | Tests |');
  lines.push('| --- | --- | --- | ---: | ---: | --- |');

  for (const result of payload.results) {
    lines.push(
      `| ${result.name} | ${result.kpi} | ${result.status.toUpperCase()} | ${formatDuration(result.durationMs)} | ${result.exitCode ?? '-'} | ${result.tests.map((test) => `\`${test}\``).join(', ')} |`
    );
  }

  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- This suite is intentionally narrow and maps directly to critical user flows.');
  lines.push('- Use `npm run test:critical-flows` for local regression checks and PR validation.');

  return `${lines.join('\n')}\n`;
};

const writeArtifacts = async (payload) => {
  await fs.mkdir(outDir, { recursive: true });
  const stamp = payload.generatedAt.replace(/[:.]/g, '-');

  const latestJsonPath = path.join(outDir, 'critical-flow-tests-latest.json');
  const latestMdPath = path.join(outDir, 'critical-flow-tests-latest.md');
  const historicalJsonPath = path.join(outDir, `critical-flow-tests-${stamp}.json`);
  const historicalMdPath = path.join(outDir, `critical-flow-tests-${stamp}.md`);

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
  totalFlows: payload.summary.total,
  passedFlows: payload.summary.passed,
  failedFlows: payload.summary.failed,
  totalDurationMs: payload.summary.totalDurationMs,
});

const run = async () => {
  const results = [];

  for (const flow of criticalFlows) {
    const result = await runVitestForFlow(flow);
    results.push(result);
    if (!summaryJson) {
      console.log(
        `[critical-flows] ${flow.name.padEnd(46, ' ')} ${result.status.toUpperCase().padEnd(4, ' ')} ${formatDuration(result.durationMs)}`
      );
    }
  }

  const summary = {
    total: results.length,
    passed: results.filter((result) => result.status === 'pass').length,
    failed: results.filter((result) => result.status === 'fail').length,
    totalDurationMs: results.reduce((acc, result) => acc + result.durationMs, 0),
  };

  const payload = {
    generatedAt: new Date().toISOString(),
    strictMode,
    summary,
    results,
  };
  const paths = noWrite ? null : await writeArtifacts(payload);

  if (summaryJson) {
    writeSummaryJson({
      scannerName: 'critical-flow-tests',
      generatedAt: payload.generatedAt,
      status: payload.summary.failed > 0 ? 'failed' : 'ok',
      summary: buildSummaryJsonSummary(payload),
      details: {
        results: payload.results,
      },
      paths,
      filters: {
        strictMode,
        historyDisabled: !shouldWriteHistory,
        noWrite,
        ci: args.has('--ci'),
      },
      notes: ['critical flow regression report result'],
    });

    if (strictMode && summary.failed > 0) {
      process.exit(1);
    }
    return;
  }

  console.log(
    `[critical-flows] summary pass=${summary.passed} fail=${summary.failed} total=${summary.total} duration=${formatDuration(summary.totalDurationMs)}`
  );
  if (paths) {
    console.log(`Wrote ${paths.latestJson}`);
    console.log(`Wrote ${paths.latestMarkdown}`);
    if (paths.historicalJson) {
      console.log(`Wrote ${paths.historicalJson}`);
      console.log(`Wrote ${paths.historicalMarkdown}`);
    }
  } else {
    console.log('Skipped writing critical-flow artifacts (--no-write).');
  }

  if (strictMode && summary.failed > 0) {
    process.exit(1);
  }
};

run().catch((error) => {
  console.error('[critical-flows] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
