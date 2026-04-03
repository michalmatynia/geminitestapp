'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

type PlaywrightSettingsFormViewContextValue = {
  onSave?: () => void;
  saveLabel?: string;
  showSave?: boolean;
  title?: string;
  description?: string;
};

const {
  Context: PlaywrightSettingsFormViewContext,
  useStrictContext: usePlaywrightSettingsFormView,
} = createStrictContext<PlaywrightSettingsFormViewContextValue>({
  hookName: 'usePlaywrightSettingsFormView',
  providerName: 'PlaywrightSettingsFormViewProvider',
  errorFactory: internalError,
});

type PlaywrightSettingsFormViewProviderProps = {
  value: PlaywrightSettingsFormViewContextValue;
  children: React.ReactNode;
};

export function PlaywrightSettingsFormViewProvider({
  value,
  children,
}: PlaywrightSettingsFormViewProviderProps): React.JSX.Element {
  return (
    <PlaywrightSettingsFormViewContext.Provider value={value}>
      {children}
    </PlaywrightSettingsFormViewContext.Provider>
  );
}

export { usePlaywrightSettingsFormView };
