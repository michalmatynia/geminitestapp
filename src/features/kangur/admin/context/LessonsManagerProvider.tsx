import React from 'react';
import { LessonsManagerContext } from './LessonsManagerContext';
import { useAdminKangurLessonsManagerState } from '../AdminKangurLessonsManagerPage.hooks';

export const LessonsManagerProvider = ({ children }: { children: React.ReactNode }) => {
  const state = useAdminKangurLessonsManagerState();
  return <LessonsManagerContext.Provider value={state}>{children}</LessonsManagerContext.Provider>;
};
