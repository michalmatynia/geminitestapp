import { describe, expect, it } from 'vitest';

import {
  normalizeSelectedIds,
  shouldReuseIdempotentRun,
  shouldFilterToUniqueOnly,
} from '@/shared/lib/integrations/services/imports/base-import-service-shared';

describe('base-import-service-shared', () => {
  it('normalizes selected ids by trimming and deduping', () => {
    expect(normalizeSelectedIds([' 1001 ', '1002', '', '1001', '   ', '1003'])).toEqual([
      '1001',
      '1002',
      '1003',
    ]);
  });

  it('applies unique-only filter when enabled and no explicit selection', () => {
    expect(
      shouldFilterToUniqueOnly({
        uniqueOnly: true,
      })
    ).toBe(true);
  });

  it('skips unique-only filter for explicit selected ids', () => {
    expect(
      shouldFilterToUniqueOnly({
        uniqueOnly: true,
        selectedIds: [' 9568403 '],
      })
    ).toBe(false);
  });

  it('skips unique-only filter when disabled', () => {
    expect(
      shouldFilterToUniqueOnly({
        uniqueOnly: false,
        selectedIds: ['9568403'],
      })
    ).toBe(false);
  });

  it('reuses idempotent runs only for in-flight statuses', () => {
    expect(shouldReuseIdempotentRun('queued')).toBe(true);
    expect(shouldReuseIdempotentRun('running')).toBe(true);
    expect(shouldReuseIdempotentRun('completed')).toBe(false);
    expect(shouldReuseIdempotentRun('partial_success')).toBe(false);
    expect(shouldReuseIdempotentRun('failed')).toBe(false);
    expect(shouldReuseIdempotentRun('canceled')).toBe(false);
  });
});
