'use client';

import React, { createContext, useContext } from 'react';
import type { UseAiPathsSettingsStateReturn } from './types';
import type { AiPathsValidationConfig, DataContractPreflightReport } from '../../lib';
import type { StatusVariant } from '@/shared/ui';

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
  savePathConfig: UseAiPathsSettingsStateReturn['handleSave'];
  normalizedAiPathsValidation: AiPathsValidationConfig;
  nodeValidationEnabled: boolean;
  handleOpenNodeValidator: () => void;
  handleRunNodeValidationCheck: () => void;
  docsTooltipsEnabled: boolean;
  setDocsTooltipsEnabled: (enabled: boolean) => void;
  incrementLoadNonce: () => void;
  validationPreflightReport: {
    score: number;
    failedRules: number;
    blocked: boolean;
    shouldWarn: boolean;
    findings: unknown[];
    recommendations: unknown[];
    schemaVersion: number;
    skippedRuleIds: string[];
    moduleImpact: Record<string, unknown>;
  };
  selectedNodeIds: string[];
  selectionScopeMode: 'portion' | 'wiring';
  setSelectionScopeMode: React.Dispatch<React.SetStateAction<'portion' | 'wiring'>>;
  dataContractReport: DataContractPreflightReport;
  setDataContractInspectorNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  autoSaveVariant: StatusVariant;
  isPathNameEditing: boolean;
  renameDraft: string;
  setRenameDraft: React.Dispatch<React.SetStateAction<string>>;
  commitPathNameEdit: () => void;
  cancelPathNameEdit: () => void;
  startPathNameEdit: () => void;
  pathSwitchOptions: Array<{ label: string; value: string }>;
  hasHistory: boolean;
  handleInspectTraceNode: (nodeId: string, focus: 'all' | 'failed') => Promise<void>;
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
