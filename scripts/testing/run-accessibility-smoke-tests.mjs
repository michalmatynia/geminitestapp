import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const strictMode = args.has('--strict');
const shouldWriteHistory = !args.has('--ci') && !args.has('--no-history');
const warningBudgetArg = [...args].find((arg) => arg.startsWith('--warning-budget='));
const warningBudget = Number.parseInt(warningBudgetArg?.split('=')[1] ?? '10', 10);

const root = process.cwd();
const outDir = path.join(root, 'docs', 'metrics');
const MAX_OUTPUT_BYTES = 100_000;

const suites = [
  {
    id: 'auth-signin-a11y',
    name: 'Auth Sign-In Accessibility',
    tests: ['__tests__/features/auth/pages/signin-page.test.tsx'],
  },
  {
    id: 'products-edit-a11y',
    name: 'Products Edit Form Accessibility',
    tests: ['__tests__/features/products/pages/product-edit-page.test.tsx'],
  },
  {
    id: 'image-studio-a11y',
    name: 'Image Studio UI Accessibility',
    tests: ['src/features/ai/image-studio/components/__tests__/ImageStudioAnalysisTab.apply-intent.test.tsx'],
  },
  {
    id: 'ai-paths-a11y',
    name: 'AI Paths Canvas Accessibility',
    tests: ['src/features/ai/ai-paths/components/__tests__/AiPathsRuntimeAnalysis.test.tsx'],
  },
  {
    id: 'case-resolver-a11y',
    name: 'Case Resolver Header Accessibility',
    tests: ['src/features/case-resolver/__tests__/case-resolver-tree-header.test.tsx'],
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

const runSuite = (suite) =>
  new Promise((resolve) => {
    const startedAt = Date.now();
    const command = 'npx';
    const commandArgs = ['vitest', 'run', '--project', 'unit', ...suite.tests];

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
      const resolvedOutput = `${output}\n${error.stack ?? String(error)}`.trim();
      resolve({
        id: suite.id,
        name: suite.name,
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
  lines.push('');
  lines.push('## Suite Status');
  lines.push('');
  lines.push('| Suite | Status | Duration | Exit | Tests |');
  lines.push('| --- | --- | ---: | ---: | --- |');
  for (const result of payload.results) {
    lines.push(
      `| ${result.name} | ${result.status.toUpperCase()} | ${formatDuration(result.durationMs)} | ${result.exitCode ?? '-'} | ${result.tests.map((test) => `\`${test}\``).join(', ')} |`
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
  lines.push('- This smoke suite tracks keyboard/focus/label accessibility checks across critical user flows.');
  lines.push('- Run `npm run test:accessibility-smoke` before UI-facing changes.');
  lines.push('- React act warnings are tracked as non-failing telemetry for accessibility test hygiene.');
  return `${lines.join('\n')}\n`;
};

const run = async () => {
  const results = [];
  for (const suite of suites) {
    const result = await runSuite(suite);
    results.push(result);
    console.log(
      `[a11y-smoke] ${suite.name.padEnd(38, ' ')} ${result.status.toUpperCase().padEnd(4, ' ')} ${formatDuration(result.durationMs)}`
    );
  }

  const summary = {
    total: results.length,
    passed: results.filter((result) => result.status === 'pass').length,
    failed: results.filter((result) => result.status === 'fail').length,
    actWarnings: results.reduce((acc, result) => acc + (result.actWarnings ?? 0), 0),
    warningBudget: Number.isFinite(warningBudget) ? warningBudget : 10,
    warningBudgetStatus: 'ok',
  };
  summary.warningBudgetStatus =
    summary.actWarnings <= summary.warningBudget ? 'ok' : 'exceeded';

  const payload = {
    generatedAt: new Date().toISOString(),
    strictMode,
    summary,
    results,
  };

  await fs.mkdir(outDir, { recursive: true });
  const stamp = payload.generatedAt.replace(/[:.]/g, '-');

  const latestJsonPath = path.join(outDir, 'accessibility-smoke-latest.json');
  const latestMdPath = path.join(outDir, 'accessibility-smoke-latest.md');
  const historicalJsonPath = path.join(outDir, `accessibility-smoke-${stamp}.json`);
  const historicalMdPath = path.join(outDir, `accessibility-smoke-${stamp}.md`);

  await fs.writeFile(latestJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await fs.writeFile(latestMdPath, toMarkdown(payload), 'utf8');

  if (shouldWriteHistory) {
    await fs.writeFile(historicalJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await fs.writeFile(historicalMdPath, toMarkdown(payload), 'utf8');
  }

  console.log(
    `[a11y-smoke] summary pass=${summary.passed} fail=${summary.failed} total=${summary.total} actWarnings=${summary.actWarnings} budget=${summary.warningBudget} status=${summary.warningBudgetStatus}`
  );
  console.log(`Wrote ${path.relative(root, latestJsonPath)}`);
  console.log(`Wrote ${path.relative(root, latestMdPath)}`);
  if (shouldWriteHistory) {
    console.log(`Wrote ${path.relative(root, historicalJsonPath)}`);
    console.log(`Wrote ${path.relative(root, historicalMdPath)}`);
  }

  if (strictMode && summary.failed > 0) {
    process.exit(1);
  }
};

run().catch((error) => {
  console.error('[a11y-smoke] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
