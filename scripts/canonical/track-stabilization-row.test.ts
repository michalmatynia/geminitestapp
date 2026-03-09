import { describe, expect, it } from 'vitest';

import {
  buildTrackerSummary,
  formatLocalDate,
  resolveLatestGeneratedAt,
  upsertRow,
} from './lib/stabilization-track.mjs';

describe('stabilization tracker helpers', () => {
  it('builds tracker cells from structured gate summaries', () => {
    const summary = buildTrackerSummary({
      gatePassed: true,
      canonical: {
        status: 'pass',
        runtimeFileCount: 4477,
        docsArtifactCount: 4,
      },
      ai: {
        status: 'pass',
        sourceFileCount: 5231,
      },
      observability: {
        status: 'pass',
        legacyCompatibilityViolations: 0,
        runtimeErrors: 0,
      },
      refreshedAt: '2026-03-09T08:40:13.335Z',
    });

    expect(summary).toEqual({
      canonicalCell: 'pass (`4477` runtime files, `4` docs)',
      aiCell: 'pass (`5231` source files)',
      obsCell: 'pass (`legacyCompatViolations=0`, `runtimeErrors=0`)',
      notes: 'Consolidated stabilization checks passed (refreshed at `2026-03-09T08:40:13.335Z`).',
    });
  });

  it('supports fail and not-run cells without detail payloads', () => {
    const summary = buildTrackerSummary({
      gatePassed: false,
      canonical: {
        status: 'fail',
        runtimeFileCount: 4477,
        docsArtifactCount: 4,
      },
      ai: {
        status: 'not-run',
        sourceFileCount: null,
      },
      observability: {
        status: 'not-run',
        legacyCompatibilityViolations: null,
        runtimeErrors: null,
      },
      refreshedAt: '2026-03-09T08:40:13.335Z',
    });

    expect(summary).toEqual({
      canonicalCell: 'fail (`4477` runtime files, `4` docs)',
      aiCell: 'not-run',
      obsCell: 'not-run',
      notes: 'Consolidated stabilization checks failed.',
    });
  });

  it('resolves the latest generatedAt timestamp', () => {
    expect(
      resolveLatestGeneratedAt(
        '2026-03-09T08:40:10.000Z',
        '2026-03-09T08:40:12.000Z',
        '2026-03-09T08:40:11.000Z'
      )
    ).toBe('2026-03-09T08:40:12.000Z');
  });

  it('formats local dates and upserts tracker rows', () => {
    expect(formatLocalDate(new Date('2026-03-09T10:15:00.000Z'))).toBe('2026-03-09');

    const markdown = [
      '# Tracker',
      '',
      '| Date | Canonical | AI | Observability | Notes |',
      '| --- | --- | --- | --- | --- |',
      '| 2026-03-08 | pass | pass | pass | previous |',
      '',
      '## Completion Rule',
      'Done when the row is updated.',
      '',
    ].join('\n');

    const inserted = upsertRow(
      markdown,
      '2026-03-09',
      '| 2026-03-09 | pass | pass | pass | current |'
    );
    expect(inserted).toContain('| 2026-03-09 | pass | pass | pass | current |');
    expect(inserted.indexOf('2026-03-09')).toBeLessThan(inserted.indexOf('## Completion Rule'));

    const replaced = upsertRow(
      inserted,
      '2026-03-09',
      '| 2026-03-09 | fail | not-run | not-run | updated |'
    );
    expect(replaced).toContain('| 2026-03-09 | fail | not-run | not-run | updated |');
    expect(replaced).not.toContain('| 2026-03-09 | pass | pass | pass | current |');
  });
});
