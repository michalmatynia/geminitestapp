'use client';

import React, { createContext, useContext } from 'react';
import { useSocialPostContext } from '../SocialPostContext';
import { useSocialSettingsModalState } from './SocialSettingsModal.hooks';

type SocialSettingsModalState = ReturnType<typeof useSocialSettingsModalState>;

const SocialSettingsModalContext = createContext<SocialSettingsModalState | null>(null);

export function SocialSettingsModalProvider({ children }: { children: React.ReactNode }) {
  const context = useSocialPostContext();
  const state = useSocialSettingsModalState(context);

  return (
    <SocialSettingsModalContext.Provider value={state}>
      {children}
    </SocialSettingsModalContext.Provider>
  );
}

export function useSocialSettingsModalContext() {
  const context = useContext(SocialSettingsModalContext);
  if (!context) {
    throw new Error('useSocialSettingsModalContext must be used within a SocialSettingsModalProvider');
  }
  return context;
}
