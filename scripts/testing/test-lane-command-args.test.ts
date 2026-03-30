import { describe, expect, it } from 'vitest';

import { buildTestingLaneCommandArgs } from './lib/test-lane-command-args.mjs';

describe('buildTestingLaneCommandArgs', () => {
  it('passes through non-summary-json suites unchanged', () => {
    expect(
      buildTestingLaneCommandArgs({
        id: 'lint',
        command: ['npm', 'run', 'lint'],
        supportsSummaryJson: false,
      })
    ).toEqual(['npm', 'run', 'lint']);
  });

  it('adds summary flags for npm run suites without forcing no-write', () => {
    expect(
      buildTestingLaneCommandArgs(
        {
          id: 'critical-flows',
          command: ['npm', 'run', 'test:critical-flows'],
          supportsSummaryJson: true,
        },
        {
          noWrite: false,
          shouldWriteHistory: false,
        }
      )
    ).toEqual(['npm', 'run', 'test:critical-flows', '--', '--summary-json', '--no-history']);
  });

  it('adds no-write and write-history flags when requested', () => {
    expect(
      buildTestingLaneCommandArgs(
        {
          id: 'lint-domains',
          command: ['node', 'scripts/quality/run-lint-domain-checks.mjs'],
          supportsSummaryJson: true,
        },
        {
          noWrite: true,
          shouldWriteHistory: true,
        }
      )
    ).toEqual([
      'node',
      'scripts/quality/run-lint-domain-checks.mjs',
      '--summary-json',
      '--no-write',
      '--write-history',
    ]);
  });

  it('deduplicates repeated summary flags from suite-specific args', () => {
    expect(
      buildTestingLaneCommandArgs(
        {
          id: 'playwright',
          command: ['npm', 'run', 'test:e2e'],
          supportsSummaryJson: true,
          summaryJsonArgs: ['--summary-json', '--no-history'],
        },
        {
          noWrite: true,
          shouldWriteHistory: false,
        }
      )
    ).toEqual([
      'npm',
      'run',
      'test:e2e',
      '--',
      '--summary-json',
      '--no-history',
      '--no-write',
    ]);
  });
});
