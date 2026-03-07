'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

type KangurTestSuiteRuntimeContextValue = {
  totalQuestions: number;
};

const KangurTestSuiteRuntimeContext = createContext<KangurTestSuiteRuntimeContextValue | null>(
  null
);

export function KangurTestSuiteRuntimeProvider({
  totalQuestions,
  children,
}: {
  totalQuestions: number;
  children: ReactNode;
}): React.JSX.Element {
  const value = useMemo(() => ({ totalQuestions }), [totalQuestions]);

  return (
    <KangurTestSuiteRuntimeContext.Provider value={value}>
      {children}
    </KangurTestSuiteRuntimeContext.Provider>
  );
}

export const useOptionalKangurTestSuiteRuntime = (): KangurTestSuiteRuntimeContextValue | null =>
  useContext(KangurTestSuiteRuntimeContext);
