import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { AiNode } from '@/shared/contracts/ai-paths';

const nodeConfigActionsMock = vi.hoisted(() => ({
  updateSelectedNode: vi.fn(),
  updateSelectedNodeConfig: vi.fn(),
}));

const savePathConfigMock = vi.hoisted(() => vi.fn(async () => true));

const selectionActionsMock = vi.hoisted(() => ({
  setConfigOpen: vi.fn(),
  setNodeConfigDirty: vi.fn(),
}));

const runtimeActionsMock = vi.hoisted(() => ({
  setParserSamples: vi.fn(),
  setUpdaterSamples: vi.fn(),
  fetchParserSample: vi.fn(async () => {}),
  fetchUpdaterSample: vi.fn(async () => {}),
  runSimulation: vi.fn(),
  clearNodeRuntime: vi.fn(),
  sendToAi: vi.fn(async () => {}),
}));

const runtimeStateValue = vi.hoisted(() => ({
  parserSamples: {},
  parserSampleLoading: false,
  updaterSamples: {},
  updaterSampleLoading: false,
  runtimeState: {
    status: 'idle',
    nodeStatuses: {},
    nodeOutputs: {},
    variables: {},
    events: [],
    currentRun: null,
    inputs: {},
    outputs: {},
  },
  pathDebugSnapshots: {},
  sendingToAi: false,
}));

vi.mock('../../context', () => ({
  useSelectionState: () => ({ selectedNodeId: null, configOpen: false }),
  useSelectionActions: () => selectionActionsMock,
  useGraphState: () => ({
    nodes: [] as AiNode[],
    edges: [],
    activePathId: 'path_72l57d',
    isPathLocked: false,
  }),
  useGraphDataState: () => ({
    nodes: [] as AiNode[],
    edges: [],
  }),
  usePathMetadataState: () => ({
    activePathId: 'path_72l57d',
    isPathLocked: false,
  }),
  useRuntimeState: () => runtimeStateValue,
  useRuntimeDataState: () => ({
    runtimeState: runtimeStateValue.runtimeState,
    parserSamples: runtimeStateValue.parserSamples,
    updaterSamples: runtimeStateValue.updaterSamples,
    pathDebugSnapshots: runtimeStateValue.pathDebugSnapshots,
  }),
  useRuntimeUiState: () => ({
    sendingToAi: runtimeStateValue.sendingToAi,
  }),
  useRuntimeActions: () => runtimeActionsMock,
  usePresetsState: () => ({
    dbQueryPresets: [],
    dbNodePresets: [],
  }),
  usePresetsActions: () => ({
    setDbQueryPresets: vi.fn(),
    saveDbQueryPresets: vi.fn(async () => {}),
    setDbNodePresets: vi.fn(),
    saveDbNodePresets: vi.fn(async () => {}),
  }),
  usePersistenceState: () => ({
    isAutoSaveEnabled: false,
    lastSavedAt: null,
    saveStatus: 'idle',
  }),
  usePersistenceActions: () => ({
    setAutoSaveEnabled: vi.fn(),
    savePathConfig: savePathConfigMock,
  }),
}));

vi.mock(
  '../ai-paths-settings/hooks/useAiPathsNodeConfigActions',
  () => ({
    useAiPathsNodeConfigActions: () => nodeConfigActionsMock,
  })
);

vi.mock('@/shared/ui/primitives.public', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { AiPathConfigProviderWithContext, useAiPathOrchestrator } from '../AiPathConfigContext';

function Probe(props: { onReady: (value: ReturnType<typeof useAiPathOrchestrator>) => void }) {
  const value = useAiPathOrchestrator();
  React.useEffect(() => {
    props.onReady(value);
  }, [props, value]);
  return null;
}

describe('AiPathConfigContext save binding', () => {
  it('routes savePathConfig through PersistenceActions.savePathConfig', async () => {
    const onReady = vi.fn();
    render(
      <AiPathConfigProviderWithContext>
        <Probe onReady={onReady} />
      </AiPathConfigProviderWithContext>
    );

    await waitFor(() => {
      expect(onReady).toHaveBeenCalled();
    });
    const contextValue = onReady.mock.calls[0]?.[0] as ReturnType<typeof useAiPathOrchestrator>;
    const options = { silent: true, includeNodeConfig: true, force: true };
    const result = await contextValue.savePathConfig(options);

    expect(result).toBe(true);
    expect(savePathConfigMock).toHaveBeenCalledTimes(1);
    expect(savePathConfigMock).toHaveBeenCalledWith(options);
  });
});
