'use client';

import React from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import { useSocialPostContext } from '../SocialPostContext';
import { useSocialSettingsModalState } from './SocialSettingsModal.hooks';

type SocialSettingsModalState = ReturnType<typeof useSocialSettingsModalState>;

const {
  Context: SocialSettingsModalContext,
  useStrictContext: useSocialSettingsModalContext,
} = createStrictContext<SocialSettingsModalState>({
  hookName: 'useSocialSettingsModalContext',
  providerName: 'a SocialSettingsModalProvider',
  displayName: 'SocialSettingsModalContext',
});

export { useSocialSettingsModalContext };

export function SocialSettingsModalProvider({ children }: { children: React.ReactNode }) {
  const context = useSocialPostContext();
  const state = useSocialSettingsModalState(context);

  return (
    <SocialSettingsModalContext.Provider value={state}>
      {children}
    </SocialSettingsModalContext.Provider>
  );
}
