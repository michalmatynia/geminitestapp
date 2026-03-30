import { spawn } from 'node:child_process';

import { parseScanOutput } from '../architecture/lib/scan-output.mjs';
import { parseCommonCheckArgs, writeSummaryJson } from '../lib/check-cli.mjs';
import {
  createTestingRunLedgerEntry,
  appendTestingRunLedgerEntry,
} from './lib/test-run-ledger.mjs';
import {
  testingLanes,
  testingSuites,
  getTestingLaneById,
  getTestingSuiteById,
  resolveSuitesForTestingLane,
} from './config/test-suite-registry.mjs';
import { buildTestingLaneCommandArgs } from './lib/test-lane-command-args.mjs';

const argv = process.argv.slice(2);
const args = new Set(argv);
const { strictMode, shouldWriteHistory, noWrite, summaryJson } = parseCommonCheckArgs(argv);
const root = process.cwd();
const MAX_CAPTURE_OUTPUT_BYTES = 160_000;

const parseSingleValue = (prefix) => {
  const arg = argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length).trim() : null;
};

const parseListValues = (prefix) =>
  argv
    .filter((value) => value.startsWith(prefix))
    .flatMap((value) => value.slice(prefix.length).split(','))
    .map((value) => value.trim())
    .filter(Boolean);

const laneId = parseSingleValue('--lane=');
const requestedSuiteIds = parseListValues('--suite=');
const shouldList = args.has('--list');
const forceRecordLedger = args.has('--record-ledger');
const disableLedgerRecord = args.has('--no-record-ledger');

const appendCapturedOutput = (value, chunk) => {
  const next = `${value}${chunk.toString()}`;
  if (next.length <= MAX_CAPTURE_OUTPUT_BYTES) {
    return next;
  }
  return next.slice(-MAX_CAPTURE_OUTPUT_BYTES);
};

const printInventory = () => {
  console.log('Testing lanes:');
  for (const lane of testingLanes) {
    console.log(
      `- ${lane.id}: ${lane.label} [${lane.cadence}] suites=${lane.suites.join(', ')} ledger=${
        lane.requiresLedgerEntry ? 'required' : 'optional'
      }`
    );
  }

  console.log('');
  console.log('Testing suites:');
  for (const suite of testingSuites) {
    console.log(
      `- ${suite.id}: ${suite.label} kind=${suite.kind} cadence=${suite.cadence.join(', ')} command="${suite.command.join(
        ' '
      )}"`
    );
  }
};

if (shouldList) {
  printInventory();
  process.exit(0);
}

if (!laneId && requestedSuiteIds.length === 0) {
  throw new Error('Provide --lane=<laneId> or --suite=<suiteId>. Use --list to inspect the registry.');
}

const lane = laneId ? getTestingLaneById(laneId) : null;
if (laneId && !lane) {
  throw new Error(`Unknown testing lane "${laneId}".`);
}

const suites = requestedSuiteIds.length
  ? requestedSuiteIds.map((suiteId) => {
      const suite = getTestingSuiteById(suiteId);
      if (!suite) {
        throw new Error(`Unknown testing suite "${suiteId}".`);
      }
      return suite;
    })
  : resolveSuitesForTestingLane(laneId);

const runSuite = async (suite) =>
  await new Promise((resolve) => {
    const startedAt = Date.now();
    const commandArgs = buildTestingLaneCommandArgs(suite, {
      noWrite,
      shouldWriteHistory,
    });
    const child = spawn(commandArgs[0], commandArgs.slice(1), {
      cwd: root,
      env: {
        ...process.env,
        FORCE_COLOR: '0',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => {
      stdout = appendCapturedOutput(stdout, chunk);
    });
    child.stderr?.on('data', (chunk) => {
      stderr = appendCapturedOutput(stderr, chunk);
    });

    child.on('error', (error) => {
      resolve({
        id: suite.id,
        label: suite.label,
        kind: suite.kind,
        command: commandArgs.join(' '),
        artifacts: suite.artifacts,
        status: 'failed',
        exitCode: null,
        durationMs: Date.now() - startedAt,
        stdout: stdout.trim(),
        stderr: `${stderr}\n${error.stack ?? String(error)}`.trim(),
        scan: null,
      });
    });

    child.on('close', (exitCode) => {
      const durationMs = Date.now() - startedAt;
      let scan = null;
      let status = exitCode === 0 ? 'ok' : 'failed';
      let resolvedStderr = stderr.trim();

      if (exitCode === 0 && suite.supportsSummaryJson) {
        try {
          scan = parseScanOutput(stdout, suite.id);
          if (scan.status === 'failed' || scan.status === 'fail') {
            status = 'failed';
          } else if (scan.status === 'warn') {
            status = 'warn';
          }
        } catch (error) {
          status = 'failed';
          resolvedStderr = `${resolvedStderr}\n${error instanceof Error ? error.message : String(error)}`.trim();
        }
      }

      resolve({
        id: suite.id,
        label: suite.label,
        kind: suite.kind,
        command: commandArgs.join(' '),
        artifacts: suite.artifacts,
        status,
        exitCode,
        durationMs,
        stdout: stdout.trim(),
        stderr: resolvedStderr,
        scan,
      });
    });
  });

const formatDuration = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '0ms';
  }
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  return `${(seconds / 60).toFixed(1)}m`;
};

