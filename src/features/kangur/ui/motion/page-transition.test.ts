import { describe, expect, it } from 'vitest';

import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';

describe('createKangurPageTransitionMotionProps', () => {
  it('uses the Lekcje-style vertical fade as the canonical Kangur transition', () => {
    expect(createKangurPageTransitionMotionProps(false)).toEqual({
      initial: { opacity: 0, y: 12 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -6 },
      transition: {
        duration: 0.28,
        ease: [0.22, 1, 0.36, 1],
      },
    });
  });

  it('removes movement when reduced motion is preferred', () => {
    expect(createKangurPageTransitionMotionProps(true)).toEqual({
      initial: { opacity: 1, y: 0 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 1, y: 0 },
      transition: { duration: 0 },
    });
  });
});
