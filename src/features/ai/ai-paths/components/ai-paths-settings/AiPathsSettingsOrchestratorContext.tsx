'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { UseAiPathsSettingsStateReturn } from './types';

const AiPathsSettingsOrchestratorContext = createContext<UseAiPathsSettingsStateReturn | null>(
  null
);

interface AiPathsSettingsOrchestratorProviderProps {
  value: UseAiPathsSettingsStateReturn;
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

export function useAiPathsSettingsOrchestrator(): UseAiPathsSettingsStateReturn {
  const context = useContext(AiPathsSettingsOrchestratorContext);
  if (!context) {
    throw new Error(
      'useAiPathsSettingsOrchestrator must be used within AiPathsSettingsOrchestratorProvider'
    );
  }
  return context;
}
