import { describe, expect, it } from 'vitest';

import {
  runFromWeeklyReportPayload,
  summarizeKangurAiTutorBridgeSignal,
  summarizeStructuredCheck,
  toWeeklyLaneTrendMarkdown,
} from './lib/weekly-lane-trend.mjs';

describe('weekly lane trend helpers', () => {
  it('summarizes structured weekly test gates compactly', () => {
    expect(
      summarizeStructuredCheck('criticalFlows', {
        summary: {
          passedFlows: 5,
          totalFlows: 6,
          failedFlows: 1,
          totalDurationMs: 22_478,
        },
      })
    ).toBe('pass=5/6 fail=1');

    expect(
      summarizeStructuredCheck('lintDomains', {
        summary: {
          passedDomains: 3,
          totalDomains: 5,
          failedDomains: 2,
          timedOutDomains: 0,
          skippedDomains: 0,
        },
      })
    ).toBe('pass=3/5 fail=2 timeout=0 skip=0');

    expect(
      summarizeStructuredCheck('e2e', {
        summary: {
          exitCode: 0,
          runtimeSource: 'lease',
          runtimeReused: true,
          brokerEnabled: true,
          artifactsRetained: false,
          argumentCount: 2,
        },
      })
    ).toBe('exit=0 runtime=lease reused=yes broker=yes artifacts=no');

    expect(
      summarizeStructuredCheck('guardrails', {
        summary: {
          totalMetrics: 14,
          okMetrics: 10,
          failedMetrics: 4,
          hardLimitFailures: 4,
          warnMetrics: 0,
          infoMetrics: 0,
          updatedBaseline: false,
        },
      })
    ).toBe('pass=10/14 fail=4 hard=4 warn=0 info=0 baseline=no');

    expect(
      summarizeStructuredCheck('uiConsolidation', {
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
      })
    ).toBe('pass=7/7 fail=0 forwarded=43 depth4=0 opps=0 high=0 config=no');

    expect(
      summarizeStructuredCheck('observability', {
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
      })
    ).toBe(
      'mode=check routes=343 uncovered=0 logger=0 event=0 core=0 console=44 catches=4 legacy=0 runtime=0 logWrites=0'
    );

    expect(
      summarizeKangurAiTutorBridgeSignal({
        alertStatus: 'warning',
        bridgeCompletionRatePercent: 33.3,
        messageSucceededCount: 9,
        knowledgeGraphAppliedCount: 6,
        knowledgeGraphSemanticCount: 4,
        knowledgeGraphHybridRecallCount: 2,
        knowledgeGraphVectorOnlyRecallCount: 1,
      })
    ).toBe('bridge funnel degraded (33.3%) · graph=66.7% · vector=75%');
  });

  it('preserves scan summaries when building weekly trend runs', () => {
    const run = runFromWeeklyReportPayload('weekly-quality-2026-03-09.json', {
      generatedAt: '2026-03-09T10:30:00.000Z',
      summary: {
        passed: 2,
        failed: 0,
        timedOut: 0,
        skipped: 0,
      },
      passRates: {
        criticalFlows: 100,
      },
      kangurAiTutorBridge: {
        status: 'ok',
        summary: {
          range: '7d',
          bridgeSuggestionCount: 4,
          bridgeCompletionRatePercent: 50,
          messageSucceededCount: 8,
          knowledgeGraphAppliedCount: 6,
          knowledgeGraphSemanticCount: 4,
          knowledgeGraphWebsiteHelpCount: 2,
          knowledgeGraphMetadataOnlyRecallCount: 1,
          knowledgeGraphHybridRecallCount: 2,
          knowledgeGraphVectorOnlyRecallCount: 1,
          knowledgeGraphVectorRecallAttemptedCount: 3,
          bridgeQuickActionClickCount: 2,
          bridgeFollowUpClickCount: 2,
          bridgeFollowUpCompletionCount: 2,
          alertStatus: 'ok',
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

    expect(run).toMatchObject({
      sourceFile: 'weekly-quality-2026-03-09.json',
      generatedAt: '2026-03-09T10:30:00.000Z',
      totalDurationMs: 23_678,
      passRates: {
        criticalFlows: 100,
      },
    });
    expect(run?.checks.criticalFlows).toMatchObject({
      status: 'pass',
      durationMs: 22_478,
      exitCode: 0,
      structuredSummaryText: 'pass=5/6 fail=1',
      scanSummary: {
        status: 'ok',
        summary: {
          passedFlows: 5,
          totalFlows: 6,
          failedFlows: 1,
          totalDurationMs: 22_478,
        },
      },
    });
    expect(run?.kangurAiTutorBridge).toMatchObject({
      range: '7d',
      bridgeSuggestionCount: 4,
      bridgeCompletionRatePercent: 50,
      bridgeQuickActionClickCount: 2,
      bridgeFollowUpCompletionCount: 2,
      alertStatus: 'ok',
    });
    expect(run?.kangurAiTutorBridgeSummaryText).toBe(
      'bridge funnel healthy (50%) · graph=75% · vector=75%'
    );
    expect(run?.checks.build).toMatchObject({
      status: 'pass',
      durationMs: 1_200,
      exitCode: 0,
      structuredSummaryText: null,
    });
  });

  it('renders structured gate summaries in markdown only when present', () => {
    const markdown = toWeeklyLaneTrendMarkdown({
      generatedAt: '2026-03-09T11:00:00.000Z',
      summary: {
        runCount: 1,
      },
      runs: [
        {
          generatedAt: '2026-03-09T10:30:00.000Z',
          totalDurationMs: 23_678,
          summary: {
            passed: 2,
            failed: 0,
            timedOut: 0,
            skipped: 0,
          },
          kangurAiTutorBridge: {
            bridgeSuggestionCount: 4,
            bridgeCompletionRatePercent: 50,
            messageSucceededCount: 8,
            knowledgeGraphAppliedCount: 6,
            knowledgeGraphSemanticCount: 4,
            knowledgeGraphWebsiteHelpCount: 2,
            knowledgeGraphMetadataOnlyRecallCount: 1,
            knowledgeGraphHybridRecallCount: 2,
            knowledgeGraphVectorOnlyRecallCount: 1,
            knowledgeGraphVectorRecallAttemptedCount: 3,
            bridgeQuickActionClickCount: 2,
            bridgeFollowUpClickCount: 2,
            bridgeFollowUpCompletionCount: 2,
            alertStatus: 'ok',
          },
          kangurAiTutorBridgeSummaryText:
            'bridge funnel healthy (50%) · graph=75% · vector=75%',
          checks: {
            build: {
              status: 'pass',
              durationMs: 1_200,
              exitCode: 0,
              structuredSummaryText: null,
            },
            lint: null,
            lintDomains: null,
            typecheck: null,
            criticalFlows: {
              status: 'pass',
              durationMs: 22_478,
              exitCode: 0,
              structuredSummaryText: 'pass=5/6 fail=1',
            },
            securitySmoke: null,
            unitDomains: null,
            fullUnit: null,
            e2e: null,
            guardrails: {
              status: 'fail',
              durationMs: 5_400,
              exitCode: 1,
              structuredSummaryText: 'pass=10/14 fail=4 hard=4 warn=0 info=0 baseline=no',
            },
            uiConsolidation: {
              status: 'pass',
              durationMs: 1_300,
              exitCode: 0,
              structuredSummaryText: 'pass=7/7 fail=0 forwarded=43 depth4=0 opps=0 high=0 config=no',
            },
            observability: {
              status: 'pass',
              durationMs: 2_100,
              exitCode: 0,
              structuredSummaryText:
                'mode=check routes=343 uncovered=0 logger=0 event=0 core=0 console=44 catches=4 legacy=0 runtime=0 logWrites=0',
            },
          },
        },
      ],
    });

    expect(markdown).toContain('## Check: criticalFlows');
    expect(markdown).toContain('Latest Kangur AI Tutor bridge state: current');
    expect(markdown).toContain('Latest Kangur AI Tutor bridge age: 0 runs');
    expect(markdown).toContain('Latest Kangur AI Tutor bridge alert: ok');
    expect(markdown).toContain(
      'Latest Kangur AI Tutor bridge signal: bridge funnel healthy (50%) · graph=75% · vector=75%'
    );
    expect(markdown).toContain('| Run | Status | Duration | Exit | Structured Summary |');
    expect(markdown).toContain('pass=5/6 fail=1');
    expect(markdown).toContain('## Check: guardrails');
    expect(markdown).toContain('pass=10/14 fail=4 hard=4 warn=0 info=0 baseline=no');
    expect(markdown).toContain('## Check: uiConsolidation');
    expect(markdown).toContain('pass=7/7 fail=0 forwarded=43 depth4=0 opps=0 high=0 config=no');
    expect(markdown).toContain('## Check: observability');
    expect(markdown).toContain(
      'mode=check routes=343 uncovered=0 logger=0 event=0 core=0 console=44 catches=4 legacy=0 runtime=0 logWrites=0'
    );
    expect(markdown).toContain('## Check: build');
    expect(markdown).toContain('| 2026-03-09T10:30:00.000Z | PASS | 1.2s | 0 |');
    expect(markdown).toContain('## Kangur AI Tutor Bridge Snapshot');
    expect(markdown).toContain(
      '| 2026-03-09T10:30:00.000Z | 4 | 50 | 75 | 75 | m=1 h=2 v=1 | 2 | 2 | 2 | ok |'
    );
    expect(markdown).toContain(
      'Structured gate summaries are preserved for weekly testing, architecture, and observability checks when available.'
    );
    expect(markdown).toContain(
      'This trend report summarizes historical `weekly-quality-*.json` runs and prefers `weekly-quality-latest.json` when it contains the richer snapshot for the newest run.'
    );
    expect(markdown).toContain(
      'Kangur AI Tutor bridge snapshots are preserved from weekly artifacts when the report includes them.'
    );
    expect(markdown).toContain(
      'Kangur AI Tutor bridge state is `current` when the newest weekly run carries the signal, `stale` when it is reused from an older weekly artifact, and `absent` when no bridge signal exists yet.'
    );
  });

  it('renders the most recent bridge-bearing run when the latest run has no bridge snapshot', () => {
    const markdown = toWeeklyLaneTrendMarkdown({
      generatedAt: '2026-03-09T12:00:00.000Z',
      summary: {
        runCount: 2,
      },
      runs: [
        {
          generatedAt: '2026-03-09T10:30:00.000Z',
          totalDurationMs: 23_678,
          summary: {
            passed: 2,
            failed: 0,
            timedOut: 0,
            skipped: 0,
          },
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
          kangurAiTutorBridgeSummaryText:
            'bridge funnel degraded (33.3%) · graph=66.7% · vector=75%',
          checks: {
            build: null,
            lint: null,
            lintDomains: null,
            typecheck: null,
            criticalFlows: null,
            securitySmoke: null,
            unitDomains: null,
            fullUnit: null,
            e2e: null,
            guardrails: null,
            uiConsolidation: null,
            observability: null,
          },
        },
        {
          generatedAt: '2026-03-09T11:30:00.000Z',
          totalDurationMs: 24_000,
          summary: {
            passed: 3,
            failed: 0,
            timedOut: 0,
            skipped: 0,
          },
          kangurAiTutorBridge: null,
          kangurAiTutorBridgeSummaryText: null,
          checks: {
            build: null,
            lint: null,
            lintDomains: null,
            typecheck: null,
            criticalFlows: null,
            securitySmoke: null,
            unitDomains: null,
            fullUnit: null,
            e2e: null,
            guardrails: null,
            uiConsolidation: null,
            observability: null,
          },
        },
      ],
    });

    expect(markdown).toContain(
      'Most recent Kangur AI Tutor bridge snapshot: 2026-03-09T10:30:00.000Z'
    );
    expect(markdown).toContain('Latest Kangur AI Tutor bridge state: absent');
    expect(markdown).toContain('Most recent Kangur AI Tutor bridge state: stale');
    expect(markdown).toContain('Most recent Kangur AI Tutor bridge age: 1 run / 60.0m');
    expect(markdown).toContain('Most recent Kangur AI Tutor bridge alert: warning');
    expect(markdown).toContain(
      'Most recent Kangur AI Tutor bridge signal: bridge funnel degraded (33.3%) · graph=66.7% · vector=75%'
    );
  });
});
