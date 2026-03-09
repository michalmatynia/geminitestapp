'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { internalError } from '@/shared/errors/app-error';

type KangurLessonBackAction = () => void;

type KangurLessonNavigationContextValue = {
  onBack: KangurLessonBackAction;
  isSubsectionNavigationActive: boolean;
  registerSubsectionNavigation: () => () => void;
};

const KangurLessonNavigationContext = createContext<KangurLessonNavigationContextValue | null>(null);

export function KangurLessonNavigationProvider({
  onBack,
  children,
}: {
  onBack: KangurLessonBackAction;
  children: ReactNode;
}): React.JSX.Element {
  const [subsectionNavigationDepth, setSubsectionNavigationDepth] = useState(0);
  const registerSubsectionNavigation = useCallback(() => {
    setSubsectionNavigationDepth((currentDepth) => currentDepth + 1);

    return () => {
      setSubsectionNavigationDepth((currentDepth) => Math.max(0, currentDepth - 1));
    };
  }, []);
  const value = useMemo<KangurLessonNavigationContextValue>(
    () => ({
      onBack,
      isSubsectionNavigationActive: subsectionNavigationDepth > 0,
      registerSubsectionNavigation,
    }),
    [onBack, registerSubsectionNavigation, subsectionNavigationDepth]
  );

  return (
    <KangurLessonNavigationContext.Provider value={value}>
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

  return context.onBack;
};

export const useKangurLessonSubsectionNavigationActive = (): boolean =>
  useContext(KangurLessonNavigationContext)?.isSubsectionNavigationActive ?? false;

export const useKangurRegisterLessonSubsectionNavigation = (): (() => () => void) => {
  const context = useContext(KangurLessonNavigationContext);

  return useCallback(() => {
    if (!context) {
      return () => undefined;
    }

    return context.registerSubsectionNavigation();
  }, [context]);
};
