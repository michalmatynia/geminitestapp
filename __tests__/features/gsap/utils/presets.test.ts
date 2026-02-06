import { describe, it, expect } from 'vitest';

import {
  getGsapFromVars,
  getParallaxDefaults,
} from '@/features/gsap/utils/presets';

describe('gsap presets', () => {
  describe('getGsapFromVars', () => {
    it('should return correct vars for fadeIn', () => {
      expect(getGsapFromVars('fadeIn')).toEqual({ opacity: 0 });
    });

    it('should return correct vars for fadeInUp', () => {
      expect(getGsapFromVars('fadeInUp')).toEqual({ y: 40, opacity: 0 });
    });

    it('should return correct vars for unknown preset', () => {
      expect(getGsapFromVars('unknown' as any)).toEqual({});
    });
  });

  describe('getParallaxDefaults', () => {
    it('should return default offset', () => {
      // Assuming 'soft' or some valid preset exists in PARALLAX_DEFAULTS, 
      // but since we don't import the type definition to check valid keys easily in this context,
      // we rely on the function implementation which falls back to { offset: 0 } if not found.
      // Let's test the fallback behavior first.
      expect(getParallaxDefaults('unknown' as any)).toEqual({ offset: 0 });
    });
  });
});
