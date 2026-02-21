'use client';

import type { UserPreferences, UserPreferencesUpdate } from '@/shared/contracts/auth';
import { useUpdateUserPreferences, useUserPreferences as useSharedUserPreferences } from '@/shared/hooks/useUserPreferences';

export type { UserPreferences, UserPreferencesUpdate };

export function useUserPreferences() {
  return useSharedUserPreferences();
}

export function useUpdateUserPreferencesMutation() {
  return useUpdateUserPreferences();
}
