import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

const tempRoots: string[] = [];
const repoRoot = path.resolve(import.meta.dirname, '..', '..');

const weeklyTrendScript = path.join(repoRoot, 'scripts', 'quality', 'report-weekly-lane-trend.mjs');
const domainSuiteTrendScript = path.join(
  repoRoot,
  'scripts',
  'quality',
  'report-domain-suite-trend.mjs'
);
const trendIndexScript = path.join(repoRoot, 'scripts', 'quality', 'generate-trend-index.mjs');
const recalibrationScript = path.join(
  repoRoot,
  'scripts',
  'quality',
  'recalibrate-weekly-duration-budgets.mjs'
);

const createTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'trend-report-scripts-'));
  tempRoots.push(root);
  return root;
};

const writeJson = (root: string, relativePath: string, payload: unknown) => {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return absolutePath;
};

const runJsonScript = (root: string, scriptPath: string, args: string[] = []) => {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: root,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `script failed: ${scriptPath}`);
  }

  return JSON.parse(result.stdout);
};

const runScript = (root: string, scriptPath: string, args: string[] = []) => {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: root,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `script failed: ${scriptPath}`);
  }

  return result;
};

describe('trend report scripts summary-json mode', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('returns weekly lane trend envelopes without writing artifacts', () => {
    const root = createTempRoot();
    writeJson(root, 'docs/metrics/weekly-quality-2026-04-10T10-30-00-000Z.json', {
      generatedAt: '2026-04-10T10:30:00.000Z',
      summary: {
        passed: 2,
        failed: 0,
        timedOut: 0,
        skipped: 0,
      },
      kangurAiTutorBridge: {
        status: 'warning',
        summary: {
          range: '7d',
          bridgeSuggestionCount: 6,
          bridgeCompletionRatePercent: 33.3,
          messageSucceededCount: 9,
          knowledgeGraphAppliedCount: 6,
          knowledgeGraphSemanticCount: 4,
          knowledgeGraphWebsiteHelpCount: 2,
          knowledgeGraphMetadataOnlyRecallCount: 1,
          knowledgeGraphHybridRecallCount: 2,
          knowledgeGraphVectorOnlyRecallCount: 1,
          knowledgeGraphVectorRecallAttemptedCount: 3,
          bridgeQuickActionClickCount: 2,
          bridgeFollowUpClickCount: 2,
          bridgeFollowUpCompletionCount: 1,
          alertStatus: 'warning',
        },
      },
      checks: [
        {
          id: 'build',
          status: 'pass',
          durationMs: 1_200,
          exitCode: 0,
        },
        {
          id: 'criticalFlows',
          status: 'pass',
          durationMs: 22_478,
          exitCode: 0,
          scanSummary: {
            scanner: { name: 'critical-flow-tests', version: '1.0.0' },
            status: 'ok',
            summary: {
              passedFlows: 5,
              totalFlows: 6,
              failedFlows: 1,
              totalDurationMs: 22_478,
            },
            filters: { ci: true },
            paths: null,
            notes: ['fixture'],
          },
        },
        {
          id: 'guardrails',
          status: 'fail',
          durationMs: 5_400,
          exitCode: 1,
          scanSummary: {
            scanner: { name: 'architecture-guardrails', version: '1.0.0' },
            status: 'failed',
            summary: {
              totalMetrics: 14,
              okMetrics: 10,
              failedMetrics: 4,
              hardLimitFailures: 4,
              warnMetrics: 0,
              infoMetrics: 0,
              updatedBaseline: false,
            },
            filters: { strict: true },
            paths: null,
            notes: ['fixture'],
          },
        },
        {
          id: 'uiConsolidation',
          status: 'pass',
          durationMs: 1_300,
          exitCode: 0,
          scanSummary: {
            scanner: { name: 'ui-consolidation-guardrail', version: '1.0.0' },
            status: 'ok',
            summary: {
              totalRules: 7,
              passedRules: 7,
              failedRules: 0,
              propForwardingCount: 43,
              propDepthGte4ChainCount: 0,
              totalOpportunityCount: 0,
              highPriorityOpportunityCount: 0,
              configurationError: false,
            },
            filters: { strict: true },
            paths: null,
            notes: ['fixture'],
          },
        },
        {
          id: 'observability',
          status: 'pass',
          durationMs: 2_100,
          exitCode: 0,
          scanSummary: {
            scanner: { name: 'observability-check', version: '2' },
            status: 'ok',
            summary: {
              mode: 'check',
              totalRoutes: 343,
              uncoveredRoutes: 0,
              loggerViolations: 0,
              eventSourceViolations: 0,
              coreViolations: 0,
              consoleLogViolations: 44,
              emptyCatchBlockViolations: 4,
              legacyCompatibilityViolations: 0,
              runtimeErrors: 0,
              logWriteErrors: 0,
            },
            filters: { mode: 'check' },
            paths: null,
            notes: ['fixture'],
          },
        },
      ],
    });
    writeJson(root, 'docs/metrics/weekly-quality-latest.json', {
      generatedAt: '2026-04-10T10:30:00.000Z',
      summary: {
        passed: 2,
        failed: 0,
        timedOut: 0,
        skipped: 0,
      },
      kangurAiTutorBridge: {
        status: 'warning',
        summary: {
          range: '7d',
          bridgeSuggestionCount: 6,
          bridgeCompletionRatePercent: 33.3,
          messageSucceededCount: 9,
          knowledgeGraphAppliedCount: 6,
          knowledgeGraphSemanticCount: 4,
          knowledgeGraphWebsiteHelpCount: 2,
          knowledgeGraphMetadataOnlyRecallCount: 1,
          knowledgeGraphHybridRecallCount: 2,
          knowledgeGraphVectorOnlyRecallCount: 1,
          knowledgeGraphVectorRecallAttemptedCount: 3,
          bridgeQuickActionClickCount: 2,
          bridgeFollowUpClickCount: 2,
          bridgeFollowUpCompletionCount: 1,
          alertStatus: 'warning',
        },
      },
      checks: [
        {
          id: 'build',
          status: 'pass',
          durationMs: 1_200,
          exitCode: 0,
        },
        {
          id: 'criticalFlows',
          status: 'pass',
          durationMs: 22_478,
          exitCode: 0,
          scanSummary: {
            scanner: { name: 'critical-flow-tests', version: '1.0.0' },
            status: 'ok',
            summary: {
              passedFlows: 5,
              totalFlows: 6,
              failedFlows: 1,
              totalDurationMs: 22_478,
            },
            filters: { ci: true },
            paths: null,
            notes: ['fixture'],
          },
        },
        {
          id: 'guardrails',
          status: 'fail',
          durationMs: 5_400,
          exitCode: 1,
          scanSummary: {
            scanner: { name: 'architecture-guardrails', version: '1.0.0' },
            status: 'failed',
            summary: {
              totalMetrics: 14,
              okMetrics: 10,
              failedMetrics: 4,
              hardLimitFailures: 4,
              warnMetrics: 0,
              infoMetrics: 0,
              updatedBaseline: false,
            },
            filters: { strict: true },
            paths: null,
            notes: ['fixture'],
          },
        },
        {
          id: 'uiConsolidation',
          status: 'pass',
          durationMs: 1_300,
          exitCode: 0,
          scanSummary: {
            scanner: { name: 'ui-consolidation-guardrail', version: '1.0.0' },
            status: 'ok',
            summary: {
              totalRules: 7,
              passedRules: 7,
              failedRules: 0,
              propForwardingCount: 43,
              propDepthGte4ChainCount: 0,
              totalOpportunityCount: 0,
              highPriorityOpportunityCount: 0,
              configurationError: false,
            },
            filters: { strict: true },
            paths: null,
            notes: ['fixture'],
          },
        },
        {
          id: 'observability',
          status: 'pass',
          durationMs: 2_100,
          exitCode: 0,
          scanSummary: {
            scanner: { name: 'observability-check', version: '2' },
            status: 'ok',
            summary: {
              mode: 'check',
              totalRoutes: 343,
              uncoveredRoutes: 0,
              loggerViolations: 0,
              eventSourceViolations: 0,
              coreViolations: 0,
              consoleLogViolations: 44,
              emptyCatchBlockViolations: 4,
              legacyCompatibilityViolations: 0,
              runtimeErrors: 0,
              logWriteErrors: 0,
            },
            filters: { mode: 'check' },
            paths: null,
            notes: ['fixture'],
          },
        },
      ],
    });

    const payload = runJsonScript(root, weeklyTrendScript, ['--summary-json', '--no-write', '--max-runs=5']);

    expect(payload.scanner.name).toBe('weekly-quality-trend');
    expect(payload.summary).toMatchObject({
      runCount: 1,
      latestTotalDurationMs: 32_478,
      latestKangurAiTutorBridgeState: 'current',
      latestKangurAiTutorBridgeAlertStatus: 'warning',
      latestKangurAiTutorBridgeSummaryText:
        'bridge funnel degraded (33.3%) · graph=66.7% · vector=75%',
      latestAvailableKangurAiTutorBridgeState: 'current',
      latestAvailableKangurAiTutorBridgeAgeMs: 0,
      latestAvailableKangurAiTutorBridgeAgeRuns: 0,
      structuredCheckCount: 4,
    });
    expect(payload.details.runs[0].sourceFile).toBe('weekly-quality-latest.json');
    expect(payload.details.runs[0].checks.criticalFlows.structuredSummaryText).toBe('pass=5/6 fail=1');
    expect(payload.details.runs[0].kangurAiTutorBridgeSummaryText).toBe(
      'bridge funnel degraded (33.3%) · graph=66.7% · vector=75%'
    );
    expect(payload.details.runs[0].checks.guardrails.structuredSummaryText).toBe(
      'pass=10/14 fail=4 hard=4 warn=0 info=0 baseline=no'
    );
    expect(payload.details.runs[0].checks.uiConsolidation.structuredSummaryText).toBe(
      'pass=7/7 fail=0 forwarded=43 depth4=0 opps=0 high=0 config=no'
    );
    expect(payload.details.runs[0].checks.observability.structuredSummaryText).toBe(
      'mode=check routes=343 uncovered=0 logger=0 event=0 core=0 console=44 catches=4 legacy=0 runtime=0 logWrites=0'
    );
    expect(payload.paths).toBeNull();
    expect(fs.existsSync(path.join(root, 'docs/metrics/weekly-quality-trend-latest.json'))).toBe(false);
  });

  it('writes weekly lane trend markdown with explicit bridge alert and signal lines', () => {
    const root = createTempRoot();
    writeJson(root, 'docs/metrics/weekly-quality-2026-04-10T10-30-00-000Z.json', {
      generatedAt: '2026-04-10T10:30:00.000Z',
      summary: {
        passed: 2,
        failed: 0,
        timedOut: 0,
        skipped: 0,
      },
      kangurAiTutorBridge: {
        status: 'warning',
        summary: {
          range: '7d',
          bridgeSuggestionCount: 6,
          bridgeCompletionRatePercent: 33.3,
          messageSucceededCount: 9,
          knowledgeGraphAppliedCount: 6,
          knowledgeGraphSemanticCount: 4,
          knowledgeGraphWebsiteHelpCount: 2,
          knowledgeGraphMetadataOnlyRecallCount: 1,
          knowledgeGraphHybridRecallCount: 2,
          knowledgeGraphVectorOnlyRecallCount: 1,
          knowledgeGraphVectorRecallAttemptedCount: 3,
          bridgeQuickActionClickCount: 2,
          bridgeFollowUpClickCount: 2,
          bridgeFollowUpCompletionCount: 1,
          alertStatus: 'warning',
        },
      },
      checks: [
        {
          id: 'build',
          status: 'pass',
          durationMs: 1_200,
          exitCode: 0,
        },
        {
          id: 'criticalFlows',
          status: 'pass',
          durationMs: 22_478,
          exitCode: 0,
          scanSummary: {
            scanner: { name: 'critical-flow-tests', version: '1.0.0' },
            status: 'ok',
            summary: {
              passedFlows: 5,
              totalFlows: 6,
              failedFlows: 1,
              totalDurationMs: 22_478,
            },
            filters: { ci: true },
            paths: null,
            notes: ['fixture'],
          },
        },
      ],
    });

    runScript(root, weeklyTrendScript, ['--no-history', '--max-runs=5']);

    const markdown = fs.readFileSync(
      path.join(root, 'docs/metrics/weekly-quality-trend-latest.md'),
      'utf8'
    );
    expect(markdown).toContain('Latest Kangur AI Tutor bridge alert: warning');
    expect(markdown).toContain('Latest Kangur AI Tutor bridge state: current');
    expect(markdown).toContain('Latest Kangur AI Tutor bridge age: 0 runs');
    expect(markdown).toContain(
      'Latest Kangur AI Tutor bridge signal: bridge funnel degraded (33.3%) · graph=66.7% · vector=75%'
    );
    expect(markdown).toContain('## Kangur AI Tutor Bridge Snapshot');
  });

  it('keeps the most recent bridge-bearing run in weekly trend summary when the latest run has no bridge data', () => {
    const root = createTempRoot();
    writeJson(root, 'docs/metrics/weekly-quality-2026-04-10T10-30-00-000Z.json', {
      generatedAt: '2026-04-10T10:30:00.000Z',
      summary: {
        passed: 2,
        failed: 0,
        timedOut: 0,
        skipped: 0,
      },
      kangurAiTutorBridge: {
        status: 'warning',
        summary: {
          range: '7d',
          bridgeSuggestionCount: 6,
          bridgeCompletionRatePercent: 33.3,
          messageSucceededCount: 9,
          knowledgeGraphAppliedCount: 6,
          knowledgeGraphSemanticCount: 4,
          knowledgeGraphWebsiteHelpCount: 2,
          knowledgeGraphMetadataOnlyRecallCount: 1,
          knowledgeGraphHybridRecallCount: 2,
          knowledgeGraphVectorOnlyRecallCount: 1,
          knowledgeGraphVectorRecallAttemptedCount: 3,
          bridgeQuickActionClickCount: 2,
          bridgeFollowUpClickCount: 2,
          bridgeFollowUpCompletionCount: 1,
          alertStatus: 'warning',
        },
      },
      checks: [{ id: 'build', status: 'pass', durationMs: 1_200, exitCode: 0 }],
    });
    writeJson(root, 'docs/metrics/weekly-quality-2026-04-10T11-30-00-000Z.json', {
      generatedAt: '2026-04-10T11:30:00.000Z',
      summary: {
        passed: 3,
        failed: 0,
        timedOut: 0,
        skipped: 0,
      },
      checks: [{ id: 'build', status: 'pass', durationMs: 1_300, exitCode: 0 }],
    });

    const payload = runJsonScript(root, weeklyTrendScript, ['--summary-json', '--no-write', '--max-runs=5']);

    expect(payload.summary).toMatchObject({
      runCount: 2,
      latestKangurAiTutorBridgeState: 'absent',
      latestKangurAiTutorBridgeAlertStatus: null,
      latestKangurAiTutorBridgeSummaryText: null,
      latestAvailableKangurAiTutorBridgeAlertStatus: 'warning',
      latestAvailableKangurAiTutorBridgeSummaryText:
        'bridge funnel degraded (33.3%) · graph=66.7% · vector=75%',
      latestAvailableKangurAiTutorBridgeRun: '2026-04-10T10:30:00.000Z',
      latestAvailableKangurAiTutorBridgeState: 'stale',
      latestAvailableKangurAiTutorBridgeAgeMs: 3_600_000,
      latestAvailableKangurAiTutorBridgeAgeRuns: 1,
    });
  });

  it('returns domain suite trend envelopes without writing artifacts', () => {
    const root = createTempRoot();
    writeJson(root, 'docs/metrics/unit-domain-timings-2026-04-10T10-30-00-000Z.json', {
      generatedAt: '2026-04-10T10:30:00.000Z',
      summary: {
        total: 2,
        passed: 1,
        failed: 1,
        totalDurationMs: 42_000,
      },
      results: [
        {
          id: 'auth',
          name: 'Auth',
          status: 'pass',
          durationMs: 18_000,
          exitCode: 0,
        },
        {
          id: 'products',
          name: 'Products',
          status: 'fail',
          durationMs: 24_000,
          exitCode: 1,
        },
      ],
    });

    const payload = runJsonScript(root, domainSuiteTrendScript, [
      '--suite=unit-domain-timings',
      '--summary-json',
      '--no-write',
      '--days=30',
      '--max-runs=5',
    ]);

    expect(payload.scanner.name).toBe('domain-suite-trend');
    expect(payload.summary).toMatchObject({
      suite: 'unit-domain-timings',
      runCount: 1,
      domainCount: 2,
      latestTotalDurationMs: 42_000,
      latestFailedDomains: 1,
    });
    expect(payload.details.domainIds).toEqual(['auth', 'products']);
    expect(payload.details.runs[0].domains[0]).toMatchObject({
      id: 'auth',
      status: 'pass',
    });
    expect(payload.paths).toBeNull();
    expect(fs.existsSync(path.join(root, 'docs/metrics/unit-domain-timings-trend-latest.json'))).toBe(false);
  });

  it('returns trend index envelopes without writing artifacts', () => {
    const root = createTempRoot();
    writeJson(root, 'docs/metrics/weekly-quality-trend-latest.json', {
      generatedAt: '2026-04-10T11:00:00.000Z',
      summary: {
        latestAvailableKangurAiTutorBridgeSummaryText:
          'bridge funnel degraded (33.3%) · graph=66.7% · vector=75%',
        latestAvailableKangurAiTutorBridgeAlertStatus: 'warning',
        latestAvailableKangurAiTutorBridgeRun: '2026-04-10T10:30:00.000Z',
        latestAvailableKangurAiTutorBridgeAgeMs: 3_600_000,
        latestAvailableKangurAiTutorBridgeAgeRuns: 1,
      },
      runs: [
        {
          generatedAt: '2026-04-10T11:30:00.000Z',
          totalDurationMs: 23_678,
        },
      ],
    });
    writeJson(root, 'docs/metrics/unit-domain-timings-trend-latest.json', {
      generatedAt: '2026-04-10T11:05:00.000Z',
      runs: [
        {
          generatedAt: '2026-04-10T10:35:00.000Z',
          totalDurationMs: 42_000,
        },
      ],
    });

    const payload = runJsonScript(root, trendIndexScript, ['--summary-json', '--no-write']);

    expect(payload.scanner.name).toBe('trend-index');
    expect(payload.summary).toMatchObject({
      readyCount: 2,
      missingCount: 1,
      totalEntries: 3,
      entriesWithSignals: 1,
      currentSignalCount: 0,
      staleSignalCount: 1,
      absentSignalCount: 1,
      missingSignalStateCount: 1,
      latestWeeklyLaneSignal:
        'bridge funnel degraded (33.3%) · graph=66.7% · vector=75%',
      latestWeeklyLaneAlertStatus: 'warning',
      latestWeeklyLaneSignalRun: '2026-04-10T10:30:00.000Z',
      latestWeeklyLaneSignalState: 'stale',
      latestWeeklyLaneSignalAgeMs: 3_600_000,
      latestWeeklyLaneSignalAgeRuns: 1,
      latestWeeklyLaneSignalIsStale: true,
    });
    expect(payload.details.entries).toEqual([
      expect.objectContaining({
        id: 'weekly-lane',
        status: 'ready',
        latestRun: '2026-04-10T11:30:00.000Z',
        latestSignal: 'bridge funnel degraded (33.3%) · graph=66.7% · vector=75%',
        latestAlertStatus: 'warning',
        latestSignalRun: '2026-04-10T10:30:00.000Z',
        latestSignalState: 'stale',
        latestSignalAgeMs: 3_600_000,
        latestSignalAgeRuns: 1,
      }),
      expect.objectContaining({ id: 'unit-domains', status: 'ready' }),
      expect.objectContaining({
        id: 'lint-domains',
        status: 'missing',
        latestSignalState: 'missing',
      }),
    ]);
    expect(payload.paths).toBeNull();
    expect(fs.existsSync(path.join(root, 'docs/metrics/trend-index-latest.json'))).toBe(false);
  });

  it('writes trend index markdown with explicit alert severity when signals are present', () => {
    const root = createTempRoot();
    writeJson(root, 'docs/metrics/weekly-quality-trend-latest.json', {
      generatedAt: '2026-04-10T11:00:00.000Z',
      runs: [
        {
          generatedAt: '2026-04-10T10:30:00.000Z',
          totalDurationMs: 23_678,
          kangurAiTutorBridge: {
            bridgeSuggestionCount: 6,
            bridgeCompletionRatePercent: 33.3,
            messageSucceededCount: 9,
            knowledgeGraphAppliedCount: 6,
            knowledgeGraphSemanticCount: 4,
            knowledgeGraphWebsiteHelpCount: 2,
            knowledgeGraphMetadataOnlyRecallCount: 1,
            knowledgeGraphHybridRecallCount: 2,
            knowledgeGraphVectorOnlyRecallCount: 1,
            knowledgeGraphVectorRecallAttemptedCount: 3,
            bridgeQuickActionClickCount: 2,
            bridgeFollowUpClickCount: 2,
            bridgeFollowUpCompletionCount: 1,
            alertStatus: 'warning',
          },
        },
      ],
    });
    writeJson(root, 'docs/metrics/unit-domain-timings-trend-latest.json', {
      generatedAt: '2026-04-10T11:05:00.000Z',
      runs: [
        {
          generatedAt: '2026-04-10T10:35:00.000Z',
          totalDurationMs: 42_000,
        },
      ],
    });

    runScript(root, trendIndexScript, ['--no-history']);

    const markdown = fs.readFileSync(path.join(root, 'docs/metrics/trend-index-latest.md'), 'utf8');
    expect(markdown).toContain('Signal states: 1 current / 0 stale / 1 absent / 1 missing');
    expect(markdown).toContain(
      '| Trend | Status | Latest Run | Signal Run | Signal State | Signal Age | Runs Analyzed | Delta vs Prev | Alert | Latest Signal | JSON | Markdown |'
    );
    expect(markdown).toContain(
      '| Weekly Lane Trend | READY | 2026-04-10T10:30:00.000Z | 2026-04-10T10:30:00.000Z | current | 0 runs | 1 | - | warning | bridge funnel degraded (33.3%) · graph=66.7% · vector=75% | `weekly-quality-trend-latest.json` | `weekly-quality-trend-latest.md` |'
    );
    expect(markdown).toContain(
      'Weekly lane entries surface Kangur AI Tutor bridge alert severity when weekly trend artifacts include that signal.'
    );
    expect(markdown).toContain(
      '`Signal State` is `current` when the newest weekly run carries the bridge signal, `stale` when it is reused from an older weekly artifact, and `absent` when no bridge signal exists.'
    );
    expect(markdown).toContain(
      '`Signal Age` quantifies how old a reused bridge signal is when the state is `stale`.'
    );
  });

  it('returns recalibration envelopes without writing artifacts or applying budgets', () => {
    const root = createTempRoot();
    writeJson(root, 'docs/metrics/weekly-quality-2026-04-10T10-30-00-000Z.json', {
      generatedAt: '2026-04-10T10:30:00.000Z',
      checks: [
        { id: 'build', status: 'pass', durationMs: 120_000, exitCode: 0 },
        { id: 'lintDomains', status: 'pass', durationMs: 150_000, exitCode: 0 },
        { id: 'typecheck', status: 'pass', durationMs: 35_000, exitCode: 0 },
        { id: 'criticalFlows', status: 'pass', durationMs: 25_000, exitCode: 0 },
        { id: 'securitySmoke', status: 'pass', durationMs: 9_000, exitCode: 0 },
        { id: 'unitDomains', status: 'pass', durationMs: 260_000, exitCode: 0 },
        { id: 'guardrails', status: 'pass', durationMs: 3_500, exitCode: 0 },
        { id: 'uiConsolidation', status: 'pass', durationMs: 2_700, exitCode: 0 },
        { id: 'observability', status: 'pass', durationMs: 1_300, exitCode: 0 },
      ],
    });

    const payload = runJsonScript(root, recalibrationScript, [
      '--summary-json',
      '--no-write',
      '--apply-budgets',
      '--max-runs=5',
    ]);

    expect(payload.scanner.name).toBe('weekly-duration-recalibration');
    expect(payload.summary).toMatchObject({
      status: 'pending',
      runsAnalyzed: 1,
      applicationStatus: 'skipped',
    });
    expect(payload.details.application).toMatchObject({
      requested: true,
      status: 'skipped',
      applied: false,
      reason: 'Budget application is disabled when --no-write is set.',
    });
    expect(payload.details.recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'build', sampleCount: 1 }),
        expect.objectContaining({ id: 'criticalFlows', sampleCount: 1 }),
      ])
    );
    expect(payload.paths).toBeNull();
    expect(
      fs.existsSync(path.join(root, 'docs/metrics/weekly-duration-budget-recommendations-latest.json'))
    ).toBe(false);
    expect(fs.existsSync(path.join(root, 'scripts/quality/generate-weekly-report.mjs'))).toBe(false);
  });
});
