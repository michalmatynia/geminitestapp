import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { writeMetricsMarkdownFile } from '../docs/metrics-frontmatter.mjs';

const args = new Set(process.argv.slice(2));
const strictMode = args.has('--strict');
const includeTestProbes = args.has('--include-test-probes');
const includeTestTree = args.has('--include-test-tree');
const shouldWriteHistory = !args.has('--ci') && !args.has('--no-history');

const root = process.cwd();
const outDir = path.join(root, 'docs', 'metrics');

const MAX_OUTPUT_BYTES = 120_000;
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

const domains = [
  {
    id: 'auth',
    name: 'Auth',
    targets: ['src/features/auth', 'src/app/api/auth'],
    testTreeTargets: ['__tests__/features/auth', 'src/features/auth/__tests__'],
    testProbes: ['__tests__/features/auth/pages/signin-page.test.tsx'],
  },
  {
    id: 'products',
    name: 'Products',
    targets: ['src/features/products', 'src/app/api/v2/products'],
    testTreeTargets: ['__tests__/features/products', 'src/features/products/__tests__'],
    testProbes: ['__tests__/features/products/pages/product-edit-page.test.tsx'],
  },
  {
    id: 'ai-paths',
    name: 'AI Paths',
    targets: ['src/features/ai/ai-paths', 'src/app/api/ai-paths'],
    testTreeTargets: ['src/features/ai/ai-paths/__tests__', 'src/features/ai/ai-paths/components/__tests__'],
    testProbes: ['src/features/ai/ai-paths/components/__tests__/AiPathsRuntimeAnalysis.test.tsx'],
  },
  {
    id: 'image-studio',
    name: 'Image Studio',
    targets: ['src/features/ai/image-studio', 'src/app/api/image-studio'],
    testTreeTargets: ['src/features/ai/image-studio/__tests__', 'src/features/ai/image-studio/components/__tests__'],
    testProbes: ['src/features/ai/image-studio/components/__tests__/ImageStudioAnalysisTab.apply-intent.test.tsx'],
  },
  {
    id: 'case-resolver',
    name: 'Case Resolver',
    targets: ['src/features/case-resolver', 'src/features/case-resolver-capture', 'src/app/api/case-resolver'],
    testTreeTargets: ['src/features/case-resolver/__tests__', 'src/features/case-resolver-capture/__tests__'],
    testProbes: ['src/features/case-resolver/__tests__/case-resolver-tree-header.test.tsx'],
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

const existingTargets = async (targets) => {
  const values = [];
  for (const relPath of targets) {
    try {
      await fs.access(path.join(root, relPath));
      values.push(relPath);
    } catch {
      // Missing target is expected in mixed branches.
    }
  }
  return values;
};

const runLintDomain = async (domain) => {
  const targets = await existingTargets(domain.targets);
  const testTreeTargets = includeTestTree
    ? await existingTargets(Array.isArray(domain.testTreeTargets) ? domain.testTreeTargets : [])
    : [];
  const testProbeTargets = includeTestProbes
    ? await existingTargets(Array.isArray(domain.testProbes) ? domain.testProbes : [])
    : [];
  const commandTargets = [...new Set([...targets, ...testTreeTargets, ...testProbeTargets])];
  if (commandTargets.length === 0) {
    return {
      id: domain.id,
      name: domain.name,
      targets: domain.targets,
      resolvedTargets: [],
      resolvedTestTreeTargets: [],
      resolvedTestProbes: [],
      command: null,
      status: 'skipped',
      exitCode: null,
      durationMs: 0,
      output: 'No matching targets found in this workspace.',
    };
  }

  return new Promise((resolve) => {
    const startedAt = Date.now();
    const command = 'npx';
    const commandArgs = ['eslint', '--no-warn-ignored', ...commandTargets];
    const child = spawn(command, commandArgs, {
      cwd: root,
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        ...(includeTestTree ? { ESLINT_INCLUDE_TESTS: '1' } : {}),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    let completed = false;
    let timedOut = false;

    const append = (chunk) => {
      output += chunk.toString();
      if (output.length > MAX_OUTPUT_BYTES) {
        output = output.slice(-MAX_OUTPUT_BYTES);
      }
    };

    child.stdout?.on('data', append);
    child.stderr?.on('data', append);

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!completed) {
          child.kill('SIGKILL');
        }
      }, 5000);
    }, DEFAULT_TIMEOUT_MS);

    child.on('error', (error) => {
      completed = true;
      clearTimeout(timer);
      const durationMs = Date.now() - startedAt;
      resolve({
        id: domain.id,
        name: domain.name,
        targets: domain.targets,
        resolvedTargets: targets,
        resolvedTestTreeTargets: testTreeTargets,
        resolvedTestProbes: testProbeTargets,
        command: [command, ...commandArgs].join(' '),
        status: 'fail',
        exitCode: null,
        durationMs,
        output: `${output}\n${error.stack ?? String(error)}`.trim(),
      });
    });

    child.on('close', (exitCode) => {
      completed = true;
      clearTimeout(timer);
      const durationMs = Date.now() - startedAt;
      resolve({
        id: domain.id,
        name: domain.name,
        targets: domain.targets,
        resolvedTargets: targets,
        resolvedTestTreeTargets: testTreeTargets,
        resolvedTestProbes: testProbeTargets,
        command: [command, ...commandArgs].join(' '),
        status: timedOut ? 'timeout' : exitCode === 0 ? 'pass' : 'fail',
        exitCode,
        durationMs,
        output: output.trim(),
      });
    });
  });
};

