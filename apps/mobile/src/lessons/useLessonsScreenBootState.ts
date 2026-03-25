import { useKangurRouteBootState } from '../boot/useKangurRouteBootState';

const LESSONS_SCREEN_BOOT_FALLBACK_TIMEOUT_MS = 480;

export const useLessonsScreenBootState = (bootKey: string): boolean => {
  return useKangurRouteBootState({
    bootKey,
    // Fail open when native interactions never drain so the lesson skeleton cannot hang forever.
    fallbackTimeoutMs: LESSONS_SCREEN_BOOT_FALLBACK_TIMEOUT_MS,
  });
};
