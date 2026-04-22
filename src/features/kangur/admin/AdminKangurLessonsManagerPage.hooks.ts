import React from 'react';
import { useLocale } from '@/shared/lib/i18n';
import { useLessonsState } from './hooks/lessons-manager/useLessonsState';
import { useLessonsUiState } from './hooks/lessons-manager/useLessonsUiState';
import {
  KANGUR_ADMIN_LOCALES,
  resolveKangurAdminLocale,
} from './kangur-admin-locale';

const formatContentLocaleLabel = (locale: (typeof KANGUR_ADMIN_LOCALES)[number]): string => {
  if (locale === 'pl') return 'Polish';
  if (locale === 'uk') return 'Ukrainian';
  return 'English';
};

export function useAdminKangurLessonsManagerState(): any {
  const routeLocale = useLocale();
  const [contentLocale, setContentLocale] = React.useState(() => resolveKangurAdminLocale(routeLocale));
  
  const state = useLessonsState(contentLocale);
  const ui = useLessonsUiState();
  const contentLocaleOptions = React.useMemo(
    () =>
      KANGUR_ADMIN_LOCALES.map((locale) => ({
        value: locale,
        label: formatContentLocaleLabel(locale),
      })),
    []
  );
  const contentLocaleLabel = React.useMemo(
    () => formatContentLocaleLabel(contentLocale),
    [contentLocale]
  );

  const isSaving = 
    state.lessonsQuery.isPending || 
    state.lessonDocumentsQuery.isPending || 
    state.templatesQuery.isPending;

  return {
    contentLocale,
    setContentLocale,
    contentLocaleOptions,
    contentLocaleLabel,
    ...state,
    ...ui,
    isSaving,
  };
}
