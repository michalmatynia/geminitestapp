import React from 'react';
import { useLocale } from '@/shared/lib/i18n';
import { useLessonsState } from './hooks/lessons-manager/useLessonsState';
import { useLessonsUiState } from './hooks/lessons-manager/useLessonsUiState';
import { resolveKangurAdminLocale } from './utils';

export function useAdminKangurLessonsManagerState(): any {
  const routeLocale = useLocale();
  const [contentLocale, setContentLocale] = React.useState(() => resolveKangurAdminLocale(routeLocale));
  
  const state = useLessonsState(contentLocale);
  const ui = useLessonsUiState();

  const isSaving = 
    state.lessonsQuery.isPending || 
    state.lessonDocumentsQuery.isPending || 
    state.templatesQuery.isPending;

  return {
    contentLocale,
    setContentLocale,
    ...state,
    ...ui,
    isSaving,
  };
}
