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
});
