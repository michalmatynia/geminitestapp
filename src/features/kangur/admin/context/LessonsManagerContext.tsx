import { createContext, useContext } from 'react';
import type { UseAdminKangurLessonsManagerStateReturn } from '../AdminKangurLessonsManagerPage.hooks';

export const LessonsManagerContext = createContext<UseAdminKangurLessonsManagerStateReturn | undefined>(undefined);

export const useLessonsManager = (): UseAdminKangurLessonsManagerStateReturn => {
  const context = useContext(LessonsManagerContext);
  if (!context) throw new Error('useLessonsManager must be used within a LessonsManagerProvider');
  return context;
};
