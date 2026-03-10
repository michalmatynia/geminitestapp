import { describe, expect, it } from 'vitest';

import {
  buildWeeklyReportSummaryJsonDetails,
  toSummaryJsonCheckResult,
} from './lib/weekly-report-summary.mjs';

describe('weekly report summary helpers', () => {
  it('preserves structured scan summaries for failing checks', () => {
    const result = toSummaryJsonCheckResult({
      id: 'lintDomains',
      label: 'Lint Domain Gate',
      command: 'node scripts/quality/run-lint-domain-checks.mjs --summary-json',
      status: 'fail',
      exitCode: 1,
      signal: null,
      durationMs: 408_370,
      scanSummary: {
        scanner: { name: 'lint-domain-checks', version: '1.0.0' },
        status: 'failed',
        summary: {
          totalDomains: 5,
          passedDomains: 2,
          failedDomains: 3,
          timedOutDomains: 0,
          skippedDomains: 0,
          totalDurationMs: 408_370,
        },
        paths: null,
        filters: { ci: true },
        notes: ['fixture'],
      },
      output: 'x'.repeat(5_000),
    });

    expect(result).toMatchObject({
      id: 'lintDomains',
      status: 'fail',
      exitCode: 1,
      durationMs: 408_370,
      scanSummary: {
        status: 'failed',
        summary: {
          totalDomains: 5,
          passedDomains: 2,
          failedDomains: 3,
        },
      },
    });
    expect(result.outputPreview).toHaveLength(4_000);
  });

  it('builds weekly report details with check scan summaries intact', () => {
    const details = buildWeeklyReportSummaryJsonDetails({
      includeE2E: false,
      strictMode: false,
      passRates: {
        lintDomains: 0,
        criticalFlows: 100,
      },
      durationAlerts: [
        {
          id: 'lintDomains',
          label: 'Lint Domain Gate',
          status: 'fail',
          durationMs: 408_370,
          budgetMs: 407_000,
        },
      ],
      checks: [
        {
          id: 'lintDomains',
          label: 'Lint Domain Gate',
          command: 'node scripts/quality/run-lint-domain-checks.mjs --summary-json',
          status: 'fail',
          exitCode: 1,
          signal: null,
          durationMs: 408_370,
          scanSummary: {
            scanner: { name: 'lint-domain-checks', version: '1.0.0' },
            status: 'failed',
            summary: {
              totalDomains: 5,
              passedDomains: 2,
              failedDomains: 3,
              totalDurationMs: 408_370,
            },
            paths: null,
            filters: { ci: true },
            notes: ['fixture'],
          },
          output: 'lint domain output',
        },
        {
          id: 'criticalFlows',
          label: 'Critical Flow Gate',
          command: 'node scripts/testing/run-critical-flow-tests.mjs --summary-json',
          status: 'pass',
          exitCode: 0,
          signal: null,
          durationMs: 24_892,
          scanSummary: {
            scanner: { name: 'critical-flow-tests', version: '1.0.0' },
            status: 'ok',
            summary: {
              totalFlows: 6,
              passedFlows: 6,
              failedFlows: 0,
              totalDurationMs: 24_892,
            },
            paths: null,
            filters: { ci: true },
            notes: ['fixture'],
          },
          output: 'critical flow output',
        },
      ],
      buildPreflight: {
        action: 'skip',
        message: 'fixture build skip',
      },
      metrics: {
        source: {
          totalFiles: 1,
        },
      },
      metricsError: null,
      propDrilling: {
        ok: true,
        summary: {
          candidateChainCount: 0,
        },
      },
      uiConsolidation: {
        ok: true,
        summary: {
          totalOpportunities: 0,
        },
      },
      stabilization: {
        ok: true,
      },
      stabilizationError: null,
      trends: {
        weeklyLane: {
          runCount: 3,
        },
      },
      kangurAiTutorBridge: {
        status: 'ok',
        summary: {
          range: '7d',
          bridgeSuggestionCount: 4,
          bridgeCompletionRatePercent: 50,
          alertStatus: 'ok',
        },
        details: {
          window: {
            from: '2026-03-02T00:00:00.000Z',
            to: '2026-03-09T00:00:00.000Z',
          },
        },
        error: null,
      },
      criticalFlows: [
        {
          id: 'auth-session',
          name: 'Authentication + Session Bootstrap',
        },
      ],
    });

    expect(details).toMatchObject({
      includeE2E: false,
      strictMode: false,
      checkSelection: null,
      passRates: {
        lintDomains: 0,
        criticalFlows: 100,
      },
      durationAlerts: [
        {
          id: 'lintDomains',
          durationMs: 408_370,
          budgetMs: 407_000,
        },
      ],
      buildPreflight: {
        action: 'skip',
      },
      trends: {
        weeklyLane: {
          runCount: 3,
        },
      },
      kangurAiTutorBridge: {
        status: 'ok',
        summary: {
          range: '7d',
          bridgeSuggestionCount: 4,
          bridgeCompletionRatePercent: 50,
          alertStatus: 'ok',
        },
      },
      criticalFlows: [
        {
          id: 'auth-session',
          name: 'Authentication + Session Bootstrap',
        },
      ],
    });
    expect(details.checks).toHaveLength(2);
    expect(details.checks[0]).toMatchObject({
      id: 'lintDomains',
      status: 'fail',
      scanSummary: {
        summary: {
          totalDomains: 5,
          passedDomains: 2,
          failedDomains: 3,
        },
      },
    });
    expect(details.checks[1]).toMatchObject({
      id: 'criticalFlows',
      status: 'pass',
      scanSummary: {
        summary: {
          totalFlows: 6,
          passedFlows: 6,
          failedFlows: 0,
        },
      },
    });
  });

  it('keeps architecture and observability scan summaries in weekly report details', () => {
    const details = buildWeeklyReportSummaryJsonDetails({
      includeE2E: false,
      strictMode: true,
      checkSelection: {
        onlyChecks: ['guardrails', 'uiConsolidation', 'observability'],
        skipChecks: ['build'],
        selectedChecks: ['guardrails', 'uiConsolidation', 'observability'],
        omittedChecks: ['build'],
      },
      passRates: {
        guardrails: 0,
        uiConsolidation: 100,
        observability: 100,
      },
      durationAlerts: [],
      checks: [
        {
          id: 'guardrails',
          label: 'Architecture Guardrails',
          command: 'node scripts/architecture/check-guardrails.mjs --summary-json',
          status: 'fail',
          exitCode: 1,
          signal: null,
          durationMs: 5_400,
          scanSummary: {
            scanner: { name: 'architecture-guardrails', version: '1.0.0' },
            status: 'failed',
            summary: {
              totalMetrics: 14,
              okMetrics: 10,
              failedMetrics: 4,
              infoMetrics: 0,
              warnMetrics: 0,
              hardLimitFailures: 4,
              updatedBaseline: false,
            },
            paths: null,
            filters: {
              strict: true,
            },
            notes: ['fixture'],
          },
          output: 'guardrail output',
        },
        {
          id: 'uiConsolidation',
          label: 'UI Consolidation Guardrail',
          command: 'node scripts/architecture/check-ui-consolidation.mjs --summary-json',
          status: 'pass',
          exitCode: 0,
          signal: null,
          durationMs: 1_300,
          scanSummary: {
            scanner: { name: 'ui-consolidation-guardrail', version: '1.0.0' },
            status: 'ok',
            summary: {
              totalRules: 7,
              failedRules: 0,
              passedRules: 7,
              propForwardingCount: 43,
              totalOpportunityCount: 0,
              configurationError: false,
            },
            paths: null,
            filters: {
              strict: true,
            },
            notes: ['fixture'],
          },
          output: 'ui consolidation output',
        },
        {
          id: 'observability',
          label: 'Observability Check',
          command: 'node scripts/observability/check-observability.mjs --mode=check --summary-json',
          status: 'pass',
          exitCode: 0,
          signal: null,
          durationMs: 2_100,
          scanSummary: {
            scanner: { name: 'observability-check', version: '2' },
            status: 'ok',
            summary: {
              mode: 'check',
              totalRoutes: 12,
              wrappedRoutes: 12,
              delegatedRoutes: 0,
              uncoveredRoutes: 0,
              loggerViolations: 0,
              runtimeErrors: 0,
              logWriteErrors: 0,
            },
            paths: {
              checkLog: 'logs/observability-check.log',
              errorLog: null,
            },
            filters: {
              mode: 'check',
              allowPartial: false,
            },
            notes: ['fixture'],
          },
          output: 'observability output',
        },
      ],
      buildPreflight: {
        action: 'skip',
        message: 'fixture build skip',
      },
      metrics: null,
      metricsError: null,
      propDrilling: null,
      uiConsolidation: null,
      stabilization: null,
      stabilizationError: null,
      trends: null,
      kangurAiTutorBridge: {
        status: 'warning',
        summary: {
          range: '7d',
          bridgeSuggestionCount: 6,
          bridgeCompletionRatePercent: 33.3,
          alertStatus: 'warning',
        },
        details: null,
        error: null,
      },
      criticalFlows: [],
    });

    expect(details.checks).toHaveLength(3);
    expect(details.checkSelection).toEqual({
      onlyChecks: ['guardrails', 'uiConsolidation', 'observability'],
      skipChecks: ['build'],
      selectedChecks: ['guardrails', 'uiConsolidation', 'observability'],
      omittedChecks: ['build'],
    });
    expect(details.checks[0]).toMatchObject({
      id: 'guardrails',
      status: 'fail',
      scanSummary: {
        scanner: {
          name: 'architecture-guardrails',
        },
        summary: {
          totalMetrics: 14,
          failedMetrics: 4,
          hardLimitFailures: 4,
        },
      },
    });
    expect(details.checks[1]).toMatchObject({
      id: 'uiConsolidation',
      status: 'pass',
      scanSummary: {
        scanner: {
          name: 'ui-consolidation-guardrail',
        },
        summary: {
          totalRules: 7,
          passedRules: 7,
          propForwardingCount: 43,
        },
      },
    });
    expect(details.checks[2]).toMatchObject({
      id: 'observability',
      status: 'pass',
      scanSummary: {
        scanner: {
          name: 'observability-check',
        },
        summary: {
          mode: 'check',
          totalRoutes: 12,
          wrappedRoutes: 12,
          loggerViolations: 0,
          runtimeErrors: 0,
        },
      },
    });
    expect(details.kangurAiTutorBridge).toMatchObject({
      status: 'warning',
      summary: {
        range: '7d',
        bridgeSuggestionCount: 6,
        bridgeCompletionRatePercent: 33.3,
        alertStatus: 'warning',
      },
    });
  });
});
