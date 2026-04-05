import { describe, expect, it } from 'vitest';

import * as gsapPublic from './public';

describe('gsap public barrel', () => {
  it('continues exposing the GSAP UI components', () => {
    expect(gsapPublic).toHaveProperty('AnimationPresetPicker');
    expect(gsapPublic).toHaveProperty('AnimationPreviewIcon');
  });

  it('continues exposing the GSAP contract and preset runtime surface', () => {
    expect(gsapPublic).toHaveProperty('animationPresetSchema');
    expect(gsapPublic).toHaveProperty('PARALLAX_DEFAULTS');
    expect(gsapPublic).toHaveProperty('getGsapFromVars');
    expect(gsapPublic).toHaveProperty('getParallaxDefaults');
  });
});
