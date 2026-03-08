'use client';

const REDUCED_MOTION_MEDIA_QUERY = '(prefers-reduced-motion: reduce)';

export const userPrefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia(REDUCED_MOTION_MEDIA_QUERY).matches;
};

export const getMotionSafeScrollBehavior = (
  behavior: ScrollBehavior | undefined
): ScrollBehavior | undefined => {
  if (behavior !== 'smooth') {
    return behavior;
  }

  return userPrefersReducedMotion() ? 'auto' : 'smooth';
};
