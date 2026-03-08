'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { KangurMode } from '@/features/kangur/ui/types';
import { internalError } from '@/shared/errors/app-error';

type KangurGameContextValue = {
  mode: KangurMode | null;
  onBack: () => void;
};

const KangurGameContext = createContext<KangurGameContextValue | null>(null);

type KangurGameProviderProps = {
  mode: KangurMode | null;
  onBack: () => void;
  children: ReactNode;
};

export const KangurGameProvider = ({
  mode,
  onBack,
  children,
}: KangurGameProviderProps): React.JSX.Element => {
  const value = useMemo(
    () => ({
      mode,
      onBack,
    }),
    [mode, onBack]
  );

  return <KangurGameContext.Provider value={value}>{children}</KangurGameContext.Provider>;
};

export const useKangurGameContext = (): KangurGameContextValue => {
  const context = useContext(KangurGameContext);
  if (!context) {
    throw internalError('useKangurGameContext must be used within a KangurGameProvider');
  }
  return context;
};
