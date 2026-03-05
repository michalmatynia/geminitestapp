import { describe, expect, it } from 'vitest';

import {
  DEFAULT_AI_PATHS_DOCS_GENERATED_AT,
  resolveDocsGeneratedAt,
} from '../../../scripts/docs/docs-generated-at';

describe('docs-generated-at', () => {
  it('returns default timestamp when env value is empty', () => {
    expect(resolveDocsGeneratedAt(undefined)).toBe(DEFAULT_AI_PATHS_DOCS_GENERATED_AT);
    expect(resolveDocsGeneratedAt('')).toBe(DEFAULT_AI_PATHS_DOCS_GENERATED_AT);
    expect(resolveDocsGeneratedAt('   ')).toBe(DEFAULT_AI_PATHS_DOCS_GENERATED_AT);
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