const toMarkdown = (payload) => {
  const lines = [];
  lines.push('# Lint Domain Checks Report');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Domains: ${payload.summary.total}`);
  lines.push(`- Passed: ${payload.summary.passed}`);
  lines.push(`- Failed: ${payload.summary.failed}`);
  lines.push(`- Timed out: ${payload.summary.timedOut}`);
  lines.push(`- Skipped: ${payload.summary.skipped}`);
  lines.push(`- Total duration: ${formatDuration(payload.summary.totalDurationMs)}`);
  lines.push(`- Include test probes: ${payload.includeTestProbes ? 'yes' : 'no'}`);
  lines.push(`- Include test tree: ${payload.includeTestTree ? 'yes' : 'no'}`);
  lines.push('');
  lines.push('## Domain Status');
  lines.push('');
  lines.push('| Domain | Status | Duration | Exit | Targets | Test Trees | Test Probes |');
  lines.push('| --- | --- | ---: | ---: | --- | --- | --- |');
  for (const result of payload.results) {
    lines.push(
      `| ${result.name} | ${result.status.toUpperCase()} | ${formatDuration(result.durationMs)} | ${result.exitCode ?? '-'} | ${result.resolvedTargets.map((target) => `\`${target}\``).join(', ') || '-' } | ${result.resolvedTestTreeTargets.map((target) => `\`${target}\``).join(', ') || '-'} | ${result.resolvedTestProbes.map((target) => `\`${target}\``).join(', ') || '-'} |`
    );
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- Chunked lint checks reduce long single-run bottlenecks and isolate failing domains.');
  lines.push('- Run `node scripts/quality/run-lint-domain-checks.mjs --strict` in CI-style enforcement mode.');
  lines.push('- Test probes run with `--no-warn-ignored`; if a probe is ignored by ESLint config, it will not emit lint signal.');
  lines.push('- Full test-tree mode sets `ESLINT_INCLUDE_TESTS=1` to opt test files into ESLint scope.');
  return `${lines.join('\n')}\n`;
};

const run = async () => {
  const results = [];
  for (const domain of domains) {
    const result = await runLintDomain(domain);
    results.push(result);
    console.log(
      `[lint-domains] ${domain.name.padEnd(13, ' ')} ${result.status.toUpperCase().padEnd(7, ' ')} ${formatDuration(result.durationMs)}`
    );
  }

  const summary = {
    total: results.length,
    passed: results.filter((result) => result.status === 'pass').length,
    failed: results.filter((result) => result.status === 'fail').length,
    timedOut: results.filter((result) => result.status === 'timeout').length,
    skipped: results.filter((result) => result.status === 'skipped').length,
    totalDurationMs: results.reduce((acc, result) => acc + result.durationMs, 0),
  };

  const payload = {
    generatedAt: new Date().toISOString(),
    strictMode,
    includeTestProbes,
    includeTestTree,
    summary,
    results,
  };
  const reviewDate = payload.generatedAt.slice(0, 10);

  await fs.mkdir(outDir, { recursive: true });
  const stamp = payload.generatedAt.replace(/[:.]/g, '-');

  const latestJsonPath = path.join(outDir, 'lint-domain-checks-latest.json');
  const latestMdPath = path.join(outDir, 'lint-domain-checks-latest.md');
  const historicalJsonPath = path.join(outDir, `lint-domain-checks-${stamp}.json`);
  const historicalMdPath = path.join(outDir, `lint-domain-checks-${stamp}.md`);

  await fs.writeFile(latestJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeMetricsMarkdownFile({
    root,
    targetPath: latestMdPath,
    content: toMarkdown(payload),
    reviewDate,
  });

  if (shouldWriteHistory) {
    await fs.writeFile(historicalJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await writeMetricsMarkdownFile({
      root,
      targetPath: historicalMdPath,
      content: toMarkdown(payload),
      reviewDate,
    });
  }

  console.log(
    `[lint-domains] summary pass=${summary.passed} fail=${summary.failed} timeout=${summary.timedOut} skipped=${summary.skipped}`
  );
  console.log(`Wrote ${path.relative(root, latestJsonPath)}`);
  console.log(`Wrote ${path.relative(root, latestMdPath)}`);
  if (shouldWriteHistory) {
    console.log(`Wrote ${path.relative(root, historicalJsonPath)}`);
    console.log(`Wrote ${path.relative(root, historicalMdPath)}`);
  }

  if (strictMode && (summary.failed > 0 || summary.timedOut > 0)) {
    process.exit(1);
  }
};

run().catch((error) => {
  console.error('[lint-domains] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
