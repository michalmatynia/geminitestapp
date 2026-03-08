'use client';

import { getKangurClientStorage } from './kangur-client-storage';

export const KANGUR_ACTIVE_LEARNER_STORAGE_KEY = 'kangur.activeLearnerId';

export const getStoredActiveLearnerId = (): string | null => {
  const value = getKangurClientStorage().getItem(KANGUR_ACTIVE_LEARNER_STORAGE_KEY)?.trim() ?? '';
  return value.length > 0 ? value : null;
};

export const setStoredActiveLearnerId = (learnerId: string | null | undefined): void => {
  const storage = getKangurClientStorage();
  const normalized = typeof learnerId === 'string' ? learnerId.trim() : '';
  if (normalized.length === 0) {
    storage.removeItem(KANGUR_ACTIVE_LEARNER_STORAGE_KEY);
    return;
  }

  storage.setItem(KANGUR_ACTIVE_LEARNER_STORAGE_KEY, normalized);
};

export const clearStoredActiveLearnerId = (): void => {
  getKangurClientStorage().removeItem(KANGUR_ACTIVE_LEARNER_STORAGE_KEY);
};
