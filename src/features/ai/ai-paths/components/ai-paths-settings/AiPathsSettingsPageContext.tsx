'use client';

import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import type { DataContractPreflightReport } from '@/shared/lib/ai-paths/core/utils/data-contract-preflight';
import type { AiPathsValidationConfig } from '@/shared/contracts/ai-paths';
import type { StatusVariant } from '@/shared/contracts/ui/base';

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

export type AiPathsSettingsPageWorkspaceContextValue = Pick<
  AiPathsSettingsPageContextValue,
  | 'activeTab'
  | 'renderActions'
  | 'onTabChange'
  | 'isFocusMode'
  | 'onFocusModeChange'
  | 'pathSettingsModalOpen'
  | 'setPathSettingsModalOpen'
  | 'simulationModalOpen'
  | 'setSimulationModalOpen'
  | 'toast'
>;

export type AiPathsSettingsPageCanvasInteractionsContextValue = Pick<
  AiPathsSettingsPageContextValue,
  | 'nodes'
  | 'edges'
  | 'palette'
  | 'isPathTreeVisible'
  | 'setIsPathTreeVisible'
  | 'isInspectorVisible'
  | 'setIsInspectorVisible'
  | 'confirmNodeSwitch'
  | 'handleDeleteSelectedNode'
>;

export type AiPathsSettingsPagePresetsContextValue = Pick<
  AiPathsSettingsPageContextValue,
  | 'clusterPresets'
  | 'presetDraft'
  | 'setPresetDraft'
  | 'editingPresetId'
  | 'handleResetPresetDraft'
  | 'handlePresetFromSelection'
  | 'handleSavePreset'
  | 'handleLoadPreset'
  | 'handleApplyPreset'
  | 'handleDeletePreset'
  | 'handleExportPresets'
  | 'handleImportPresets'
  | 'presetsModalOpen'
  | 'setPresetsModalOpen'
  | 'presetsJson'
  | 'setPresetsJson'
>;

export type AiPathsSettingsPageRuntimeContextValue = Pick<
  AiPathsSettingsPageContextValue,
  | 'runtimeRunStatus'
  | 'lastRunAt'
  | 'lastError'
  | 'hasHistory'
  | 'handleInspectTraceNode'
>;

export type AiPathsSettingsPagePathActionsContextValue = Pick<
  AiPathsSettingsPageContextValue,
  | 'activePathId'
  | 'pathName'
  | 'paths'
  | 'pathConfigs'
  | 'pathSwitchOptions'
  | 'renameDraft'
  | 'setRenameDraft'
  | 'isPathNameEditing'
  | 'commitPathNameEdit'
  | 'cancelPathNameEdit'
  | 'startPathNameEdit'
  | 'handleSwitchPath'
  | 'handleCreatePath'
  | 'handleCreateFromTemplate'
  | 'handleDuplicatePath'
  | 'handleDeletePath'
  | 'handleMovePathToFolder'
  | 'handleMoveFolder'
  | 'handleRenameFolder'
  | 'handleTogglePathLock'
  | 'isPathLocked'
  | 'handleTogglePathActive'
  | 'isPathActive'
>;

export type AiPathsSettingsPagePersistenceContextValue = Pick<
  AiPathsSettingsPageContextValue,
  | 'savePathConfig'
  | 'saving'
  | 'incrementLoadNonce'
  | 'persistLastError'
  | 'persistPathSettings'
  | 'autoSaveLabel'
  | 'autoSaveVariant'
  | 'handleClearConnectorData'
  | 'handleClearHistory'
>;

export type AiPathsSettingsPageDiagnosticsContextValue = Pick<
  AiPathsSettingsPageContextValue,
  | 'diagnosticsReady'
  | 'normalizedAiPathsValidation'
  | 'nodeValidationEnabled'
  | 'updateAiPathsValidation'
  | 'handleOpenNodeValidator'
  | 'handleRunNodeValidationCheck'
  | 'docsTooltipsEnabled'
  | 'setDocsTooltipsEnabled'
  | 'validationPreflightReport'
  | 'selectionScopeMode'
  | 'setSelectionScopeMode'
  | 'dataContractReport'
  | 'setDataContractInspectorNodeId'
>;

const createAiPathsSettingsPageStrictContext = <T,>(hookName: string, displayName: string) =>
  createStrictContext<T>({
    hookName,
    providerName: 'AiPathsSettingsPageProvider',
    displayName,
    errorFactory: internalError,
  });

