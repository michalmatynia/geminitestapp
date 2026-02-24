'use client';

import React from 'react';

import type { AiNode } from '@/features/ai/ai-paths/lib';
import { NodeConfigDialog } from '../../node-config-dialog';
import { PresetsDialog } from '../../presets-dialog';
import { RunDetailDialog } from '../../run-detail-dialog';
import { SimulationDialog } from '../../simulation-dialog';
import { useAiPathsSettingsOrchestrator } from '../AiPathsSettingsOrchestratorContext';

const applySimulationEntityId = (node: AiNode, entityId: string): AiNode => ({
  ...node,
  config: {
    ...(node.config ?? {}),
    simulation: {
      ...(node.config?.simulation ?? {}),
      entityId,
      productId: entityId,
    },
  },
});

export function AiPathsDialogs(): React.JSX.Element {
  const state = useAiPathsSettingsOrchestrator();

  const simulationNode = React.useMemo(
    (): AiNode | null =>
      state.simulationOpenNodeId
        ? state.nodes.find((node: AiNode): boolean => node.id === state.simulationOpenNodeId) ?? null
        : null,
    [state.nodes, state.simulationOpenNodeId]
  );

  const handleSimulationConfigChange = React.useCallback(
    async (nodeId: string, entityId: string): Promise<void> => {
      state.setNodes((prev: AiNode[]): AiNode[] =>
        prev.map((node: AiNode): AiNode =>
          node.id === nodeId ? applySimulationEntityId(node, entityId) : node
        )
      );
    },
    [state]
  );

  const handleSimulationRun = React.useCallback(
    async (node: AiNode, entityId: string): Promise<void> => {
      const nextNode = applySimulationEntityId(node, entityId);
      await handleSimulationConfigChange(node.id, entityId);
      state.handleRunSimulation(nextNode);
    },
    [handleSimulationConfigChange, state]
  );

  const handleCopyPresetsJson = React.useCallback(
    (value: string): void => {
      const text = value.trim();
      if (!text) {
        state.toast('Nothing to copy.', { variant: 'info' });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        void navigator.clipboard.writeText(text).then(
          () => state.toast('Presets JSON copied.', { variant: 'success' }),
          () => state.toast('Failed to copy presets JSON.', { variant: 'error' })
        );
        return;
      }
      state.toast('Clipboard API unavailable.', { variant: 'warning' });
    },
    [state]
  );

  return (
    <>
      <NodeConfigDialog />

      <RunDetailDialog
        isOpen={state.runDetailOpen}
        onClose={() => state.setRunDetailOpen(false)}
        loading={state.runDetailLoading}
        runDetail={state.runDetail}
        runStreamStatus={state.runStreamStatus}
        runStreamPaused={state.runStreamPaused}
        runEventsOverflow={state.runEventsOverflow}
        runEventsBatchLimit={state.runEventsBatchLimit}
        runHistoryNodeId={state.runDetailSelectedHistoryNodeId}
        onStreamPauseToggle={(paused: boolean) => state.setRunStreamPaused(paused)}
        onHistoryNodeSelect={(nodeId: string) => state.setRunHistoryNodeId(nodeId)}
      />

      <PresetsDialog
        isOpen={state.presetsModalOpen}
        onClose={() => state.setPresetsModalOpen(false)}
        presetsJson={state.presetsJson}
        setPresetsJson={state.setPresetsJson}
        clusterPresets={state.clusterPresets}
        onImport={state.handleImportPresets}
        onCopyJson={handleCopyPresetsJson}
      />

      <SimulationDialog
        isOpen={Boolean(simulationNode)}
        onClose={() => state.setSimulationOpenNodeId(null)}
        item={simulationNode}
        isPathLocked={state.isPathLocked}
        onSimulate={handleSimulationRun}
        onConfigChange={handleSimulationConfigChange}
      />

      <state.ConfirmationModal />
    </>
  );
}
