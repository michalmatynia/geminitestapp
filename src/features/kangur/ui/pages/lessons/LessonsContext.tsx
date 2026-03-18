'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { internalError } from '@/shared/errors/app-error';
import { useLessonsLogic } from './Lessons.hooks';

type LessonsContextValue = ReturnType<typeof useLessonsLogic>;

const LessonsContext = createContext<LessonsContextValue | null>(null);

export function LessonsProvider({ children }: { children: ReactNode }) {
  const value = useLessonsLogic();
  return (
    <LessonsContext.Provider value={value}>
      {children}
    </LessonsContext.Provider>
  );
}

export function useLessons() {
  const context = useContext(LessonsContext);
  if (!context) {
    throw internalError('useLessons must be used within a LessonsProvider');
  }
  return context;
}
