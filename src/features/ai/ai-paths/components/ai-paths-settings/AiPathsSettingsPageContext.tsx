'use client';

import React, { createContext, useContext } from 'react';
import type { UseAiPathsSettingsStateReturn } from './useAiPathsSettingsState';

export type AiPathsSettingsPageContextValue = UseAiPathsSettingsStateReturn & {
  activeTab: 'canvas' | 'paths' | 'docs';
  renderActions?: ((actions: React.ReactNode) => React.ReactNode) | undefined;
  onTabChange?: ((tab: 'canvas' | 'paths' | 'docs') => void) | undefined;
  isFocusMode?: boolean | undefined;
  onFocusModeChange?: ((next: boolean) => void) | undefined;
  pathSettingsModalOpen: boolean;
  setPathSettingsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  simulationModalOpen: boolean;
  setSimulationModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const AiPathsSettingsPageContext = createContext<AiPathsSettingsPageContextValue | null>(null);

export function AiPathsSettingsPageProvider({
  value,
  children,
}: {
  value: AiPathsSettingsPageContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <AiPathsSettingsPageContext.Provider value={value}>
      {children}
    </AiPathsSettingsPageContext.Provider>
  );
}

export function useAiPathsSettingsPageContext(): AiPathsSettingsPageContextValue {
  const context = useContext(AiPathsSettingsPageContext);
  if (!context) {
    throw new Error('useAiPathsSettingsPageContext must be used within AiPathsSettingsPageProvider');
  }
  return context;
}
