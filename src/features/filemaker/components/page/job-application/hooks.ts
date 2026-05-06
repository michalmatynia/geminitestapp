import { useCallback } from 'react';
import { LAST_SELECTED_PERSON_STORAGE_KEY } from './constants';

type JobApplicationState = {
  readLastSelectedPersonId: () => string;
  writeLastSelectedPersonId: (personId: string) => void;
};

export const useJobApplicationState = (): JobApplicationState => {
  const readLastSelectedPersonId = useCallback((): string => {
    if (typeof window === 'undefined') return '';
    try {
      return window.localStorage.getItem(LAST_SELECTED_PERSON_STORAGE_KEY)?.trim() ?? '';
    } catch {
      return '';
    }
  }, []);

  const writeLastSelectedPersonId = useCallback((personId: string): void => {
    if (typeof window === 'undefined') return;
    try {
      const normalizedPersonId = personId.trim();
      if (normalizedPersonId.length > 0) {
        window.localStorage.setItem(LAST_SELECTED_PERSON_STORAGE_KEY, normalizedPersonId);
      } else {
        window.localStorage.removeItem(LAST_SELECTED_PERSON_STORAGE_KEY);
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  return {
    readLastSelectedPersonId,
    writeLastSelectedPersonId,
  };
};
