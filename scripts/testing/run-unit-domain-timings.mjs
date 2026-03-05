import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const strictMode = args.has('--strict');
const shouldWriteHistory = !args.has('--ci') && !args.has('--no-history');

const root = process.cwd();
const outDir = path.join(root, 'docs', 'metrics');
const MAX_OUTPUT_BYTES = 160_000;

const domains = [
  {
    id: 'auth',
    name: 'Auth',
    filters: ['__tests__/features/auth', '__tests__/api/auth', 'src/features/auth'],
  },
  {
    id: 'products',
    name: 'Products',
    filters: [
      '__tests__/features/products',
      '__tests__/api/products',
      'src/features/products',
      '__tests__/shared/contracts/products-contracts.test.ts',
    ],
  },
  {
    id: 'ai-paths',
    name: 'AI Paths',
    filters: [
      '__tests__/features/ai/ai-paths',
      '__tests__/api/ai-paths',
      '__tests__/api/ai-paths-',
      'src/features/ai/ai-paths',
    ],
  },
  {
    id: 'image-studio',
    name: 'Image Studio',
    filters: ['__tests__/features/ai/image-studio', 'src/features/ai/image-studio'],
  },
  {
    id: 'case-resolver',
    name: 'Case Resolver',
    filters: [
      'src/features/case-resolver',
      'src/features/case-resolver-capture',
      '__tests__/features/case-resolver-capture',
      'src/features/prompt-exploder/__tests__/case-resolver',
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

const runDomainSuite = (domain) =>
  new Promise((resolve) => {
    const startedAt = Date.now();
    const command = 'npx';
    const commandArgs = ['vitest', 'run', '--project', 'unit', ...domain.filters];

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
        id: domain.id,
        name: domain.name,
        filters: domain.filters,
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
        id: domain.id,
        name: domain.name,
        filters: domain.filters,
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
  lines.push('# Unit Domain Timings Report');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Domains: ${payload.summary.total}`);
  lines.push(`- Passed: ${payload.summary.passed}`);
  lines.push(`- Failed: ${payload.summary.failed}`);
  lines.push(`- Total duration: ${formatDuration(payload.summary.totalDurationMs)}`);
  lines.push('');
  lines.push('## Domain Status');
  lines.push('');
  lines.push('| Domain | Status | Duration | Exit |');
  lines.push('| --- | --- | ---: | ---: |');
  for (const result of payload.results) {
    lines.push(
      `| ${result.name} | ${result.status.toUpperCase()} | ${formatDuration(result.durationMs)} | ${result.exitCode ?? '-'} |`
    );
  }
  lines.push('');
  lines.push('## Domain Filters');
  lines.push('');
  for (const result of payload.results) {
    lines.push(`### ${result.name}`);
    lines.push('');
    for (const filter of result.filters) {
      lines.push(`- \`${filter}\``);
    }
    lines.push('');
  }
  lines.push('## Notes');
  lines.push('');
  lines.push('- Each domain executes independently to expose timing hotspots and isolate regressions.');
  lines.push('- Use `npm run test:unit:domains` locally and strict mode in CI for a deterministic quality gate.');
  return `${lines.join('\n')}\n`;
};

const run = async () => {
  const results = [];

  for (const domain of domains) {
    const result = await runDomainSuite(domain);
    results.push(result);
    console.log(
      `[unit-domains] ${domain.name.padEnd(15, ' ')} ${result.status.toUpperCase().padEnd(4, ' ')} ${formatDuration(result.durationMs)}`
    );
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

  await fs.mkdir(outDir, { recursive: true });
  const stamp = payload.generatedAt.replace(/[:.]/g, '-');

  const latestJsonPath = path.join(outDir, 'unit-domain-timings-latest.json');
  const latestMdPath = path.join(outDir, 'unit-domain-timings-latest.md');
  const historicalJsonPath = path.join(outDir, `unit-domain-timings-${stamp}.json`);
  const historicalMdPath = path.join(outDir, `unit-domain-timings-${stamp}.md`);

  await fs.writeFile(latestJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await fs.writeFile(latestMdPath, toMarkdown(payload), 'utf8');

  if (shouldWriteHistory) {
    await fs.writeFile(historicalJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await fs.writeFile(historicalMdPath, toMarkdown(payload), 'utf8');
  }

  console.log(
    `[unit-domains] summary pass=${summary.passed} fail=${summary.failed} total=${summary.total} duration=${formatDuration(summary.totalDurationMs)}`
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
  console.error('[unit-domains] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
