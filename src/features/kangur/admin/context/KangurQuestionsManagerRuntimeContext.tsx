'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { KangurTestSuite } from '@/shared/contracts/kangur-tests';
import { internalError } from '@/shared/errors/app-error';
import type { KangurQuestionsManagerInitialView } from '../question-manager-view';

type KangurQuestionsManagerRuntimeContextValue = {
  suite: KangurTestSuite;
  onClose: () => void;
  initialView?: KangurQuestionsManagerInitialView;
};

const KangurQuestionsManagerRuntimeContext =
  createContext<KangurQuestionsManagerRuntimeContextValue | null>(null);

type KangurQuestionsManagerRuntimeProviderProps = KangurQuestionsManagerRuntimeContextValue & {
  children: ReactNode;
};

export function KangurQuestionsManagerRuntimeProvider({
  suite,
  onClose,
  initialView,
  children,
}: KangurQuestionsManagerRuntimeProviderProps): React.JSX.Element {
  const value = useMemo(
    () => ({
      suite,
      onClose,
      initialView,
    }),
    [initialView, onClose, suite]
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
    throw internalError(
      'useKangurQuestionsManagerRuntimeContext must be used within a KangurQuestionsManagerRuntimeProvider'
    );
  }
  return context;
}

export const useOptionalKangurQuestionsManagerRuntimeContext =
  (): KangurQuestionsManagerRuntimeContextValue | null =>
    useContext(KangurQuestionsManagerRuntimeContext);
