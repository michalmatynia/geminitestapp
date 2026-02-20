import {
  PARALLAX_DEFAULTS,
  type AnimationPreset,
  type ParallaxPreset,
} from '@/shared/contracts/gsap';

export function getGsapFromVars(preset: AnimationPreset): GSAPTweenVars {
  switch (preset) {
    case 'fadeIn':
      return { opacity: 0 };
    case 'fadeInUp':
      return { y: 40, opacity: 0 };
    case 'fadeInDown':
      return { y: -40, opacity: 0 };
    case 'fadeOut':
      return { opacity: 1 };
    case 'slideInLeft':
      return { x: -80, opacity: 0 };
    case 'slideInRight':
      return { x: 80, opacity: 0 };
    case 'slideInTop':
      return { y: -60, opacity: 0 };
    case 'slideInBottom':
      return { y: 60, opacity: 0 };
    case 'scaleUp':
      return { scale: 0.8, opacity: 0 };
    case 'scaleDown':
      return { scale: 1.2, opacity: 0 };
    case 'zoomIn':
      return { scale: 0.6, opacity: 0 };
    case 'flipY':
      return { rotationY: 70, opacity: 0, transformPerspective: 600 };
    case 'skew':
      return { skewX: 12, opacity: 0 };
    case 'blurIn':
      return { filter: 'blur(6px)', opacity: 0 };
    case 'rotateX':
      return { rotationX: -70, opacity: 0, transformPerspective: 900 };
    case 'rotateY':
      return { rotationY: -70, opacity: 0, transformPerspective: 900 };
    case 'popZ':
      return { z: -140, scale: 0.9, opacity: 0, transformPerspective: 900 };
    case 'cardTilt':
      return { rotationX: 12, rotationY: -12, opacity: 0, transformPerspective: 900 };
    case 'flip3D':
      return { rotationY: 90, opacity: 0, transformPerspective: 900 };
    case 'cube':
      return { rotationX: -90, rotationY: 90, opacity: 0, transformPerspective: 1000 };
    case 'carousel':
      return {
        rotationY: -90,
        z: -200,
        opacity: 0,
        transformPerspective: 1000,
        transformOrigin: '50% 50% -200px',
      };
    case 'orbit':
      return { rotation: -140, x: 30, opacity: 0, transformOrigin: '50% 160%' };
    case 'rotate':
      return { rotation: -15, opacity: 0 };
    case 'bounce':
      return { y: -40, opacity: 0 };
    case 'stagger':
      return { y: 30, opacity: 0 };
    default:
      return {};
  }
}

export function getParallaxDefaults(preset: ParallaxPreset): { offset: number; scale?: number } {
  return PARALLAX_DEFAULTS[preset] ?? { offset: 0 };
}
