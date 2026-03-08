'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { internalError } from '@/shared/errors/app-error';

type KangurLessonBackAction = () => void;

const KangurLessonNavigationContext = createContext<KangurLessonBackAction | null>(null);

export function KangurLessonNavigationProvider({
  onBack,
  children,
}: {
  onBack: KangurLessonBackAction;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <KangurLessonNavigationContext.Provider value={onBack}>
      {children}
    </KangurLessonNavigationContext.Provider>
  );
}

export function KangurLessonNavigationBoundary({
  onBack,
  children,
}: {
  onBack?: KangurLessonBackAction;
  children: ReactNode;
}): React.JSX.Element {
  if (!onBack) {
    return <>{children}</>;
  }

  return <KangurLessonNavigationProvider onBack={onBack}>{children}</KangurLessonNavigationProvider>;
}

export const useKangurLessonBackAction = (
  overrideOnBack?: KangurLessonBackAction
): KangurLessonBackAction => {
  const context = useContext(KangurLessonNavigationContext);

  if (overrideOnBack) {
    return overrideOnBack;
  }

  if (!context) {
    throw internalError(
      'useKangurLessonBackAction must be used within a KangurLessonNavigationProvider'
    );
  }

  return context;
};
