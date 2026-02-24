'use client';

import React, { createContext, useContext } from 'react';

export type AiPathsSettingsTab = 'canvas' | 'paths' | 'docs';

export type AiPathsSettingsPageContextValue = {
  activeTab: AiPathsSettingsTab;
  renderActions?: ((actions: React.ReactNode) => React.ReactNode) | undefined;
  onTabChange?: ((tab: AiPathsSettingsTab) => void) | undefined;
  isFocusMode?: boolean | undefined;
  onFocusModeChange?: ((next: boolean) => void) | undefined;
};

type AiPathsSettingsPageProviderProps = {
  value: AiPathsSettingsPageContextValue;
  children: React.ReactNode;
};

const AiPathsSettingsPageContext = createContext<AiPathsSettingsPageContextValue | null>(null);

export function AiPathsSettingsPageProvider({
  value,
  children,
}: AiPathsSettingsPageProviderProps): React.JSX.Element {
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
