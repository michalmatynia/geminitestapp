'use client';

import { useUpdateUserPreferences, useUserPreferences as useSharedUserPreferences } from '@/shared/hooks/useUserPreferences';
import type { UserPreferences, UserPreferencesUpdate } from '@/shared/types/domain/user-preferences';

export type { UserPreferences, UserPreferencesUpdate };

export function useUserPreferences() {
  return useSharedUserPreferences();
}

export function useUpdateUserPreferencesMutation() {
  return useUpdateUserPreferences();
}
