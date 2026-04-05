import { describe, expect, it } from 'vitest';

import {
  filterValidationPatternsForConfig,
  shouldIncludeDisabledValidationPatterns,
} from './handler.helpers';

describe('product validator-config handler helpers', () => {
  it('resolves includeDisabled with a safe default', () => {
    expect(shouldIncludeDisabledValidationPatterns({ includeDisabled: true })).toBe(true);
    expect(shouldIncludeDisabledValidationPatterns({ includeDisabled: false })).toBe(false);
    expect(shouldIncludeDisabledValidationPatterns(undefined)).toBe(false);
  });

  it('filters disabled validation patterns unless explicitly included', () => {
    const patterns = [
      { id: 'pattern-1', enabled: true },
      { id: 'pattern-2', enabled: false },
    ] as Parameters<typeof filterValidationPatternsForConfig>[0];

    expect(filterValidationPatternsForConfig(patterns, false)).toEqual([
      { id: 'pattern-1', enabled: true },
    ]);
    expect(filterValidationPatternsForConfig(patterns, true)).toEqual(patterns);
  });
});
