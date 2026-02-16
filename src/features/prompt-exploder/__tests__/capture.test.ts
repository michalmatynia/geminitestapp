import { describe, expect, it } from 'vitest';

import { readRegexCaptureGroup } from '@/features/prompt-exploder/helpers/capture';

describe('readRegexCaptureGroup', () => {
  it('returns full match for group 0', () => {
    const result = /^(alpha)\s+(beta)$/.exec('alpha beta');
    expect(result).not.toBeNull();
    expect(readRegexCaptureGroup(result as RegExpExecArray, 0)).toBe('alpha beta');
  });

  it('returns the requested capture group when present', () => {
    const result = /^(alpha)\s+(beta)$/.exec('alpha beta');
    expect(result).not.toBeNull();
    expect(readRegexCaptureGroup(result as RegExpExecArray, 1)).toBe('alpha');
    expect(readRegexCaptureGroup(result as RegExpExecArray, 2)).toBe('beta');
  });

  it('returns empty string when optional capture group is not matched', () => {
    const result = /^(alpha)(?:\s+(beta))?$/.exec('alpha');
    expect(result).not.toBeNull();
    expect(readRegexCaptureGroup(result as RegExpExecArray, 2)).toBe('');
  });

  it('returns empty string when the capture index is out of range', () => {
    const result = /^(alpha)$/.exec('alpha');
    expect(result).not.toBeNull();
    expect(readRegexCaptureGroup(result as RegExpExecArray, 9)).toBe('');
  });
});
