'use client';

import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import type { DataContractPreflightReport } from '@/shared/lib/ai-paths/core/utils/data-contract-preflight';
import type { AiPathsValidationConfig } from '@/shared/lib/ai-paths';
import type { StatusVariant } from '@/shared/contracts/ui/ui/base';

import type { UseAiPathsSettingsStateReturn } from './types';

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
  diagnosticsReady: boolean;
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
  pathSwitchOptions: Array<LabeledOptionDto<string>>;
  hasHistory: boolean;
  handleInspectTraceNode: (nodeId: string, focus: 'all' | 'failed') => Promise<void>;
};

const { Context: AiPathsSettingsPageContext, useStrictContext: useAiPathsSettingsPageContext } =
  createStrictContext<AiPathsSettingsPageContextValue>({
    hookName: 'useAiPathsSettingsPageContext',
    providerName: 'AiPathsSettingsPageProvider',
    displayName: 'AiPathsSettingsPageContext',
    errorFactory: internalError,
  });

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
export { useAiPathsSettingsPageContext };
