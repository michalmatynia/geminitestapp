import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getMotionSafeScrollBehavior,
  userPrefersReducedMotion,
} from '@/shared/utils/motion-accessibility';

describe('motion-accessibility utilities', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false when matchMedia is unavailable', () => {
    vi.stubGlobal('window', {} as Window & typeof globalThis);

    expect(userPrefersReducedMotion()).toBe(false);
    expect(getMotionSafeScrollBehavior('smooth')).toBe('smooth');
  });

  it('keeps non-smooth behaviors unchanged', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
    } as unknown as Window & typeof globalThis);

    expect(getMotionSafeScrollBehavior('auto')).toBe('auto');
    expect(getMotionSafeScrollBehavior('instant')).toBe('instant');
    expect(getMotionSafeScrollBehavior(undefined)).toBeUndefined();
  });

  it('downgrades smooth scrolling to auto when reduced motion is preferred', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
    } as unknown as Window & typeof globalThis);

    expect(userPrefersReducedMotion()).toBe(true);
    expect(getMotionSafeScrollBehavior('smooth')).toBe('auto');
  });
});
