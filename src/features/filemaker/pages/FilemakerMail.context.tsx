'use client';

import React from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import { useAdminFilemakerMailPageState, type MailPageState } from './AdminFilemakerMailPage.hooks';

const {
  Context: MailPageContext,
  useStrictContext: useMailPageContext,
} = createStrictContext<MailPageState>({
  hookName: 'useMailPageContext',
  providerName: 'a MailPageProvider',
  displayName: 'MailPageContext',
});

export { useMailPageContext };

export function MailPageProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const state = useAdminFilemakerMailPageState();
  return (
    <MailPageContext.Provider value={state}>
      {children}
    </MailPageContext.Provider>
  );
}