const results = [];
for (const suite of suites) {
  const result = await runSuite(suite);
  results.push(result);
  if (!summaryJson) {
    console.log(
      `[test-lane] ${result.label.padEnd(30, ' ')} ${String(result.status).toUpperCase().padEnd(6, ' ')} ${formatDuration(
        result.durationMs
      )}`
    );
  }
}

const totalDurationMs = results.reduce((total, result) => total + result.durationMs, 0);
const failedCount = results.filter((result) => result.status === 'failed').length;
const warningCount = results.filter((result) => result.status === 'warn').length;
const overallStatus = failedCount > 0 ? 'failed' : warningCount > 0 ? 'warn' : 'ok';

const shouldRecordLedger =
  !disableLedgerRecord && !noWrite && (forceRecordLedger || Boolean(lane?.requiresLedgerEntry));

let ledgerPaths = null;
if (shouldRecordLedger) {
  const label = lane?.label ?? `Ad hoc suites: ${suites.map((suite) => suite.id).join(', ')}`;
  const entry = createTestingRunLedgerEntry({
    root,
    label,
    status: overallStatus,
    laneId: lane?.id ?? null,
    suiteIds: suites.map((suite) => suite.id),
    suiteResults: results.map((result) => ({
      id: result.id,
      label: result.label,
      status: result.status,
      durationMs: result.durationMs,
    })),
    durationMs: totalDurationMs,
    trigger: lane ? 'lane' : 'manual',
    artifactPaths: results.flatMap((result) => result.artifacts),
    command: lane
      ? `node scripts/testing/run-test-lane.mjs --lane=${lane.id}`
      : `node scripts/testing/run-test-lane.mjs ${suites.map((suite) => `--suite=${suite.id}`).join(' ')}`.trim(),
  });

  const ledgerResult = await appendTestingRunLedgerEntry({
    root,
    entry,
    shouldWriteHistory,
  });
  ledgerPaths = ledgerResult.paths;
}

if (summaryJson) {
  writeSummaryJson({
    scannerName: 'testing-lane-runner',
    generatedAt: new Date().toISOString(),
    status: overallStatus,
    summary: {
      laneId: lane?.id ?? null,
      suiteCount: suites.length,
      passedSuiteCount: results.filter((result) => result.status === 'ok').length,
      warningSuiteCount: warningCount,
      failedSuiteCount: failedCount,
      totalDurationMs,
      ledgerRecorded: shouldRecordLedger,
    },
    details: {
      lane: lane ?? null,
      suites,
      results: results.map((result) => ({
        id: result.id,
        label: result.label,
        kind: result.kind,
        status: result.status,
        exitCode: result.exitCode,
        durationMs: result.durationMs,
        command: result.command,
        artifacts: result.artifacts,
        scan: result.scan,
        stderr: result.stderr || null,
      })),
    },
    paths: ledgerPaths,
    filters: {
      strictMode,
      historyDisabled: !shouldWriteHistory,
      noWrite,
      ci: args.has('--ci'),
      laneId: lane?.id ?? null,
      suiteIds: suites.map((suite) => suite.id),
    },
    notes: ['testing lane runner result'],
  });
} else {
  console.log(
    `[test-lane] status=${overallStatus} suites=${suites.length} pass=${
      results.filter((result) => result.status === 'ok').length
    } warn=${warningCount} fail=${failedCount} duration=${formatDuration(totalDurationMs)}`
  );
  if (ledgerPaths) {
    console.log(`Wrote ${ledgerPaths.latestJson}`);
    console.log(`Wrote ${ledgerPaths.latestMarkdown}`);
  }
}

if (strictMode && overallStatus !== 'ok') {
  process.exit(1);
}
