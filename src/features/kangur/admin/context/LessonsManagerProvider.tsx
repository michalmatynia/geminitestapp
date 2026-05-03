import React from 'react';
import { LessonsManagerContext } from './LessonsManagerContext';
import { useAdminKangurLessonsManagerState, type UseAdminKangurLessonsManagerStateReturn } from '../AdminKangurLessonsManagerPage.hooks';

export const LessonsManagerProvider = ({ children }: { children: React.ReactNode }): React.JSX.Element => {
  const state: UseAdminKangurLessonsManagerStateReturn = useAdminKangurLessonsManagerState();
  return <LessonsManagerContext.Provider value={state}>{children}</LessonsManagerContext.Provider>;
};
