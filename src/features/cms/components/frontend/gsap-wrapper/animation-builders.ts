import type { GsapAnimationConfig } from '@/features/gsap/public';
import { DEFAULT_ANIMATION_CONFIG } from '@/features/gsap/public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { type UnknownRecordDto } from '@/shared/contracts/base';

type GSAPStaggerVars = UnknownRecordDto;

export const buildTargets = (root: HTMLElement, selector?: string): Element[] => {
  const normalized = (selector ?? '').trim();
  if (!normalized || normalized === ':scope') return [root];
  if (normalized === ':scope > *') return Array.from(root.children);
  if (normalized === ':scope *') return Array.from(root.querySelectorAll('*'));
  try {
    const matches = Array.from(root.querySelectorAll(normalized));
    return matches.length ? matches : [root];
  } catch (error) {
    logClientError(error);
    return [root];
  }
};

export const buildStagger = (
  config: GsapAnimationConfig,
  targetCount: number
): GSAPStaggerVars | undefined => {
  if (targetCount <= 1) return undefined;
  const hasStagger =
    config.preset === 'stagger' || (config.staggerEach ?? 0) > 0 || (config.staggerAmount ?? 0) > 0;
  if (!hasStagger) return undefined;
  const from = config.staggerFrom ?? DEFAULT_ANIMATION_CONFIG.staggerFrom ?? 'start';
  const amount = config.staggerAmount ?? 0;
  if (amount > 0) {
    return { amount, from };
  }
  const each = config.staggerEach ?? 0.12;
  return { each, from };
};

export const buildEase = (
  config: GsapAnimationConfig,
  CustomEase: typeof import('gsap/CustomEase').CustomEase
): string => {
  if (config.easing !== 'custom') {
    return config.easing ?? DEFAULT_ANIMATION_CONFIG.easing;
  }
  const value = (config.customEase ?? '').trim();
  if (!value) return DEFAULT_ANIMATION_CONFIG.easing;
  const hash = value.split('').reduce((acc: number, char: string) => {
    return (acc << 5) - acc + char.charCodeAt(0);
  }, 0);
  const name = `custom-${Math.abs(hash)}`;
  try {
    CustomEase.create(name, value);
  } catch (error) {
    logClientError(error);
    return DEFAULT_ANIMATION_CONFIG.easing;
  }
  return name;
};
