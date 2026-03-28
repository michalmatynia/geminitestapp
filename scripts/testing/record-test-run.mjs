import { parseCommonCheckArgs, writeSummaryJson } from '../lib/check-cli.mjs';
import {
  createTestingRunLedgerEntry,
  ensureTestingRunLedgerArtifacts,
  appendTestingRunLedgerEntry,
} from './lib/test-run-ledger.mjs';
import {
  getTestingLaneById,
  getTestingSuiteById,
  resolveSuitesForTestingLane,
} from './config/test-suite-registry.mjs';

const argv = process.argv.slice(2);
const args = new Set(argv);
const { strictMode, shouldWriteHistory, noWrite, summaryJson } = parseCommonCheckArgs(argv);
const root = process.cwd();

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

const parseSuiteResultValue = (value) => {
  const [suiteId, rawStatus, rawDurationMs] = value.split(':');
  const normalizedSuiteId = suiteId?.trim();
  const normalizedStatus = rawStatus?.trim();
  const parsedDurationMs =
    rawDurationMs && rawDurationMs.trim().length > 0
      ? Number.parseInt(rawDurationMs.trim(), 10)
      : null;

  if (!normalizedSuiteId || !normalizedStatus) {
    throw new Error(
      `Invalid --suite-result value "${value}". Expected <suiteId>:<status>[:durationMs].`
    );
  }

  return {
    id: normalizedSuiteId,
    status: normalizedStatus,
    durationMs: Number.isFinite(parsedDurationMs) ? parsedDurationMs : null,
  };
};

const initOnly = args.has('--init');
const laneId = parseSingleValue('--lane=');
const labelArg = parseSingleValue('--label=');
const status = parseSingleValue('--status=') ?? 'ok';
const durationMs = Number.parseInt(parseSingleValue('--duration-ms=') ?? '', 10);
const command = parseSingleValue('--command=');
const trigger = parseSingleValue('--trigger=') ?? 'manual';
const actor = parseSingleValue('--actor=');
const suiteIdsFromArgs = parseListValues('--suite=');
const suiteResultsFromArgs = parseListValues('--suite-result=').map(parseSuiteResultValue);
const notes = parseListValues('--note=');
const artifactPaths = parseListValues('--artifact=');

if (initOnly) {
  const result = noWrite
    ? {
        payload: {
          generatedAt: new Date().toISOString(),
          summary: {
            totalEntries: 0,
            passingEntries: 0,
            failingEntries: 0,
            warningEntries: 0,
            latestRunAt: null,
          },
        },
        paths: null,
      }
    : await ensureTestingRunLedgerArtifacts({ root, shouldWriteHistory });

  if (summaryJson) {
    writeSummaryJson({
      scannerName: 'testing-run-ledger-record',
      generatedAt: new Date().toISOString(),
      status: 'ok',
      summary: {
        initialized: true,
        totalEntries: result.payload.summary.totalEntries,
      },
      details: null,
      paths: result.paths,
      filters: {
        strictMode,
        historyDisabled: !shouldWriteHistory,
        noWrite,
        ci: args.has('--ci'),
      },
      notes: ['testing run ledger initialized'],
    });
  } else if (result.paths) {
    console.log(`Wrote ${result.paths.latestJson}`);
    console.log(`Wrote ${result.paths.latestMarkdown}`);
  } else {
    console.log('Validated testing run ledger init path (--no-write).');
  }
  process.exit(0);
}

const lane = laneId ? getTestingLaneById(laneId) : null;
if (laneId && !lane) {
  throw new Error(`Unknown testing lane "${laneId}".`);
}

const resolvedSuiteIds = [
  ...(suiteIdsFromArgs.length
    ? suiteIdsFromArgs
    : laneId
      ? resolveSuitesForTestingLane(laneId).map((suite) => suite.id)
      : []),
  ...suiteResultsFromArgs.map((suiteResult) => suiteResult.id),
];
const uniqueSuiteIds = [...new Set(resolvedSuiteIds)];

const unknownSuites = uniqueSuiteIds.filter((suiteId) => !getTestingSuiteById(suiteId));
if (unknownSuites.length > 0) {
  throw new Error(`Unknown testing suite ids: ${unknownSuites.join(', ')}`);
}

const label = labelArg ?? lane?.label ?? 'Manual Test Run';
const suiteResultMap = new Map(
  suiteResultsFromArgs.map((suiteResult) => [suiteResult.id, suiteResult])
);

const suiteResults = uniqueSuiteIds.map((suiteId) => {
  const suite = getTestingSuiteById(suiteId);
  const explicitSuiteResult = suiteResultMap.get(suiteId);
  return {
    id: suiteId,
    label: suite?.label ?? suiteId,
    status: explicitSuiteResult?.status ?? status,
    durationMs:
      explicitSuiteResult?.durationMs ?? (Number.isFinite(durationMs) ? durationMs : null),
  };
});

const entry = createTestingRunLedgerEntry({
  root,
  label,
  status,
  laneId,
  suiteIds: uniqueSuiteIds,
  suiteResults,
  durationMs: Number.isFinite(durationMs) ? durationMs : null,
  trigger,
  actor,
  notes,
  artifactPaths,
  command,
});

const result = noWrite
  ? {
      payload: {
        generatedAt: new Date().toISOString(),
        summary: {
          totalEntries: 1,
          passingEntries: status === 'ok' ? 1 : 0,
          failingEntries: status === 'failed' ? 1 : 0,
          warningEntries: status === 'warn' ? 1 : 0,
          latestRunAt: entry.recordedAt,
        },
      },
      paths: null,
    }
  : await appendTestingRunLedgerEntry({
      root,
      entry,
      shouldWriteHistory,
    });

if (summaryJson) {
  writeSummaryJson({
    scannerName: 'testing-run-ledger-record',
    generatedAt: result.payload.generatedAt,
    status: 'ok',
    summary: {
      recorded: true,
      totalEntries: result.payload.summary.totalEntries,
      label,
      laneId,
      status,
      suiteCount: uniqueSuiteIds.length,
    },
    details: {
      entry,
    },
    paths: result.paths,
    filters: {
      strictMode,
      historyDisabled: !shouldWriteHistory,
      noWrite,
      ci: args.has('--ci'),
    },
    notes: ['testing run ledger entry recorded'],
  });
} else if (result.paths) {
  console.log(`[testing-run-ledger] recorded ${label} (${status})`);
  console.log(`Wrote ${result.paths.latestJson}`);
  console.log(`Wrote ${result.paths.latestMarkdown}`);
} else {
  console.log(`[testing-run-ledger] validated record for ${label} (--no-write)`);
}
