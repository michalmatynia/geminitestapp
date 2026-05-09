/**
 * Playwright Settings Service
 * 
 * Provides logic for handling Playwright settings, normalization, and form state updates.
 */

import type { PlaywrightSettings } from '@/shared/contracts/playwright';

/**
 * Normalizes a string input to a number with a fallback.
 */
export const toNumber = (value: string, fallback: number): number => {
  if (value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Updates a specific field in the PlaywrightSettings object.
 */
export const updateSettingsField = <K extends keyof PlaywrightSettings>(
  setSettings: React.Dispatch<React.SetStateAction<PlaywrightSettings>>,
  key: K,
  value: PlaywrightSettings[K]
): void => {
  setSettings((prev) => ({
    ...prev,
    [key]: value,
  }));
};
