'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { KangurTestSuite } from '@/shared/contracts/kangur-tests';

type KangurQuestionsManagerRuntimeContextValue = {
  suite: KangurTestSuite;
  onClose: () => void;
};

const KangurQuestionsManagerRuntimeContext =
  createContext<KangurQuestionsManagerRuntimeContextValue | null>(null);

type KangurQuestionsManagerRuntimeProviderProps = KangurQuestionsManagerRuntimeContextValue & {
  children: ReactNode;
};

export function KangurQuestionsManagerRuntimeProvider({
  suite,
  onClose,
  children,
}: KangurQuestionsManagerRuntimeProviderProps): React.JSX.Element {
  const value = useMemo(
    () => ({
      suite,
      onClose,
    }),
    [onClose, suite]
  );

  return (
    <KangurQuestionsManagerRuntimeContext.Provider value={value}>
      {children}
    </KangurQuestionsManagerRuntimeContext.Provider>
  );
}

export function useKangurQuestionsManagerRuntimeContext(): KangurQuestionsManagerRuntimeContextValue {
  const context = useContext(KangurQuestionsManagerRuntimeContext);
  if (!context) {
    throw new Error(
      'useKangurQuestionsManagerRuntimeContext must be used within a KangurQuestionsManagerRuntimeProvider'
    );
  }
  return context;
}

export const useOptionalKangurQuestionsManagerRuntimeContext =
  (): KangurQuestionsManagerRuntimeContextValue | null =>
    useContext(KangurQuestionsManagerRuntimeContext);
