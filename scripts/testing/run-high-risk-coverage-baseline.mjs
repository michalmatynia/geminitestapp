import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { parseCommonCheckArgs, writeSummaryJson } from '../lib/check-cli.mjs';
import {
  buildHighRiskCoverageMergeArgs,
  buildHighRiskCoverageVitestArgs,
  collectHighRiskCoverageTestFiles,
  highRiskCoverageDomains,
  HIGH_RISK_COVERAGE_BLOB_REPORTS_DIRECTORY,
  HIGH_RISK_COVERAGE_SUMMARY_PATH,
  selectHighRiskCoverageDomains,
} from './lib/high-risk-coverage-baseline.mjs';

const args = process.argv.slice(2);
const { strictMode, summaryJson } = parseCommonCheckArgs(args);
const root = process.cwd();
const MAX_OUTPUT_BYTES = 160_000;
const DEFAULT_COVERAGE_CONCURRENCY = 2;
const DEFAULT_DOMAIN_SHARD_CONCURRENCY = 2;

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const coverageConcurrency = parsePositiveInteger(
  process.env.HIGH_RISK_COVERAGE_CONCURRENCY,
  DEFAULT_COVERAGE_CONCURRENCY
);
const domainShardConcurrency = parsePositiveInteger(
  process.env.HIGH_RISK_COVERAGE_SHARD_CONCURRENCY,
  DEFAULT_DOMAIN_SHARD_CONCURRENCY
);
const selectedTargetIds = String(process.env.HIGH_RISK_COVERAGE_TARGETS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const resolveShardCount = (domain) =>
  parsePositiveInteger(
    process.env.HIGH_RISK_COVERAGE_SHARD_COUNT,
    Number.isFinite(domain.defaultShardCount) ? domain.defaultShardCount : 1
  );

const resolveShardMaxWorkers = (shardConcurrency) => {
  const explicit = String(process.env.HIGH_RISK_COVERAGE_SHARD_MAX_WORKERS ?? '').trim();
  if (explicit.length > 0) {
    return explicit;
  }

  if (shardConcurrency <= 1) {
    return null;
  }

  return `${Math.max(1, Math.floor(100 / shardConcurrency))}%`;
};

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
  const coverageBlobReportsAbsolutePath = path.join(root, HIGH_RISK_COVERAGE_BLOB_REPORTS_DIRECTORY);
  const selectedDomains = selectHighRiskCoverageDomains({
    domains: highRiskCoverageDomains,
    ids: selectedTargetIds,
  });

  if (selectedTargetIds.length === 0) {
    fs.rmSync(coverageReportsAbsolutePath, { force: true, recursive: true });
    fs.rmSync(coverageBlobReportsAbsolutePath, { force: true, recursive: true });
  } else {
    fs.rmSync(coverageSummaryAbsolutePath, { force: true });
    for (const domain of selectedDomains) {
      fs.rmSync(path.join(root, domain.reportsDirectory), { force: true, recursive: true });
      fs.rmSync(path.join(root, `${domain.reportsDirectory}-shards`), {
        force: true,
        recursive: true,
      });
      fs.rmSync(path.join(root, HIGH_RISK_COVERAGE_BLOB_REPORTS_DIRECTORY, domain.id), {
        force: true,
        recursive: true,
      });
    }
  }

  const coverageDomains = selectedDomains
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
    const coverageSummaryPath = `${domain.reportsDirectory}/coverage-summary.json`;
    const shardCount = resolveShardCount(domain);

    if (shardCount <= 1) {
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
        coverageSummaryPath,
        shardCount: 1,
      };

      if (!summaryJson) {
        console.log(
          `[high-risk-coverage-baseline] ${domain.id} ${coverageRun.status.toUpperCase()} ${coverageRun.durationMs}ms`
        );
      }

      return result;
    }

    const blobDirectory = `${HIGH_RISK_COVERAGE_BLOB_REPORTS_DIRECTORY}/${domain.id}`;
    const shardReportsRoot = `${domain.reportsDirectory}-shards`;
    const shardRunConcurrency = Math.min(domainShardConcurrency, shardCount);
    const shardMaxWorkers = resolveShardMaxWorkers(shardRunConcurrency);

    fs.rmSync(path.join(root, blobDirectory), { force: true, recursive: true });
    fs.rmSync(path.join(root, shardReportsRoot), { force: true, recursive: true });
    fs.mkdirSync(path.join(root, blobDirectory), { recursive: true });

    const shardRuns = new Array(shardCount);
    let nextShardIndex = 1;
    const runShardWorker = async () => {
      while (true) {
        const shardIndex = nextShardIndex;
        nextShardIndex += 1;
        if (shardIndex > shardCount) {
          return;
        }

        const shardRun = await runCommand({
          command: 'npx',
          commandArgs: buildHighRiskCoverageVitestArgs({
            root,
            reportsDirectory: `${shardReportsRoot}/shard-${shardIndex}`,
            coverageIncludeGlobs: domain.coverageIncludeGlobs,
            coverageReporters: ['json-summary'],
            testFiles: domain.testFiles,
            reporter: 'blob',
            outputFile: `${blobDirectory}/blob-${shardIndex}.json`,
            shardIndex,
            shardCount,
            maxWorkers: shardMaxWorkers,
          }),
        });

        shardRuns[shardIndex - 1] = {
          ...shardRun,
          shardIndex,
          shardCount,
        };

        if (!summaryJson) {
          console.log(
            `[high-risk-coverage-baseline] ${domain.id} shard ${shardIndex}/${shardCount} ${shardRun.status.toUpperCase()} ${shardRun.durationMs}ms`
          );
        }
      }
    };

    await Promise.all(
      Array.from({ length: shardRunConcurrency }, () => runShardWorker())
    );

    const failedShardRun = shardRuns.find((shardRun) => shardRun?.status !== 'pass');
    let mergeRun = null;
    if (!failedShardRun) {
      mergeRun = await runCommand({
        command: 'npx',
        commandArgs: buildHighRiskCoverageMergeArgs({
          blobDirectory,
          reportsDirectory: domain.reportsDirectory,
          coverageIncludeGlobs: domain.coverageIncludeGlobs,
        }),
      });

      if (!summaryJson) {
        console.log(
          `[high-risk-coverage-baseline] ${domain.id} merge ${mergeRun.status.toUpperCase()} ${mergeRun.durationMs}ms`
        );
      }

      if (mergeRun.status === 'pass') {
        fs.rmSync(path.join(root, shardReportsRoot), { force: true, recursive: true });
        fs.rmSync(path.join(root, blobDirectory), { force: true, recursive: true });
      }
    }

    const durationMs =
      shardRuns.reduce((total, shardRun) => total + Number(shardRun?.durationMs ?? 0), 0) +
      Number(mergeRun?.durationMs ?? 0);
    const status =
      failedShardRun || (mergeRun && mergeRun.status !== 'pass') ? 'fail' : 'pass';

    return {
      command:
        mergeRun?.command ??
        `sharded high-risk coverage (${domain.id}) ${shardCount} shard${shardCount === 1 ? '' : 's'}`,
      status,
      exitCode: failedShardRun?.exitCode ?? mergeRun?.exitCode ?? 0,
      durationMs,
      output:
        failedShardRun?.output ??
        mergeRun?.output ??
        shardRuns
          .map((shardRun) => shardRun?.output)
          .filter(Boolean)
          .join('\n'),
      id: domain.id,
      label: domain.label,
      reportsDirectory: domain.reportsDirectory,
      coverageIncludeGlobs: domain.coverageIncludeGlobs,
      discoveredTestFileCount: domain.testFiles.length,
      coverageSummaryPath,
      shardCount,
      shardRunConcurrency,
      shardRuns,
      mergeRun,
      blobDirectory,
    };
  };

  const coverageRuns = new Array(coverageDomains.length);
  let nextDomainIndex = 0;
  const runWorker = async () => {
    while (true) {
      const domainIndex = nextDomainIndex;
      nextDomainIndex += 1;
      if (domainIndex >= coverageDomains.length) {
        return;
      }

      const coverageRun = await runCoverageDomain(coverageDomains[domainIndex]);
      coverageRuns[domainIndex] = coverageRun;
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(coverageConcurrency, coverageDomains.length) }, () => runWorker())
  );

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
      ...(selectedTargetIds.length > 0
        ? { HIGH_RISK_COVERAGE_TARGETS: selectedTargetIds.join(',') }
        : {}),
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

  const failedCoverageRun = coverageRuns.find(
    (coverageRun) => coverageRun && coverageRun.status !== 'pass'
  );
  if (failedCoverageRun) {
    process.exit(failedCoverageRun.exitCode ?? 1);
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
