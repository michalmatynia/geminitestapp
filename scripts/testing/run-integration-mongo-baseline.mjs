import path from 'node:path';
import { spawn } from 'node:child_process';

import { parseCommonCheckArgs, writeSummaryJson } from '../lib/check-cli.mjs';
import {
  buildIntegrationBaselinePayload,
  writeIntegrationBaselineArtifacts,
} from './lib/integration-baseline-report.mjs';

const argv = process.argv.slice(2);
const args = new Set(argv);
const { strictMode, shouldWriteHistory, noWrite, summaryJson } = parseCommonCheckArgs(argv);

const root = process.cwd();
const outDir = path.join(root, 'docs', 'metrics');

const step = {
  id: 'integration-mongo-vitest',
  name: 'Vitest integration-mongo project',
  command: './node_modules/.bin/vitest',
  args: ['run', '--project', 'integration-mongo'],
};

const runStep = () =>
  new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(step.command, step.args, {
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
      if (output.length > 120_000) {
        output = output.slice(-120_000);
      }
    };

    child.stdout?.on('data', append);
    child.stderr?.on('data', append);

    child.on('error', (error) => {
      resolve({
        ...step,
        command: [step.command, ...step.args].join(' '),
        status: 'fail',
        exitCode: null,
        durationMs: Date.now() - startedAt,
        output: `${output}\n${error.stack ?? String(error)}`.trim(),
      });
    });

    child.on('close', (exitCode) => {
      resolve({
        ...step,
        command: [step.command, ...step.args].join(' '),
        status: exitCode === 0 ? 'pass' : 'fail',
        exitCode,
        durationMs: Date.now() - startedAt,
        output: output.trim(),
      });
    });
  });

const run = async () => {
  const stepResult = await runStep();
  if (!summaryJson) {
    console.log(
      `[integration-mongo] ${step.name.padEnd(32, ' ')} ${stepResult.status.toUpperCase().padEnd(4, ' ')} ${stepResult.durationMs}ms`
    );
  }

  const payload = buildIntegrationBaselinePayload({
    generatedAt: new Date().toISOString(),
    strictMode,
    suiteId: 'integration-mongo',
    suiteName: 'Mongo Integration Project',
    project: 'integration-mongo',
    steps: [stepResult],
  });

  const paths = noWrite
    ? null
    : await writeIntegrationBaselineArtifacts({
        root,
        outDir,
        artifactBaseName: 'integration-mongo',
        payload,
        title: 'Mongo Integration Baseline',
        shouldWriteHistory,
        notes: [
          'Runs the Vitest integration-mongo project under the current Mongo service environment.',
          'This artifact is intended for CI and weekly testing-quality baselines.',
        ],
      });

  if (summaryJson) {
    writeSummaryJson({
      scannerName: 'integration-mongo-baseline',
      generatedAt: payload.generatedAt,
      status: payload.summary.failed > 0 ? 'failed' : 'ok',
      summary: {
        totalSuites: payload.summary.total,
        passedSuites: payload.summary.passed,
        failedSuites: payload.summary.failed,
        totalDurationMs: payload.summary.totalDurationMs,
      },
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
      notes: ['mongo integration baseline result'],
    });
    if (strictMode && payload.summary.failed > 0) {
      process.exit(1);
    }
    return;
  }

  console.log(
    `[integration-mongo] summary pass=${payload.summary.passed} fail=${payload.summary.failed} duration=${payload.summary.totalDurationMs}ms`
  );
  if (paths) {
    console.log(`Wrote ${paths.latestJson}`);
    console.log(`Wrote ${paths.latestMarkdown}`);
  } else {
    console.log('Skipped writing integration Mongo artifacts (--no-write).');
  }

  if (strictMode && payload.summary.failed > 0) {
    process.exit(1);
  }
};

run().catch((error) => {
  console.error('[integration-mongo] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