const { Context: AiPathsSettingsPageContext, useStrictContext: useAiPathsSettingsPageContext } =
  createAiPathsSettingsPageStrictContext<AiPathsSettingsPageContextValue>(
    'useAiPathsSettingsPageContext',
    'AiPathsSettingsPageContext'
  );

const {
  Context: AiPathsSettingsPageWorkspaceContext,
  useStrictContext: useAiPathsSettingsPageWorkspaceContext,
} = createAiPathsSettingsPageStrictContext<AiPathsSettingsPageWorkspaceContextValue>(
  'useAiPathsSettingsPageWorkspaceContext',
  'AiPathsSettingsPageWorkspaceContext'
);

const {
  Context: AiPathsSettingsPageCanvasInteractionsContext,
  useStrictContext: useAiPathsSettingsPageCanvasInteractionsContext,
} = createAiPathsSettingsPageStrictContext<AiPathsSettingsPageCanvasInteractionsContextValue>(
  'useAiPathsSettingsPageCanvasInteractionsContext',
  'AiPathsSettingsPageCanvasInteractionsContext'
);

const {
  Context: AiPathsSettingsPagePresetsContext,
  useStrictContext: useAiPathsSettingsPagePresetsContext,
} = createAiPathsSettingsPageStrictContext<AiPathsSettingsPagePresetsContextValue>(
  'useAiPathsSettingsPagePresetsContext',
  'AiPathsSettingsPagePresetsContext'
);

const {
  Context: AiPathsSettingsPageRuntimeContext,
  useStrictContext: useAiPathsSettingsPageRuntimeContext,
} = createAiPathsSettingsPageStrictContext<AiPathsSettingsPageRuntimeContextValue>(
  'useAiPathsSettingsPageRuntimeContext',
  'AiPathsSettingsPageRuntimeContext'
);

const {
  Context: AiPathsSettingsPagePathActionsContext,
  useStrictContext: useAiPathsSettingsPagePathActionsContext,
} = createAiPathsSettingsPageStrictContext<AiPathsSettingsPagePathActionsContextValue>(
  'useAiPathsSettingsPagePathActionsContext',
  'AiPathsSettingsPagePathActionsContext'
);

const {
  Context: AiPathsSettingsPagePersistenceContext,
  useStrictContext: useAiPathsSettingsPagePersistenceContext,
} = createAiPathsSettingsPageStrictContext<AiPathsSettingsPagePersistenceContextValue>(
  'useAiPathsSettingsPagePersistenceContext',
  'AiPathsSettingsPagePersistenceContext'
);

const {
  Context: AiPathsSettingsPageDiagnosticsContext,
  useStrictContext: useAiPathsSettingsPageDiagnosticsContext,
} = createAiPathsSettingsPageStrictContext<AiPathsSettingsPageDiagnosticsContextValue>(
  'useAiPathsSettingsPageDiagnosticsContext',
  'AiPathsSettingsPageDiagnosticsContext'
);

