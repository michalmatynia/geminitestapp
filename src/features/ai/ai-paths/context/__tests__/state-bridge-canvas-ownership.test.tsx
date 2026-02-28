import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AiPathsStateBridger } from '@/features/ai/ai-paths/components/ai-paths-settings/AiPathsStateBridger';
import type { UseAiPathsSettingsStateReturn } from '@/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsState';
import { AiPathsProvider, useCanvasActions, useCanvasState } from '@/features/ai/ai-paths/context';
import type { RuntimeState } from '@/shared/lib/ai-paths';

const EMPTY_NODES: unknown[] = [];
const EMPTY_EDGES: unknown[] = [];
const EMPTY_PATHS: unknown[] = [];
const EMPTY_NODE_DURATIONS: Record<string, number> = {};
const EMPTY_RUNTIME_NODE_STATUSES: Record<string, unknown> = {};
const EMPTY_RUNTIME_EVENTS: unknown[] = [];
const EMPTY_PATH_CONFIGS: Record<string, unknown> = {};
const EMPTY_RUN_HISTORY: Record<string, boolean> = {};
const EMPTY_RUN_HISTORY_SELECTION: Record<string, string> = {};

const buildLegacyState = (view: {
  x: number;
  y: number;
  scale: number;
}): UseAiPathsSettingsStateReturn =>
  ({
    selectedNodeId: null,
    selectedEdgeId: null,
    configOpen: false,
    nodeConfigDirty: false,
    simulationOpenNodeId: null,
    view,
    panState: null,
    dragState: null,
    connecting: null,
    connectingPos: null,
    lastDrop: null,
    nodes: EMPTY_NODES,
    edges: EMPTY_EDGES,
    setNodes: (_nodes: unknown[]): void => undefined,
    setEdges: (_edges: unknown[]): void => undefined,
    activePathId: null,
    pathName: '',
    isPathLocked: false,
    isPathActive: true,
    activeTrigger: '',
    executionMode: 'sequential',
    flowIntensity: 'balanced',
    runMode: 'manual',
    strictFlowMode: false,
    paths: EMPTY_PATHS,
    pathConfigs: EMPTY_PATH_CONFIGS,
    runtimeState: {} as RuntimeState,
    lastRunAt: null,
    lastError: null,
    runtimeRunStatus: 'idle',
    handleFireTrigger: (..._args: unknown[]): void => undefined,
    handleFireTriggerPersistent: (..._args: unknown[]): void => undefined,
    handlePauseActiveRun: (): void => undefined,
    handleResumeActiveRun: (): void => undefined,
    handleStepActiveRun: (..._args: unknown[]): void => undefined,
    handleCancelActiveRun: (): void => undefined,
    handleClearWires: async (): Promise<void> => undefined,
    handleFetchParserSample: async (..._args: unknown[]): Promise<void> => undefined,
    handleFetchUpdaterSample: async (..._args: unknown[]): Promise<void> => undefined,
    handleRunSimulation: (..._args: unknown[]): void => undefined,
    handleSendToAi: async (..._args: unknown[]): Promise<void> => undefined,
    nodeDurations: EMPTY_NODE_DURATIONS,
    runtimeNodeStatuses: EMPTY_RUNTIME_NODE_STATUSES,
    runtimeEvents: EMPTY_RUNTIME_EVENTS,
    loading: false,
    saving: false,
    autoSaveStatus: 'idle',
    autoSaveAt: null,
    handleSave: async (): Promise<boolean> => true,
    clusterPresets: [],
    presetDraft: undefined,
    editingPresetId: null,
    paletteCollapsed: false,
    expandedPaletteGroups: new Set<string>(),
    saveDbQueryPresets: async (..._args: unknown[]): Promise<void> => undefined,
    saveDbNodePresets: async (..._args: unknown[]): Promise<void> => undefined,
    runFilter: 'all',
    expandedRunHistory: EMPTY_RUN_HISTORY,
    runHistorySelection: EMPTY_RUN_HISTORY_SELECTION,
  }) as unknown as UseAiPathsSettingsStateReturn;

function BridgeOwnershipHarness(): React.JSX.Element {
  const [legacyState, setLegacyState] = React.useState<UseAiPathsSettingsStateReturn>(() =>
    buildLegacyState({ x: -940, y: -520, scale: 0.25 })
  );
  const { updateView } = useCanvasActions();
  const { view } = useCanvasState();

  return (
    <div>
      <AiPathsStateBridger state={legacyState} />
      <output data-testid='canvas-view'>{`${view.x},${view.y},${view.scale}`}</output>
      <button
        type='button'
        onClick={() => {
          updateView({ x: 111, y: 222 });
        }}
      >
        apply-pan
      </button>
      <button
        type='button'
        onClick={() => {
          setLegacyState(buildLegacyState({ x: -999, y: -888, scale: 0.4 }));
        }}
      >
        legacy-update
      </button>
    </div>
  );
}

describe('AI Paths state bridge canvas ownership', () => {
  it('does not overwrite CanvasContext view when legacy state updates', async () => {
    const { getByRole, getByTestId } = render(
      <AiPathsProvider initialView={{ x: 0, y: 0, scale: 1 }}>
        <BridgeOwnershipHarness />
      </AiPathsProvider>
    );

    expect(getByTestId('canvas-view')).toHaveTextContent('0,0,1');

    fireEvent.click(getByRole('button', { name: 'apply-pan' }));

    await waitFor(() => {
      expect(getByTestId('canvas-view')).toHaveTextContent('111,222,1');
    });

    fireEvent.click(getByRole('button', { name: 'legacy-update' }));

    await waitFor(() => {
      expect(getByTestId('canvas-view')).toHaveTextContent('111,222,1');
    });
  });
});
