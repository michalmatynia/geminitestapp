import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';
import type { UseAdminKangurLessonsManagerStateReturn } from '../AdminKangurLessonsManagerPage.hooks';

type LessonsManagerContextValue = UseAdminKangurLessonsManagerStateReturn;

export const LessonsManagerContext = createContext<LessonsManagerContextValue | undefined>(undefined);

export const useLessonsManager = () => {
  const context = useContext(LessonsManagerContext);
  if (!context) throw new Error('useLessonsManager must be used within a LessonsManagerProvider');
  return context;
};
