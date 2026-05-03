import {
  PARALLAX_DEFAULTS,
  type AnimationPreset,
  type ParallaxPreset,
} from '@/shared/contracts/gsap';

const GSAP_FROM_VARS: Record<string, GSAPTweenVars> = {
  fadeIn: { opacity: 0 },
  fadeInUp: { y: 40, opacity: 0 },
  fadeInDown: { y: -40, opacity: 0 },
  fadeOut: { opacity: 1 },
  slideInLeft: { x: -80, opacity: 0 },
  slideInRight: { x: 80, opacity: 0 },
  slideInTop: { y: -60, opacity: 0 },
  slideInBottom: { y: 60, opacity: 0 },
  scaleUp: { scale: 0.8, opacity: 0 },
  scaleDown: { scale: 1.2, opacity: 0 },
  zoomIn: { scale: 0.6, opacity: 0 },
  flipY: { rotationY: 70, opacity: 0, transformPerspective: 600 },
  skew: { skewX: 12, opacity: 0 },
  blurIn: { filter: 'blur(6px)', opacity: 0 },
  rotateX: { rotationX: -70, opacity: 0, transformPerspective: 900 },
  rotateY: { rotationY: -70, opacity: 0, transformPerspective: 900 },
  popZ: { z: -140, scale: 0.9, opacity: 0, transformPerspective: 900 },
  cardTilt: { rotationX: 12, rotationY: -12, opacity: 0, transformPerspective: 900 },
  flip3D: { rotationY: 90, opacity: 0, transformPerspective: 900 },
  cube: { rotationX: -90, rotationY: 90, opacity: 0, transformPerspective: 1000 },
  carousel: {
    rotationY: -90,
    z: -200,
    opacity: 0,
    transformPerspective: 1000,
    transformOrigin: '50% 50% -200px',
  },
  orbit: { rotation: -140, x: 30, opacity: 0, transformOrigin: '50% 160%' },
  rotate: { rotation: -15, opacity: 0 },
  bounce: { y: -40, opacity: 0 },
  stagger: { y: 30, opacity: 0 },
};

export function getGsapFromVars(preset: AnimationPreset): GSAPTweenVars {
  return GSAP_FROM_VARS[preset] ?? {};
}

export function getParallaxDefaults(preset: ParallaxPreset): { offset: number; scale?: number } {
  const val = PARALLAX_DEFAULTS[preset];
  return {
    offset: (val as { offset?: number }).offset ?? 0,
    scale: (val as { scale?: number }).scale,
  };
}
