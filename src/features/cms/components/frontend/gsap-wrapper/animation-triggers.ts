import type { GsapAnimationConfig } from '@/features/gsap/public';
import { DEFAULT_ANIMATION_CONFIG } from '@/features/gsap/public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export const buildEaseValue = (
  easing: string | undefined,
  customEase: string | undefined,
  CustomEase: typeof import('gsap/CustomEase').CustomEase
): string => {
  if (easing && easing !== 'custom') return easing;
  if (!customEase) return DEFAULT_ANIMATION_CONFIG.easing;
  const hash = customEase.split('').reduce((acc: number, char: string) => {
    return (acc << 5) - acc + char.charCodeAt(0);
  }, 0);
  const name = `custom-${Math.abs(hash)}`;
  try {
    CustomEase.create(name, customEase);
  } catch (error) {
    logClientError(error);
    return DEFAULT_ANIMATION_CONFIG.easing;
  }
  return name;
};

export const buildScrollTrigger = (
  config: GsapAnimationConfig,
  root: HTMLElement,
  targetCount: number
): ScrollTrigger.Vars | undefined => {
  const scrollMode = config.scrollMode ?? 'none';
  const isScroll = config.trigger === 'scroll' || scrollMode !== 'none';
  if (!isScroll) return undefined;
  const scrub =
    scrollMode === 'scrub' || scrollMode === 'pin' || scrollMode === 'story'
      ? (config.scrollScrub ?? DEFAULT_ANIMATION_CONFIG.scrollScrub ?? 0.6)
      : false;
  const pin = scrollMode === 'pin' || scrollMode === 'story' ? true : (config.scrollPin ?? false);
  const snap = config.scrollSnap
    ? {
      snapTo: Math.max(1, targetCount - 1) ? 1 / Math.max(1, targetCount - 1) : 1,
      duration: config.scrollSnapDuration ?? DEFAULT_ANIMATION_CONFIG.scrollSnapDuration ?? 0.3,
    }
    : undefined;
  return {
    trigger: root,
    start: config.scrollStart ?? DEFAULT_ANIMATION_CONFIG.scrollStart ?? 'top 80%',
    end: config.scrollEnd ?? DEFAULT_ANIMATION_CONFIG.scrollEnd ?? 'bottom top',
    scrub,
    pin,
    ...(snap ? { snap } : {}),
    toggleActions: 'play none none reverse',
  };
};
