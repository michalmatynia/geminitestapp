import { DEFAULT_ANIMATION_CONFIG, PARALLAX_DEFAULTS } from '@/features/gsap/public';
import type { GsapAnimationConfig, AnimationPreset } from '@/features/gsap/public';
import { vectorShapesToPathWithBounds } from '@/shared/ui/data-display.public';
import { type UnknownRecordDto } from '@/shared/contracts/base';

type GSAPTweenVars = UnknownRecordDto;

export const buildKeyframes = (preset: AnimationPreset): GSAPTweenVars | null => {
  if (preset === 'shake') {
    return { keyframes: [{ x: -6 }, { x: 6 }, { x: -4 }, { x: 4 }, { x: -2 }, { x: 2 }, { x: 0 }] };
  }
  if (preset === 'wiggle') {
    return { keyframes: [{ rotation: -4 }, { rotation: 4 }, { rotation: -3 }, { rotation: 3 }, { rotation: 0 }] };
  }
  if (preset === 'wobble') {
    return { keyframes: [{ rotation: -6, scale: 0.98 }, { rotation: 6, scale: 1.02 }, { rotation: -4, scale: 0.99 }, { rotation: 4, scale: 1.01 }, { rotation: 0, scale: 1 }] };
  }
  return null;
};

export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export const resolveMotionPath = (config: GsapAnimationConfig, root: HTMLElement): string => {
  const configuredPath = (config.motionPathPath ?? '').trim();
  if (configuredPath) return configuredPath;
  const shapes = config.motionPathShapes ?? [];
  if (!shapes.length) return '';
  const rect = root.getBoundingClientRect();
  return vectorShapesToPathWithBounds(shapes, rect.width, rect.height);
};

export const buildMotionPathVars = (config: GsapAnimationConfig, path: string): GSAPTweenVars => {
  const autoRotate = config.motionPathAutoRotate ? (config.motionPathRotateOffset ?? 0) : false;
  return {
    path,
    align: config.motionPathAlign ? path : false,
    autoRotate,
    start: clamp01(config.motionPathStart ?? 0),
    end: clamp01(config.motionPathEnd ?? 1),
  };
};

export const computeParallaxOffset = (
  config: GsapAnimationConfig,
  index: number,
  total: number
): number => {
  const base = (config.parallaxOffset ?? 0) !== 0 ? config.parallaxOffset ?? 0 : (PARALLAX_DEFAULTS[config.parallaxPreset ?? 'none'] && typeof PARALLAX_DEFAULTS[config.parallaxPreset ?? 'none'] === 'object' ? (PARALLAX_DEFAULTS[config.parallaxPreset ?? 'none'] as any).offset : 0) ?? 0;
  if (base === 0) return 0;
  const reverse = config.parallaxReverse ? -1 : 1;
  const pattern = config.parallaxPattern ?? 'uniform';
  if (pattern === 'alternating') return base * (index % 2 === 0 ? 1 : -1) * reverse;
  if (pattern === 'stepped') return (base + (config.parallaxChildStep ?? DEFAULT_ANIMATION_CONFIG.parallaxChildStep ?? 16) * index) * reverse;
  if (pattern === 'layers') return base * (1 + (config.parallaxLayerStrength ?? DEFAULT_ANIMATION_CONFIG.parallaxLayerStrength ?? 0.35) * (total > 1 ? index / (total - 1) : 0)) * reverse;
  if (pattern === 'random') {
    const seed = (config.parallaxRandomSeed ?? DEFAULT_ANIMATION_CONFIG.parallaxRandomSeed ?? 7) + index * 17;
    const value = Math.sin(seed) * 10000;
    const rand = value - Math.floor(value);
    return base * (rand > 0.5 ? 1 : -1) * reverse;
  }
  return base * reverse;
};
