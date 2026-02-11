'use client';

import { useMemo } from 'react';

import { useToast } from '@/shared/ui';

import {
  useGraphState,
  usePersistenceActions,
  usePresetsActions,
  usePresetsState,
  useRuntimeActions,
  useRuntimeState,
  useSelectionActions,
  useSelectionState,
} from '../../context';
import { useAiPathsSettingsOrchestrator } from '../ai-paths-settings/AiPathsSettingsOrchestratorContext';
import { AiPathConfigProvider } from '../AiPathConfigContext';
import { NodeConfigDialog } from '../node-config-dialog';

export type NodeConfigDialogMigratedProps = Record<string, never>;

export function NodeConfigDialogMigrated(
  _props: NodeConfigDialogMigratedProps = {}
): React.JSX.Element | null {
  const {
    modelOptions,
    updateSelectedNode,
    updateSelectedNodeConfig,
    handleClearNodeHistory,
  } = useAiPathsSettingsOrchestrator();
  const { toast } = useToast();
  const { selectedNodeId, configOpen } = useSelectionState();
  const selectionActions = useSelectionActions();
  const graphState = useGraphState();
  const runtimeState = useRuntimeState();
  const runtimeActions = useRuntimeActions();
  const presetsState = usePresetsState();
  const presetsActions = usePresetsActions();
  const persistenceActions = usePersistenceActions();

  const selectedNode = useMemo(
    () =>
      selectedNodeId
        ? graphState.nodes.find((node): boolean => node.id === selectedNodeId) ?? null
        : null,
    [graphState.nodes, selectedNodeId]
  );

  const pathDebugSnapshot =
    graphState.activePathId
      ? (runtimeState.pathDebugSnapshots[graphState.activePathId] ?? null)
      : null;

  return (
    <AiPathConfigProvider
      configOpen={configOpen}
      setConfigOpen={selectionActions.setConfigOpen}
      selectedNode={selectedNode}
      nodes={graphState.nodes}
      edges={graphState.edges}
      isPathLocked={graphState.isPathLocked}
      modelOptions={modelOptions}
      parserSamples={runtimeState.parserSamples}
      setParserSamples={runtimeActions.setParserSamples}
      parserSampleLoading={runtimeState.parserSampleLoading}
      updaterSamples={runtimeState.updaterSamples}
      setUpdaterSamples={runtimeActions.setUpdaterSamples}
      updaterSampleLoading={runtimeState.updaterSampleLoading}
      runtimeState={runtimeState.runtimeState}
      pathDebugSnapshot={pathDebugSnapshot}
      updateSelectedNode={updateSelectedNode}
      updateSelectedNodeConfig={updateSelectedNodeConfig}
      handleFetchParserSample={runtimeActions.fetchParserSample}
      handleFetchUpdaterSample={runtimeActions.fetchUpdaterSample}
      handleRunSimulation={runtimeActions.runSimulation}
      clearRuntimeForNode={runtimeActions.clearNodeRuntime}
      clearNodeCache={runtimeActions.clearNodeRuntime}
      clearNodeHistory={handleClearNodeHistory}
      onSendToAi={runtimeActions.sendToAi}
      sendingToAi={runtimeState.sendingToAi}
      dbQueryPresets={presetsState.dbQueryPresets}
      setDbQueryPresets={presetsActions.setDbQueryPresets}
      saveDbQueryPresets={presetsActions.saveDbQueryPresets}
      dbNodePresets={presetsState.dbNodePresets}
      setDbNodePresets={presetsActions.setDbNodePresets}
      saveDbNodePresets={presetsActions.saveDbNodePresets}
      toast={toast}
      onDirtyChange={selectionActions.setNodeConfigDirty}
      savePathConfig={persistenceActions.savePathConfig}
    >
      <NodeConfigDialog />
    </AiPathConfigProvider>
  );
}
