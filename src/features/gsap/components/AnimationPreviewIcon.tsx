'use client';

import { gsap } from 'gsap';
import React, { useEffect, useRef } from 'react';

import type { AnimationPreset } from '@/shared/contracts/gsap';
import { cn } from '@/shared/utils/ui-utils';

interface AnimationPreviewIconProps {
  preset: AnimationPreset;
  active?: boolean;
  className?: string;
}

const PREVIEW_VARS: Record<string, { from: gsap.TweenVars; to: gsap.TweenVars }> = {
  fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
  fadeInUp: { from: { y: 6, opacity: 0 }, to: { y: 0, opacity: 1 } },
  fadeInDown: { from: { y: -6, opacity: 0 }, to: { y: 0, opacity: 1 } },
  fadeOut: { from: { opacity: 1 }, to: { opacity: 0 } },
  slideInLeft: { from: { x: -8, opacity: 0 }, to: { x: 0, opacity: 1 } },
  slideInRight: { from: { x: 8, opacity: 0 }, to: { x: 0, opacity: 1 } },
  slideInTop: { from: { y: -6, opacity: 0 }, to: { y: 0, opacity: 1 } },
  slideInBottom: { from: { y: 6, opacity: 0 }, to: { y: 0, opacity: 1 } },
  scaleUp: { from: { scale: 0.7, opacity: 0 }, to: { scale: 1, opacity: 1 } },
  scaleDown: { from: { scale: 1.3, opacity: 0 }, to: { scale: 1, opacity: 1 } },
  zoomIn: { from: { scale: 0.55, opacity: 0 }, to: { scale: 1, opacity: 1 } },
  flipY: {
    from: { rotationY: -60, opacity: 0, transformPerspective: 400 },
    to: { rotationY: 0, opacity: 1 },
  },
  skew: { from: { skewX: 12, opacity: 0 }, to: { skewX: 0, opacity: 1 } },
  blurIn: {
    from: { filter: 'blur(4px)', opacity: 0 },
    to: { filter: 'blur(0px)', opacity: 1 },
  },
  rotate: { from: { rotation: -20, opacity: 0 }, to: { rotation: 0, opacity: 1 } },
  rotateX: {
    from: { rotationX: -60, opacity: 0, transformPerspective: 400 },
    to: { rotationX: 0, opacity: 1 },
  },
  rotateY: {
    from: { rotationY: -60, opacity: 0, transformPerspective: 400 },
    to: { rotationY: 0, opacity: 1 },
  },
  popZ: { from: { scale: 0.6, opacity: 0 }, to: { scale: 1, opacity: 1 } },
  cardTilt: {
    from: { rotationX: 10, rotationY: -10, opacity: 0, transformPerspective: 500 },
    to: { rotationX: 0, rotationY: 0, opacity: 1 },
  },
  flip3D: {
    from: { rotationY: 90, opacity: 0, transformPerspective: 500 },
    to: { rotationY: 0, opacity: 1 },
  },
  cube: {
    from: { rotationX: -80, rotationY: 80, opacity: 0, transformPerspective: 500 },
    to: { rotationX: 0, rotationY: 0, opacity: 1 },
  },
  carousel: {
    from: { rotationY: -80, opacity: 0, transformPerspective: 500 },
    to: { rotationY: 0, opacity: 1 },
  },
  orbit: {
    from: { rotation: -140, x: 6, opacity: 0, transformOrigin: '50% 160%' },
    to: { rotation: 0, x: 0, opacity: 1 },
  },
  bounce: {
    from: { y: -8, opacity: 0 },
    to: { y: 0, opacity: 1, duration: 0.7, ease: 'bounce.out' },
  },
};

function getPreviewVars(preset: AnimationPreset): { from: gsap.TweenVars; to: gsap.TweenVars } {
  const baseTo: gsap.TweenVars = { duration: 0.8, ease: 'power2.out' };
  const vars = PREVIEW_VARS[preset];
  if (vars !== undefined) {
    return {
      from: vars.from,
      to: { ...baseTo, ...vars.to },
    };
  }
  return { from: {}, to: baseTo };
}

function getPreviewKeyframes(preset: AnimationPreset): gsap.TweenVars | null {
  switch (preset) {
    case 'shake':
      return {
        keyframes: [{ x: -4 }, { x: 4 }, { x: -3 }, { x: 3 }, { x: -2 }, { x: 2 }, { x: 0 }],
        ease: 'none',
      };
    case 'wobble':
      return {
        keyframes: [
          { rotation: -6, x: -4 },
          { rotation: 6, x: 4 },
          { rotation: -3, x: -2 },
          { rotation: 3, x: 2 },
          { rotation: 0, x: 0 },
        ],
        ease: 'sine.inOut',
      };
    case 'wiggle':
      return {
        keyframes: [
          { rotation: 2 },
          { rotation: -2 },
          { rotation: 1.5 },
          { rotation: -1.5 },
          { rotation: 0 },
        ],
        ease: 'sine.inOut',
      };
    default:
      return null;
  }
}

const resetDots = (dots: NodeListOf<HTMLElement>): void => {
  gsap.set(dots, {
    x: 0, y: 0, opacity: 1, scale: 1, rotation: 0, rotationY: 0, rotationX: 0, z: 0, skewX: 0,
    filter: 'blur(0px)', transformPerspective: 0, transformOrigin: '50% 50%',
  });
};

const playStagger = (dots: NodeListOf<HTMLElement>): void => {
  gsap.fromTo(dots, { y: 6, opacity: 0 }, {
    y: 0, opacity: 1, duration: 0.6, ease: 'power2.out', stagger: 0.12, repeat: -1, yoyo: true, repeatDelay: 0.2,
  });
};

const playAnimation = (dot: HTMLElement, preset: AnimationPreset): void => {
  const keyframes = getPreviewKeyframes(preset);
  if (keyframes !== null) {
    gsap.to(dot, { ...keyframes, duration: 0.7, repeat: -1, repeatDelay: 0.25 });
  } else {
    const { from, to } = getPreviewVars(preset);
    gsap.fromTo(dot, from, { ...to, repeat: -1, yoyo: true, repeatDelay: 0.25 });
  }
};

export function AnimationPreviewIcon({
  preset,
  active = false,
  className,
}: AnimationPreviewIconProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (root === null) return;

    const ctx = gsap.context(() => {
      const dots = root.querySelectorAll<HTMLElement>('[data-dot]');
      if (dots.length > 0) {
        resetDots(dots);
        if (active !== false && preset !== 'none') {
          if (preset === 'stagger') {
            playStagger(dots);
          } else if (dots[0] !== undefined) {
            playAnimation(dots[0], preset);
          }
        }
      }
      return undefined;
    }, root);

    return (): void => ctx.revert();
  }, [active, preset]);

  return (
    <div
      ref={ref}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md border border-border/40 bg-gray-900/50',
        className
      )}
    >
      {preset === 'stagger' ? (
        <div className='flex items-center gap-1'>
          <span data-dot className='size-1.5 rounded-full bg-sky-200' />
          <span data-dot className='size-1.5 rounded-full bg-sky-200' />
          <span data-dot className='size-1.5 rounded-full bg-sky-200' />
        </div>
      ) : (
        <span data-dot className='size-2 rounded-full bg-sky-200' />
      )}
    </div>
  );
}
