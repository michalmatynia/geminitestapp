'use client';

import React, { createContext, useContext } from 'react';
import { useAdminFilemakerMailPageState, type MailPageState } from './AdminFilemakerMailPage.hooks';

const MailPageContext = createContext<MailPageState | null>(null);

export function MailPageProvider({ children }: { children: React.ReactNode }) {
  const state = useAdminFilemakerMailPageState();
  return (
    <MailPageContext.Provider value={state}>
      {children}
    </MailPageContext.Provider>
  );
}

export function useMailPageContext(): MailPageState {
  const context = useContext(MailPageContext);
  if (!context) {
    throw new Error('useMailPageContext must be used within a MailPageProvider');
  }
  return context as MailPageState;
}
