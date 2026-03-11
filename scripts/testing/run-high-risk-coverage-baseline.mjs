import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { parseCommonCheckArgs, writeSummaryJson } from '../lib/check-cli.mjs';
import {
  buildHighRiskCoverageVitestArgs,
  collectHighRiskCoverageTestFiles,
  highRiskCoverageDomains,
  HIGH_RISK_COVERAGE_SUMMARY_PATH,
  mergeHighRiskCoverageSummaries,
} from './lib/high-risk-coverage-baseline.mjs';

const args = process.argv.slice(2);
const { strictMode, summaryJson } = parseCommonCheckArgs(args);
const root = process.cwd();
const MAX_OUTPUT_BYTES = 160_000;
const DEFAULT_COVERAGE_CONCURRENCY = 2;

const parseCoverageConcurrency = (value) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_COVERAGE_CONCURRENCY;
};

const coverageConcurrency = parseCoverageConcurrency(process.env.HIGH_RISK_COVERAGE_CONCURRENCY);

const runCommand = ({ command, commandArgs, env }) =>
  new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(command, commandArgs, {
      cwd: root,
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        ...env,
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
      resolve({
        command: [command, ...commandArgs].join(' '),
        status: 'fail',
        exitCode: null,
        durationMs: Date.now() - startedAt,
        output: `${output}\n${error.stack ?? String(error)}`.trim(),
      });
    });

    child.on('close', (exitCode) => {
      resolve({
        command: [command, ...commandArgs].join(' '),
        status: exitCode === 0 ? 'pass' : 'fail',
        exitCode,
        durationMs: Date.now() - startedAt,
        output: output.trim(),
      });
    });
  });

const run = async () => {
  const coverageSummaryAbsolutePath = path.join(root, HIGH_RISK_COVERAGE_SUMMARY_PATH);
  const coverageReportsAbsolutePath = path.dirname(coverageSummaryAbsolutePath);
  fs.rmSync(coverageReportsAbsolutePath, { force: true, recursive: true });

  const coverageDomains = highRiskCoverageDomains
    .map((domain) => ({
      ...domain,
      testFiles: collectHighRiskCoverageTestFiles({ root, testRoots: domain.testRoots }),
    }))
    .filter((domain) => domain.testFiles.length > 0);

  if (coverageDomains.length === 0) {
    console.error('[high-risk-coverage-baseline] no high-risk test files were discovered');
    process.exit(1);
  }

  if (!summaryJson) {
    const discoveredFileCount = coverageDomains.reduce(
      (count, domain) => count + domain.testFiles.length,
      0
    );
    console.log(
      `[high-risk-coverage-baseline] discovered ${discoveredFileCount} test files across ${coverageDomains.length} domains (concurrency ${coverageConcurrency})`
    );
  }

  const runCoverageDomain = async (domain) => {
    const coverageRun = await runCommand({
      command: 'npx',
      commandArgs: buildHighRiskCoverageVitestArgs({
        root,
        reportsDirectory: domain.reportsDirectory,
        coverageIncludeGlobs: domain.coverageIncludeGlobs,
        testFiles: domain.testFiles,
      }),
    });

    const result = {
      ...coverageRun,
      id: domain.id,
      label: domain.label,
      reportsDirectory: domain.reportsDirectory,
      coverageIncludeGlobs: domain.coverageIncludeGlobs,
      discoveredTestFileCount: domain.testFiles.length,
      coverageSummaryPath: `${domain.reportsDirectory}/coverage-summary.json`,
    };

    if (!summaryJson) {
      console.log(
        `[high-risk-coverage-baseline] ${domain.id} ${coverageRun.status.toUpperCase()} ${coverageRun.durationMs}ms`
      );
    }

    return result;
  };

  const coverageRuns = new Array(coverageDomains.length);
  let nextDomainIndex = 0;
  let shouldStopScheduling = false;

  const runWorker = async () => {
    while (!shouldStopScheduling) {
      const domainIndex = nextDomainIndex;
      nextDomainIndex += 1;
      if (domainIndex >= coverageDomains.length) {
        return;
      }

      const coverageRun = await runCoverageDomain(coverageDomains[domainIndex]);
      coverageRuns[domainIndex] = coverageRun;
      if (coverageRun.status !== 'pass') {
        shouldStopScheduling = true;
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(coverageConcurrency, coverageDomains.length) }, () => runWorker())
  );

  const failedCoverageRun = coverageRuns.find((coverageRun) => coverageRun && coverageRun.status !== 'pass');
  if (failedCoverageRun) {
    process.exit(failedCoverageRun.exitCode ?? 1);
  }

  const mergedCoverageSummary = mergeHighRiskCoverageSummaries({
    root,
    summaryPaths: coverageRuns.map((coverageRun) => coverageRun.coverageSummaryPath),
  });
  fs.mkdirSync(coverageReportsAbsolutePath, { recursive: true });
  fs.writeFileSync(coverageSummaryAbsolutePath, `${JSON.stringify(mergedCoverageSummary, null, 2)}\n`, 'utf8');

  const totalCoverageDurationMs = coverageRuns.reduce(
    (total, coverageRun) => total + coverageRun.durationMs,
    0
  );
  const discoveredTestFileCount = coverageRuns.reduce(
    (count, coverageRun) => count + coverageRun.discoveredTestFileCount,
    0
  );

  const checkArgs = ['scripts/quality/check-high-risk-coverage.mjs'];
  if (strictMode) {
    checkArgs.push('--strict');
  }
  if (summaryJson) {
    checkArgs.push('--summary-json');
    checkArgs.push('--no-write');
  }

  const checkRun = await runCommand({
    command: 'node',
    commandArgs: checkArgs,
    env: {
      COVERAGE_SUMMARY_PATH: HIGH_RISK_COVERAGE_SUMMARY_PATH,
    },
  });

  if (summaryJson) {
    writeSummaryJson({
      scannerName: 'high-risk-coverage-baseline',
      generatedAt: new Date().toISOString(),
      status:
        coverageRuns.some((coverageRun) => coverageRun.status === 'fail') || checkRun.status === 'fail'
          ? 'failed'
          : checkRun.status === 'pass'
            ? 'ok'
            : 'warn',
      summary: {
        coverageRunStatus: coverageRuns.every((coverageRun) => coverageRun.status === 'pass')
          ? 'pass'
          : 'fail',
        coverageRunExitCode:
          coverageRuns.find((coverageRun) => coverageRun.status !== 'pass')?.exitCode ?? 0,
        coverageRunDurationMs: totalCoverageDurationMs,
        coverageRunCount: coverageRuns.length,
        coverageRunConcurrency: coverageConcurrency,
        discoveredTestFileCount,
        checkRunStatus: checkRun.status,
        checkRunExitCode: checkRun.exitCode,
        checkRunDurationMs: checkRun.durationMs,
      },
      details: {
        coverageRuns,
        checkRun: {
          ...checkRun,
          coverageSummaryPath: HIGH_RISK_COVERAGE_SUMMARY_PATH,
        },
      },
      filters: {
        coverageRunCount: coverageRuns.length,
        coverageRunConcurrency: coverageConcurrency,
        discoveredTestFileCount,
        strictMode,
        summaryJson: true,
      },
      notes: ['high-risk coverage baseline result'],
    });
  } else {
    console.log(
      `[high-risk-coverage-baseline] check ${checkRun.status.toUpperCase()} ${checkRun.durationMs}ms`
    );
  }

  if (checkRun.status === 'fail') {
    process.exit(checkRun.exitCode ?? 1);
  }
};

run().catch((error) => {
  console.error('[high-risk-coverage-baseline] failed');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
