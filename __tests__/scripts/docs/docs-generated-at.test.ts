import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getDefaultAiPathsDocsGeneratedAt,
  resolveDocsGeneratedAt,
} from '../../../scripts/docs/docs-generated-at';

describe('docs-generated-at', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns default timestamp when env value is empty', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-26T12:34:56.000Z'));

    expect(getDefaultAiPathsDocsGeneratedAt()).toBe('2026-03-26T12:34:56.000Z');
    expect(resolveDocsGeneratedAt(undefined)).toBe('2026-03-26T12:34:56.000Z');
    expect(resolveDocsGeneratedAt('')).toBe('2026-03-26T12:34:56.000Z');
    expect(resolveDocsGeneratedAt('   ')).toBe('2026-03-26T12:34:56.000Z');
  });

  it('parses and normalizes valid timestamps', () => {
    expect(resolveDocsGeneratedAt('2026-03-06T12:34:56Z')).toBe('2026-03-06T12:34:56.000Z');
    expect(resolveDocsGeneratedAt(' 2026-03-06T13:34:56+01:00 ')).toBe(
      '2026-03-06T12:34:56.000Z'
    );
  });

  it('throws on invalid timestamp', () => {
    expect(() => resolveDocsGeneratedAt('not-a-date')).toThrow(
      'Invalid AI_PATHS_DOCS_GENERATED_AT value: "not-a-date".'
    );
  });
});
