'use client';

import { type ReactNode } from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import { useLessonsLogic } from './Lessons.hooks';

type LessonsContextValue = ReturnType<typeof useLessonsLogic>;

const { Context: LessonsContext, useStrictContext: useLessons } =
  createStrictContext<LessonsContextValue>({
    hookName: 'useLessons',
    providerName: 'LessonsProvider',
    displayName: 'LessonsContext',
    errorFactory: internalError,
  });

export { useLessons };

export function LessonsProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const value = useLessonsLogic();
  return (
    <LessonsContext.Provider value={value}>
      {children}
    </LessonsContext.Provider>
  );
}
