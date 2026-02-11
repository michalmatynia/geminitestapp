'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { AiPathsSettingsState } from './useAiPathsSettingsState';

const AiPathsSettingsOrchestratorContext = createContext<AiPathsSettingsState | null>(null);

interface AiPathsSettingsOrchestratorProviderProps {
  value: AiPathsSettingsState;
  children: ReactNode;
}

export function AiPathsSettingsOrchestratorProvider({
  value,
  children,
}: AiPathsSettingsOrchestratorProviderProps): React.JSX.Element {
  return (
    <AiPathsSettingsOrchestratorContext.Provider value={value}>
      {children}
    </AiPathsSettingsOrchestratorContext.Provider>
  );
}

export function useAiPathsSettingsOrchestrator(): AiPathsSettingsState {
  const context = useContext(AiPathsSettingsOrchestratorContext);
  if (!context) {
    throw new Error(
      'useAiPathsSettingsOrchestrator must be used within AiPathsSettingsOrchestratorProvider'
    );
  }
  return context;
}
