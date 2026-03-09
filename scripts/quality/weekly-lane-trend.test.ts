import { describe, expect, it } from 'vitest';

import {
  runFromWeeklyReportPayload,
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
            guardrails: null,
            uiConsolidation: null,
            observability: null,
          },
        },
      ],
    });

    expect(markdown).toContain('## Check: criticalFlows');
    expect(markdown).toContain('| Run | Status | Duration | Exit | Structured Summary |');
    expect(markdown).toContain('pass=5/6 fail=1');
    expect(markdown).toContain('## Check: build');
    expect(markdown).toContain('| 2026-03-09T10:30:00.000Z | PASS | 1.2s | 0 |');
    expect(markdown).toContain('Structured gate summaries are preserved for the weekly testing checks when available.');
  });
});
