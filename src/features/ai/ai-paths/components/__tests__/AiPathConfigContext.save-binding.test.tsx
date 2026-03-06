import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { AiNode } from '@/shared/contracts/ai-paths';

const orchestratorMock = vi.hoisted(() => ({
  updateSelectedNode: vi.fn(),
  updateSelectedNodeConfig: vi.fn(),
  handleClearNodeHistory: vi.fn(),
  handleSave: vi.fn(async () => true),
}));

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

vi.mock('../../context', () => ({
  useSelectionState: () => ({ selectedNodeId: null, configOpen: false }),
  useSelectionActions: () => selectionActionsMock,
  useGraphState: () => ({
    nodes: [] as AiNode[],
    edges: [],
    activePathId: 'path_72l57d',
    isPathLocked: false,
  }),
  useRuntimeState: () => ({
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
}));

vi.mock('../ai-paths-settings/AiPathsSettingsOrchestratorContext', () => ({
  useAiPathsSettingsOrchestrator: () => orchestratorMock,
}));

vi.mock('@/shared/ui', () => ({
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
  it('routes savePathConfig through orchestrator handleSave', async () => {
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
    expect(orchestratorMock.handleSave).toHaveBeenCalledTimes(1);
    expect(orchestratorMock.handleSave).toHaveBeenCalledWith(options);
  });
});
