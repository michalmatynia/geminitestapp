import { describe, expect, it } from 'vitest';

import { resolveKangurPracticeDebugAutoComplete } from './practiceDebugAutoComplete';

describe('resolveKangurPracticeDebugAutoComplete', () => {
  it('returns perfect when the dev auto-complete mode is explicitly enabled', () => {
    expect(resolveKangurPracticeDebugAutoComplete('perfect')).toBe('perfect');
    expect(resolveKangurPracticeDebugAutoComplete(['perfect'])).toBe('perfect');
  });

  it('returns null for missing or unsupported values', () => {
    expect(resolveKangurPracticeDebugAutoComplete(null)).toBeNull();
    expect(resolveKangurPracticeDebugAutoComplete(undefined)).toBeNull();
    expect(resolveKangurPracticeDebugAutoComplete('')).toBeNull();
    expect(resolveKangurPracticeDebugAutoComplete('mixed')).toBeNull();
  });
});
