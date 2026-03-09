import { describe, expect, it } from 'vitest';

import { summarizeWeeklyChecks } from './lib/weekly-report-aggregation.mjs';

describe('weekly report aggregation helpers', () => {
  it('summarizes skipped checks without selection metadata', () => {
    expect(
      summarizeWeeklyChecks([
        { id: 'build', status: 'pass' },
        { id: 'lint', status: 'skipped' },
        { id: 'typecheck', status: 'fail' },
        { id: 'e2e', status: 'timeout' },
        { id: 'fullUnit', status: 'skipped' },
      ])
    ).toEqual({
      totalChecks: 5,
      executedChecks: 3,
      passed: 1,
      failed: 1,
      timedOut: 1,
      skipped: 2,
      selectionSkipped: 0,
      otherSkipped: 2,
    });
  });

  it('splits selection-skipped checks from other skipped checks', () => {
    expect(
      summarizeWeeklyChecks(
        [
          { id: 'build', status: 'skipped' },
          { id: 'lint', status: 'skipped' },
          { id: 'guardrails', status: 'fail' },
          { id: 'uiConsolidation', status: 'pass' },
          { id: 'observability', status: 'pass' },
        ],
        {
          onlyChecks: ['guardrails', 'uiConsolidation', 'observability'],
          skipChecks: [],
          selectedChecks: ['guardrails', 'uiConsolidation', 'observability'],
          omittedChecks: ['build'],
        }
      )
    ).toEqual({
      totalChecks: 5,
      executedChecks: 3,
      passed: 2,
      failed: 1,
      timedOut: 0,
      skipped: 2,
      selectionSkipped: 1,
      otherSkipped: 1,
    });
  });
});
