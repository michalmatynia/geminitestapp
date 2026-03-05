import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const strictMode = args.has('--strict');
const shouldWriteHistory = !args.has('--ci') && !args.has('--no-history');

const root = process.cwd();
const outDir = path.join(root, 'docs', 'metrics');
const MAX_OUTPUT_BYTES = 100_000;

const suites = [
  {
    id: 'auth-security',
    name: 'Auth Security Policy',
    tests: ['__tests__/features/auth/utils/auth-security.test.ts'],
  },
  {
    id: 'auth-encryption',
    name: 'Auth Encryption',
    tests: ['__tests__/features/auth/utils/auth-encryption.test.ts'],
  },
  {
    id: 'auth-verify-credentials',
    name: 'Auth Verify Credentials API',
    tests: ['__tests__/features/auth/api/verify-credentials.test.ts'],
  },
  {
    id: 'rate-limit',
    name: 'AI Paths Access Rate Limit',
    tests: ['src/features/ai/ai-paths/server/__tests__/access.rate-limit.test.ts'],
  },
  {
    id: 'log-redaction',
    name: 'Observability Log Redaction',
    tests: ['__tests__/shared/lib/observability/log-redaction.test.ts'],
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
      resolve({
        id: suite.id,
        name: suite.name,
        tests: suite.tests,
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
        id: suite.id,
        name: suite.name,
        tests: suite.tests,
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
  lines.push('# Security Smoke Report');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Suites: ${payload.summary.total}`);
  lines.push(`- Passed: ${payload.summary.passed}`);
  lines.push(`- Failed: ${payload.summary.failed}`);
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
  lines.push('## Notes');
  lines.push('');
  lines.push('- This smoke gate covers auth hardening, API credential checks, rate limiting, and log redaction.');
  lines.push('- Run `npm run test:security-smoke` locally before security-sensitive changes.');
  return `${lines.join('\n')}\n`;
};

const run = async () => {
  const results = [];
  for (const suite of suites) {
    const result = await runSuite(suite);
    results.push(result);
    console.log(
      `[security-smoke] ${suite.name.padEnd(36, ' ')} ${result.status.toUpperCase().padEnd(4, ' ')} ${formatDuration(result.durationMs)}`
    );
  }

  const summary = {
    total: results.length,
    passed: results.filter((result) => result.status === 'pass').length,
    failed: results.filter((result) => result.status === 'fail').length,
  };

  const payload = {
    generatedAt: new Date().toISOString(),
    strictMode,
    summary,
    results,
  };

  await fs.mkdir(outDir, { recursive: true });
  const stamp = payload.generatedAt.replace(/[:.]/g, '-');

  const latestJsonPath = path.join(outDir, 'security-smoke-latest.json');
  const latestMdPath = path.join(outDir, 'security-smoke-latest.md');
  const historicalJsonPath = path.join(outDir, `security-smoke-${stamp}.json`);
  const historicalMdPath = path.join(outDir, `security-smoke-${stamp}.md`);

  await fs.writeFile(latestJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await fs.writeFile(latestMdPath, toMarkdown(payload), 'utf8');

  if (shouldWriteHistory) {
    await fs.writeFile(historicalJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await fs.writeFile(historicalMdPath, toMarkdown(payload), 'utf8');
  }

  console.log(
    `[security-smoke] summary pass=${summary.passed} fail=${summary.failed} total=${summary.total}`
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
  console.error('[security-smoke] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
