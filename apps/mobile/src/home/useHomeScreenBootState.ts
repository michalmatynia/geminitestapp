import { useKangurRouteBootState } from '../boot/useKangurRouteBootState';

const HOME_SCREEN_BOOT_FALLBACK_TIMEOUT_MS = 240;

export const useHomeScreenBootState = (bootKey: string): boolean => {
  return useKangurRouteBootState({
    bootKey,
    // Fail open when native interactions never drain so the shell cannot stay mounted forever.
    fallbackTimeoutMs: HOME_SCREEN_BOOT_FALLBACK_TIMEOUT_MS,
  });
};
