'use client';

import React, { createContext, useContext } from 'react';

import type { PlaywrightSettings } from '@/shared/contracts/playwright';
import { internalError } from '@/shared/errors/app-error';

import type { Dispatch, ReactNode, SetStateAction } from 'react';

export type PlaywrightSettingsContextType = {
  settings: PlaywrightSettings;
  setSettings: Dispatch<SetStateAction<PlaywrightSettings>>;
};

const PlaywrightSettingsContext = createContext<PlaywrightSettingsContextType | null>(null);

export type PlaywrightSettingsProviderProps = {
  settings: PlaywrightSettings;
  setSettings: Dispatch<SetStateAction<PlaywrightSettings>>;
  children: ReactNode;
};

export function PlaywrightSettingsProvider({
  settings,
  setSettings,
  children,
}: PlaywrightSettingsProviderProps): React.JSX.Element {
  return (
    <PlaywrightSettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </PlaywrightSettingsContext.Provider>
  );
}

export function usePlaywrightSettings(): PlaywrightSettingsContextType {
  const context = useContext(PlaywrightSettingsContext);
  if (!context) {
    throw internalError('usePlaywrightSettings must be used within a PlaywrightSettingsProvider');
  }
  return context;
}