export function AiPathsSettingsPageProvider({
  value,
  children,
}: {
  value: AiPathsSettingsPageContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  const workspaceValue = React.useMemo<AiPathsSettingsPageWorkspaceContextValue>(
    () => ({
      activeTab: value.activeTab,
      renderActions: value.renderActions,
      onTabChange: value.onTabChange,
      isFocusMode: value.isFocusMode,
      onFocusModeChange: value.onFocusModeChange,
      pathSettingsModalOpen: value.pathSettingsModalOpen,
      setPathSettingsModalOpen: value.setPathSettingsModalOpen,
      simulationModalOpen: value.simulationModalOpen,
      setSimulationModalOpen: value.setSimulationModalOpen,
      toast: value.toast,
    }),
    [
      value.activeTab,
      value.isFocusMode,
      value.onFocusModeChange,
      value.onTabChange,
      value.pathSettingsModalOpen,
      value.renderActions,
      value.setPathSettingsModalOpen,
      value.setSimulationModalOpen,
      value.simulationModalOpen,
      value.toast,
    ]
  );

  const canvasInteractionsValue = React.useMemo<AiPathsSettingsPageCanvasInteractionsContextValue>(
    () => ({
      nodes: value.nodes,
      edges: value.edges,
      palette: value.palette,
      isPathTreeVisible: value.isPathTreeVisible,
      setIsPathTreeVisible: value.setIsPathTreeVisible,
      isInspectorVisible: value.isInspectorVisible,
      setIsInspectorVisible: value.setIsInspectorVisible,
      confirmNodeSwitch: value.confirmNodeSwitch,
      handleDeleteSelectedNode: value.handleDeleteSelectedNode,
    }),
    [
      value.confirmNodeSwitch,
      value.edges,
      value.handleDeleteSelectedNode,
      value.isInspectorVisible,
      value.isPathTreeVisible,
      value.nodes,
      value.palette,
      value.setIsInspectorVisible,
      value.setIsPathTreeVisible,
    ]
  );

  const presetsValue = React.useMemo<AiPathsSettingsPagePresetsContextValue>(
    () => ({
      clusterPresets: value.clusterPresets,
      presetDraft: value.presetDraft,
      setPresetDraft: value.setPresetDraft,
      editingPresetId: value.editingPresetId,
      handleResetPresetDraft: value.handleResetPresetDraft,
      handlePresetFromSelection: value.handlePresetFromSelection,
      handleSavePreset: value.handleSavePreset,
      handleLoadPreset: value.handleLoadPreset,
      handleApplyPreset: value.handleApplyPreset,
      handleDeletePreset: value.handleDeletePreset,
      handleExportPresets: value.handleExportPresets,
      handleImportPresets: value.handleImportPresets,
      presetsModalOpen: value.presetsModalOpen,
      setPresetsModalOpen: value.setPresetsModalOpen,
      presetsJson: value.presetsJson,
      setPresetsJson: value.setPresetsJson,
    }),
    [
      value.clusterPresets,
      value.editingPresetId,
      value.handleApplyPreset,
      value.handleDeletePreset,
      value.handleExportPresets,
      value.handleImportPresets,
      value.handleLoadPreset,
      value.handlePresetFromSelection,
      value.handleResetPresetDraft,
      value.handleSavePreset,
      value.presetDraft,
      value.presetsJson,
      value.presetsModalOpen,
      value.setPresetDraft,
      value.setPresetsJson,
      value.setPresetsModalOpen,
    ]
  );

  const runtimeValue = React.useMemo<AiPathsSettingsPageRuntimeContextValue>(
    () => ({
      runtimeRunStatus: value.runtimeRunStatus,
      lastRunAt: value.lastRunAt,
      lastError: value.lastError,
      hasHistory: value.hasHistory,
      handleInspectTraceNode: value.handleInspectTraceNode,
    }),
    [
      value.handleInspectTraceNode,
      value.hasHistory,
      value.lastError,
      value.lastRunAt,
      value.runtimeRunStatus,
    ]
  );

  const pathActionsValue = React.useMemo<AiPathsSettingsPagePathActionsContextValue>(
    () => ({
      activePathId: value.activePathId,
      pathName: value.pathName,
      paths: value.paths,
      pathConfigs: value.pathConfigs,
      pathSwitchOptions: value.pathSwitchOptions,
      renameDraft: value.renameDraft,
      setRenameDraft: value.setRenameDraft,
      isPathNameEditing: value.isPathNameEditing,
      commitPathNameEdit: value.commitPathNameEdit,
      cancelPathNameEdit: value.cancelPathNameEdit,
      startPathNameEdit: value.startPathNameEdit,
      handleSwitchPath: value.handleSwitchPath,
      handleCreatePath: value.handleCreatePath,
      handleCreateFromTemplate: value.handleCreateFromTemplate,
      handleDuplicatePath: value.handleDuplicatePath,
      handleDeletePath: value.handleDeletePath,
      handleMovePathToFolder: value.handleMovePathToFolder,
      handleMoveFolder: value.handleMoveFolder,
      handleRenameFolder: value.handleRenameFolder,
      handleTogglePathLock: value.handleTogglePathLock,
      isPathLocked: value.isPathLocked,
      handleTogglePathActive: value.handleTogglePathActive,
      isPathActive: value.isPathActive,
    }),
    [
      value.activePathId,
      value.cancelPathNameEdit,
      value.commitPathNameEdit,
      value.handleCreateFromTemplate,
      value.handleCreatePath,
      value.handleDeletePath,
      value.handleDuplicatePath,
      value.handleMoveFolder,
      value.handleMovePathToFolder,
      value.handleRenameFolder,
      value.handleSwitchPath,
      value.handleTogglePathActive,
      value.handleTogglePathLock,
      value.isPathActive,
      value.isPathLocked,
      value.isPathNameEditing,
      value.pathConfigs,
      value.pathName,
      value.pathSwitchOptions,
      value.paths,
      value.renameDraft,
      value.setRenameDraft,
      value.startPathNameEdit,
    ]
  );

  const persistenceValue = React.useMemo<AiPathsSettingsPagePersistenceContextValue>(
    () => ({
      savePathConfig: value.savePathConfig,
      saving: value.saving,
      incrementLoadNonce: value.incrementLoadNonce,
      persistLastError: value.persistLastError,
      persistPathSettings: value.persistPathSettings,
      autoSaveLabel: value.autoSaveLabel,
      autoSaveVariant: value.autoSaveVariant,
      handleClearConnectorData: value.handleClearConnectorData,
      handleClearHistory: value.handleClearHistory,
    }),
    [
      value.autoSaveLabel,
      value.autoSaveVariant,
      value.handleClearConnectorData,
      value.handleClearHistory,
      value.incrementLoadNonce,
      value.persistLastError,
      value.persistPathSettings,
      value.savePathConfig,
      value.saving,
    ]
  );

  const diagnosticsValue = React.useMemo<AiPathsSettingsPageDiagnosticsContextValue>(
    () => ({
      diagnosticsReady: value.diagnosticsReady,
      normalizedAiPathsValidation: value.normalizedAiPathsValidation,
      nodeValidationEnabled: value.nodeValidationEnabled,
      updateAiPathsValidation: value.updateAiPathsValidation,
      handleOpenNodeValidator: value.handleOpenNodeValidator,
      handleRunNodeValidationCheck: value.handleRunNodeValidationCheck,
      docsTooltipsEnabled: value.docsTooltipsEnabled,
      setDocsTooltipsEnabled: value.setDocsTooltipsEnabled,
      validationPreflightReport: value.validationPreflightReport,
      selectionScopeMode: value.selectionScopeMode,
      setSelectionScopeMode: value.setSelectionScopeMode,
      dataContractReport: value.dataContractReport,
      setDataContractInspectorNodeId: value.setDataContractInspectorNodeId,
    }),
    [
      value.dataContractReport,
      value.diagnosticsReady,
      value.docsTooltipsEnabled,
      value.handleOpenNodeValidator,
      value.handleRunNodeValidationCheck,
      value.nodeValidationEnabled,
      value.normalizedAiPathsValidation,
      value.updateAiPathsValidation,
      value.selectionScopeMode,
      value.setDataContractInspectorNodeId,
      value.setDocsTooltipsEnabled,
      value.setSelectionScopeMode,
      value.validationPreflightReport,
    ]
  );

  return (
    <AiPathsSettingsPageWorkspaceContext.Provider value={workspaceValue}>
      <AiPathsSettingsPageCanvasInteractionsContext.Provider value={canvasInteractionsValue}>
        <AiPathsSettingsPagePresetsContext.Provider value={presetsValue}>
          <AiPathsSettingsPageRuntimeContext.Provider value={runtimeValue}>
            <AiPathsSettingsPagePathActionsContext.Provider value={pathActionsValue}>
              <AiPathsSettingsPagePersistenceContext.Provider value={persistenceValue}>
                <AiPathsSettingsPageDiagnosticsContext.Provider value={diagnosticsValue}>
                  <AiPathsSettingsPageContext.Provider value={value}>
                    {children}
                  </AiPathsSettingsPageContext.Provider>
                </AiPathsSettingsPageDiagnosticsContext.Provider>
              </AiPathsSettingsPagePersistenceContext.Provider>
            </AiPathsSettingsPagePathActionsContext.Provider>
          </AiPathsSettingsPageRuntimeContext.Provider>
        </AiPathsSettingsPagePresetsContext.Provider>
      </AiPathsSettingsPageCanvasInteractionsContext.Provider>
    </AiPathsSettingsPageWorkspaceContext.Provider>
  );
}
export {
  useAiPathsSettingsPageWorkspaceContext,
  useAiPathsSettingsPageCanvasInteractionsContext,
  useAiPathsSettingsPagePresetsContext,
  useAiPathsSettingsPageRuntimeContext,
  useAiPathsSettingsPagePathActionsContext,
  useAiPathsSettingsPagePersistenceContext,
  useAiPathsSettingsPageDiagnosticsContext,
  useAiPathsSettingsPageContext,
};
