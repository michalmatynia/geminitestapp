'use client';

import { createContext, useContext, useMemo, type JSX, type ReactNode } from 'react';

type KangurLessonPrintContextValue = {
  isPrintable: boolean;
  onPrintPanel?: (panelId?: string) => void;
};

const KangurLessonPrintContext = createContext<KangurLessonPrintContextValue | null>(null);

export function KangurLessonPrintProvider({
  children,
  onPrintPanel,
}: {
  children: ReactNode;
  onPrintPanel?: (panelId?: string) => void;
}): JSX.Element {
  const value = useMemo<KangurLessonPrintContextValue>(
    () => ({
      isPrintable: Boolean(onPrintPanel),
      onPrintPanel,
    }),
    [onPrintPanel]
  );

  return (
    <KangurLessonPrintContext.Provider value={value}>
      {children}
    </KangurLessonPrintContext.Provider>
  );
}

export const useOptionalKangurLessonPrint = (): KangurLessonPrintContextValue | null =>
  useContext(KangurLessonPrintContext);
