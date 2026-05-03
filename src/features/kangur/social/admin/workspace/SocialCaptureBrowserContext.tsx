'use client';

import React, { createContext, useContext } from 'react';
import type { SocialCaptureBrowserState } from './hooks/useSocialCaptureBrowserState';

const SocialCaptureBrowserContext = createContext<SocialCaptureBrowserState | null>(null);

export function useSocialCaptureBrowser(): SocialCaptureBrowserState {
  const context = useContext(SocialCaptureBrowserContext);
  if (!context) {
    throw new Error('useSocialCaptureBrowser must be used within a SocialCaptureBrowserProvider');
  }
  return context;
}

export function SocialCaptureBrowserProvider({
  children,
  state,
}: {
  children: React.ReactNode;
  state: SocialCaptureBrowserState;
}): React.JSX.Element {
  return (
    <SocialCaptureBrowserContext.Provider value={state}>
      {children}
    </SocialCaptureBrowserContext.Provider>
  );
}
