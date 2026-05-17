'use client';

import { createContext, useContext, useMemo } from 'react';

import type { ReactNode } from 'react';

type KangurClientBootOptions = {
  skipInitialClientBootLoader: boolean;
};

const DEFAULT_KANGUR_CLIENT_BOOT_OPTIONS: KangurClientBootOptions = {
  skipInitialClientBootLoader: false,
};

const KangurClientBootOptionsContext = createContext<KangurClientBootOptions>(
  DEFAULT_KANGUR_CLIENT_BOOT_OPTIONS
);

export function KangurClientBootOptionsProvider({
  children,
  skipInitialClientBootLoader = false,
}: {
  children: ReactNode;
  skipInitialClientBootLoader?: boolean;
}): React.JSX.Element {
  const value = useMemo<KangurClientBootOptions>(
    () => ({ skipInitialClientBootLoader }),
    [skipInitialClientBootLoader]
  );

  return (
    <KangurClientBootOptionsContext.Provider value={value}>
      {children}
    </KangurClientBootOptionsContext.Provider>
  );
}

export function useKangurClientBootOptions(): KangurClientBootOptions {
  return useContext(KangurClientBootOptionsContext);
}
