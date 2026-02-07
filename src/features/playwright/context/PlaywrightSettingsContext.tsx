'use client';

import React, { createContext, useContext, ReactNode, Dispatch, SetStateAction } from 'react';

import type { PlaywrightSettings } from '@/features/playwright/types';

interface PlaywrightSettingsContextType {
  settings: PlaywrightSettings;
  setSettings: Dispatch<SetStateAction<PlaywrightSettings>>;
}

const PlaywrightSettingsContext = createContext<PlaywrightSettingsContextType | undefined>(undefined);

export function PlaywrightSettingsProvider({
  children,
  settings,
  setSettings,
}: {
  children: ReactNode;
  settings: PlaywrightSettings;
  setSettings: Dispatch<SetStateAction<PlaywrightSettings>>;
}): React.JSX.Element {
  return (
    <PlaywrightSettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </PlaywrightSettingsContext.Provider>
  );
}

export function usePlaywrightSettings(): PlaywrightSettingsContextType {
  const context = useContext(PlaywrightSettingsContext);
  if (!context) {
    throw new Error('usePlaywrightSettings must be used within a PlaywrightSettingsProvider');
  }
  return context;
}
