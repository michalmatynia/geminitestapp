'use client';

import { useMemo } from 'react';

import { AiPathConfigProvider } from '../AiPathConfigContext';
import { NodeConfigDialog } from '../node-config-dialog';
import type { AiPathsSettingsState } from '../ai-paths-settings/useAiPathsSettingsState';
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

export type NodeConfigDialogMigratedProps = {
  state: AiPathsSettingsState;
};

export function NodeConfigDialogMigrated(
  { state }: NodeConfigDialogMigratedProps
): React.JSX.Element | null {
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
      modelOptions={state.modelOptions}
      parserSamples={runtimeState.parserSamples}
      setParserSamples={runtimeActions.setParserSamples}
      parserSampleLoading={runtimeState.parserSampleLoading}
      updaterSamples={runtimeState.updaterSamples}
      setUpdaterSamples={runtimeActions.setUpdaterSamples}
      updaterSampleLoading={runtimeState.updaterSampleLoading}
      runtimeState={runtimeState.runtimeState}
      pathDebugSnapshot={pathDebugSnapshot}
      updateSelectedNode={state.updateSelectedNode}
      updateSelectedNodeConfig={state.updateSelectedNodeConfig}
      handleFetchParserSample={runtimeActions.fetchParserSample}
      handleFetchUpdaterSample={runtimeActions.fetchUpdaterSample}
      handleRunSimulation={runtimeActions.runSimulation}
      clearRuntimeForNode={runtimeActions.clearNodeRuntime}
      clearNodeCache={runtimeActions.clearNodeRuntime}
      clearNodeHistory={state.handleClearNodeHistory}
      onSendToAi={runtimeActions.sendToAi}
      sendingToAi={runtimeState.sendingToAi}
      dbQueryPresets={presetsState.dbQueryPresets}
      setDbQueryPresets={presetsActions.setDbQueryPresets}
      saveDbQueryPresets={presetsActions.saveDbQueryPresets}
      dbNodePresets={presetsState.dbNodePresets}
      setDbNodePresets={presetsActions.setDbNodePresets}
      saveDbNodePresets={presetsActions.saveDbNodePresets}
      toast={state.toast}
      onDirtyChange={selectionActions.setNodeConfigDirty}
      savePathConfig={persistenceActions.savePathConfig}
    >
      <NodeConfigDialog />
    </AiPathConfigProvider>
  );
}
