'use client';

import React from 'react';

import { internalError } from '@/shared/errors/app-error';

type PlaywrightSettingsFormViewContextValue = {
  onSave?: () => void;
  saveLabel?: string;
  showSave?: boolean;
  title?: string;
  description?: string;
};

const PlaywrightSettingsFormViewContext =
  React.createContext<PlaywrightSettingsFormViewContextValue | null>(null);

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

export function usePlaywrightSettingsFormView(): PlaywrightSettingsFormViewContextValue {
  const context = React.useContext(PlaywrightSettingsFormViewContext);
  if (!context) {
    throw internalError(
      'usePlaywrightSettingsFormView must be used within PlaywrightSettingsFormViewProvider'
    );
  }
  return context;
}
