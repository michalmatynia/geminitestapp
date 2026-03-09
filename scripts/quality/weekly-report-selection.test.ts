import { describe, expect, it } from 'vitest';

import {
  applyWeeklyCheckSelection,
  parseWeeklyCheckSelectionArgs,
} from './lib/weekly-report-selection.mjs';

describe('weekly report check selection helpers', () => {
  it('parses and de-duplicates only/skip check arguments', () => {
    expect(
      parseWeeklyCheckSelectionArgs([
        '--only-checks=guardrails,observability,guardrails',
        '--skip-checks=build,lint',
        '--skip-checks=lint',
      ])
    ).toEqual({
      onlyChecks: ['guardrails', 'observability'],
      skipChecks: ['build', 'lint'],
    });
  });

  it('applies focused selection and enables explicitly selected optional checks', () => {
    const { checks, selection } = applyWeeklyCheckSelection(
      [
        { id: 'build', enabled: true },
        { id: 'lint', enabled: false },
        { id: 'observability', enabled: true },
        { id: 'e2e', enabled: false },
      ],
      {
        onlyChecks: ['lint', 'observability'],
        skipChecks: ['observability'],
      }
    );

    expect(selection).toEqual({
      onlyChecks: ['lint', 'observability'],
      skipChecks: ['observability'],
      selectedChecks: ['lint'],
      omittedChecks: ['build', 'observability', 'e2e'],
    });

    expect(checks).toEqual([
      expect.objectContaining({
        id: 'build',
        enabled: false,
        disabledOutput: 'Skipped by --only-checks selection (build).',
      }),
      expect.objectContaining({
        id: 'lint',
        enabled: true,
      }),
      expect.objectContaining({
        id: 'observability',
        enabled: false,
        disabledOutput: 'Skipped by --skip-checks selection (observability).',
      }),
      expect.objectContaining({
        id: 'e2e',
        enabled: false,
        disabledOutput: 'Skipped by --only-checks selection (e2e).',
      }),
    ]);
  });

  it('rejects unknown check ids', () => {
    expect(() =>
      applyWeeklyCheckSelection(
        [{ id: 'build' }, { id: 'guardrails' }],
        {
          onlyChecks: ['guardrails', 'unknown-check'],
          skipChecks: [],
        }
      )
    ).toThrow('Unknown check IDs for --only-checks: unknown-check.');
  });
});
