import { describe, expect, it } from 'vitest';

import { toIsoDocumentDate } from '@/features/case-resolver/settings.helpers';

describe('case-resolver settings helpers', () => {
  it('formats valid utc-safe document dates', () => {
    expect(toIsoDocumentDate(2026, 4, 3)).toBe('2026-04-03');
    expect(toIsoDocumentDate(2024, 2, 29)).toBe('2024-02-29');
  });

  it('rejects invalid document date parts and impossible dates', () => {
    expect(toIsoDocumentDate(1899, 4, 3)).toBeNull();
    expect(toIsoDocumentDate(2026, 13, 1)).toBeNull();
    expect(toIsoDocumentDate(2026, 4, 31)).toBeNull();
    expect(toIsoDocumentDate(2025, 2, 29)).toBeNull();
  });
});
