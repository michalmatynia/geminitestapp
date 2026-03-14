export const KANGUR_ACTIVE_LEARNER_STORAGE_KEY = 'kangur.activeLearnerId';

const canUseStorage = (): boolean => typeof window !== 'undefined' && Boolean(window.localStorage);

export const getStoredActiveLearnerId = (): string | null => {
  if (!canUseStorage()) {
    return null;
  }
  const value = window.localStorage.getItem(KANGUR_ACTIVE_LEARNER_STORAGE_KEY)?.trim() ?? '';
  return value.length > 0 ? value : null;
};

export const setStoredActiveLearnerId = (learnerId: string | null | undefined): void => {
  if (!canUseStorage()) {
    return;
  }
  const normalized = typeof learnerId === 'string' ? learnerId.trim() : '';
  if (normalized.length === 0) {
    window.localStorage.removeItem(KANGUR_ACTIVE_LEARNER_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(KANGUR_ACTIVE_LEARNER_STORAGE_KEY, normalized);
};

export const clearStoredActiveLearnerId = (): void => {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.removeItem(KANGUR_ACTIVE_LEARNER_STORAGE_KEY);
};
