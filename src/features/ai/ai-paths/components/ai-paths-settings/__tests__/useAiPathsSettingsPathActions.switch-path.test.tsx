import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { PathConfig, PathMeta } from '@/shared/lib/ai-paths';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths';
import { sanitizePathConfig } from '@/shared/lib/ai-paths/core/utils/path-config-sanitization';

import { useAiPathsSettingsPathActions } from '../useAiPathsSettingsPathActions';
import {
  fetchAiPathsSettingsByKeysCached,
  fetchAiPathsSettingsCached,
} from '@/shared/lib/ai-paths/settings-store-client';

type PathActionsInput = Parameters<typeof useAiPathsSettingsPathActions>[0];
const selectNodeMock = vi.fn();
const setNodesGraphMock = vi.fn();
const setEdgesGraphMock = vi.fn();
const setPathConfigsGraphMock = vi.fn();
const setPathsGraphMock = vi.fn();
const setActivePathIdGraphMock = vi.fn();
const setPathNameGraphMock = vi.fn();
const setPathDescriptionGraphMock = vi.fn();
const setActiveTriggerGraphMock = vi.fn();
const setExecutionModeGraphMock = vi.fn();
const setFlowIntensityGraphMock = vi.fn();
const setRunModeGraphMock = vi.fn();
const setStrictFlowModeGraphMock = vi.fn();
const setBlockedRunPolicyGraphMock = vi.fn();
const setAiPathsValidationGraphMock = vi.fn();
const setIsPathLockedGraphMock = vi.fn();
const setIsPathActiveGraphMock = vi.fn();
const graphActionsMock = {
  setNodes: setNodesGraphMock,
  setEdges: setEdgesGraphMock,
  setPathConfigs: setPathConfigsGraphMock,
  setPaths: setPathsGraphMock,
  setActivePathId: setActivePathIdGraphMock,
  setPathName: setPathNameGraphMock,
  setPathDescription: setPathDescriptionGraphMock,
  setActiveTrigger: setActiveTriggerGraphMock,
  setExecutionMode: setExecutionModeGraphMock,
  setFlowIntensity: setFlowIntensityGraphMock,
  setRunMode: setRunModeGraphMock,
  setStrictFlowMode: setStrictFlowModeGraphMock,
  setBlockedRunPolicy: setBlockedRunPolicyGraphMock,
  setAiPathsValidation: setAiPathsValidationGraphMock,
  setIsPathLocked: setIsPathLockedGraphMock,
  setIsPathActive: setIsPathActiveGraphMock,
};
const setRuntimeStateMock = vi.fn();
const setParserSamplesRuntimeMock = vi.fn();
const setUpdaterSamplesRuntimeMock = vi.fn();
const setLastRunAtRuntimeMock = vi.fn();
const setConfigOpenSelectionMock = vi.fn();
const setIsPathSwitchingPersistenceMock = vi.fn();

vi.mock('@/shared/lib/ai-paths/settings-store-client', async () => {
  const actual = await vi.importActual<
    typeof import('@/shared/lib/ai-paths/settings-store-client')
      >('@/shared/lib/ai-paths/settings-store-client');
  return {
    ...actual,
    fetchAiPathsSettingsByKeysCached: vi.fn(),
    fetchAiPathsSettingsCached: vi.fn(),
    deleteAiPathsSettings: vi.fn().mockResolvedValue(0),
  };
});

vi.mock('@/features/ai/ai-paths/context/SelectionContext', () => ({
  useSelectionActions: () => ({
    selectNode: selectNodeMock,
    setConfigOpen: setConfigOpenSelectionMock,
  }),
}));

vi.mock('@/features/ai/ai-paths/context/GraphContext', () => ({
  useGraphActions: () => graphActionsMock,
}));

vi.mock('@/features/ai/ai-paths/context/RuntimeContext', () => ({
  useRuntimeActions: () => ({
    setRuntimeState: setRuntimeStateMock,
    setParserSamples: setParserSamplesRuntimeMock,
    setUpdaterSamples: setUpdaterSamplesRuntimeMock,
    setLastRunAt: setLastRunAtRuntimeMock,
  }),
}));

vi.mock('@/features/ai/ai-paths/context/PersistenceContext', () => ({
  usePersistenceActions: () => ({
    setIsPathSwitching: setIsPathSwitchingPersistenceMock,
  }),
}));

const mockedFetchAiPathsSettingsByKeysCached = vi.mocked(fetchAiPathsSettingsByKeysCached);
const mockedFetchAiPathsSettingsCached = vi.mocked(fetchAiPathsSettingsCached);
const buildPathMeta = (config: Pick<PathConfig, 'id' | 'name'>): PathMeta => ({
  id: config.id,
  name: config.name,
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
});

const serializeStoredPathConfig = (config: PathConfig): string =>
  JSON.stringify(sanitizePathConfig(config));

const buildLegacyTriggerConfig = (pathId: string): PathConfig => {
  const pathConfig = createDefaultPathConfig(pathId);
  const seedNode = pathConfig.nodes[0];
  if (!seedNode) {
    throw new Error('Expected default path config to include a seed node.');
  }
  pathConfig.nodes = [
    {
      ...seedNode,
      type: 'trigger',
      title: 'Trigger: Opis i Tytuł',
      inputs: ['context'],
      outputs: ['trigger', 'context', 'entityId', 'entityType'],
      config: {
        trigger: {
          event: 'manual',
          contextMode: 'simulation_preferred',
        },
      },
    },
  ];
  pathConfig.edges = [];
  return pathConfig;
};

const buildInput = (): {
  input: PathActionsInput;
  mocks: {
    setActivePathId: ReturnType<typeof vi.fn>;
    setIsPathSwitching: ReturnType<typeof vi.fn>;
    setPathConfigs: ReturnType<typeof vi.fn>;
    setPaths: ReturnType<typeof vi.fn>;
    toast: ReturnType<typeof vi.fn>;
    persistActivePathPreference: ReturnType<typeof vi.fn>;
    reportAiPathsError: ReturnType<typeof vi.fn>;
  };
} => {
  const oldPathId = 'path_old';
  const oldConfig = createDefaultPathConfig(oldPathId);
  const oldPath = buildPathMeta(oldConfig);

  const toast = vi.fn<PathActionsInput['toast']>();
  const persistPathSettings = vi.fn<PathActionsInput['persistPathSettings']>().mockResolvedValue(
    undefined
  );
  const persistSettingsBulk = vi.fn<PathActionsInput['persistSettingsBulk']>().mockResolvedValue(
    undefined
  );
  const persistActivePathPreference = vi
    .fn<PathActionsInput['persistActivePathPreference']>()
    .mockResolvedValue(undefined);
  const reportAiPathsError = vi.fn<PathActionsInput['reportAiPathsError']>();
  const confirm = vi.fn<PathActionsInput['confirm']>();

  const input: PathActionsInput = {
    activePathId: oldPathId,
    isPathLocked: false,
    pathConfigs: { [oldPathId]: oldConfig },
    paths: [oldPath],
    normalizeTriggerLabel: (value) => value ?? 'Product Modal - Context Filter',
    persistPathSettings,
    persistSettingsBulk,
    persistActivePathPreference,
    reportAiPathsError,
    confirm,
    toast,
  };

  return {
    input,
    mocks: {
      setActivePathId: setActivePathIdGraphMock,
      setIsPathSwitching: setIsPathSwitchingPersistenceMock,
      setPathConfigs: setPathConfigsGraphMock,
      setPaths: setPathsGraphMock,
      toast,
      persistActivePathPreference,
      reportAiPathsError,
    },
  };
};

describe('useAiPathsSettingsPathActions handleSwitchPath', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectNodeMock.mockReset();
    setConfigOpenSelectionMock.mockReset();
    setNodesGraphMock.mockReset();
    setEdgesGraphMock.mockReset();
    setPathConfigsGraphMock.mockReset();
    setPathsGraphMock.mockReset();
    setActivePathIdGraphMock.mockReset();
    setPathNameGraphMock.mockReset();
    setPathDescriptionGraphMock.mockReset();
    setActiveTriggerGraphMock.mockReset();
    setExecutionModeGraphMock.mockReset();
    setFlowIntensityGraphMock.mockReset();
    setRunModeGraphMock.mockReset();
    setStrictFlowModeGraphMock.mockReset();
    setBlockedRunPolicyGraphMock.mockReset();
    setAiPathsValidationGraphMock.mockReset();
    setIsPathLockedGraphMock.mockReset();
    setIsPathActiveGraphMock.mockReset();
    setRuntimeStateMock.mockReset();
    setParserSamplesRuntimeMock.mockReset();
    setUpdaterSamplesRuntimeMock.mockReset();
    setLastRunAtRuntimeMock.mockReset();
    setIsPathSwitchingPersistenceMock.mockReset();
  });

  it('applies fetched path config and persists active path preference', async () => {
    const { input, mocks } = buildInput();
    const nextPathId = 'path_next';
    const fetchedConfig = createDefaultPathConfig(nextPathId);
    fetchedConfig.runMode = 'queue';

    mockedFetchAiPathsSettingsByKeysCached.mockResolvedValueOnce([
      {
        key: `ai_paths_config_${nextPathId}`,
        value: serializeStoredPathConfig(fetchedConfig),
      },
    ]);

    const { result } = renderHook(() => useAiPathsSettingsPathActions(input));

    act(() => {
      result.current.handleSwitchPath(nextPathId);
    });

    await waitFor(() => {
      expect(mocks.setActivePathId).toHaveBeenCalledWith(nextPathId);
    });
    expect(mocks.setIsPathSwitching).toHaveBeenCalledWith(true);
    expect(mocks.setIsPathSwitching).toHaveBeenCalledWith(false);
    expect(mocks.persistActivePathPreference).toHaveBeenCalledWith(nextPathId);
    expect(mocks.setPathConfigs).toHaveBeenCalledTimes(1);
    expect(setRunModeGraphMock).toHaveBeenCalledWith('manual');
  });

  it('does not replace target path with default config when fetch fails', async () => {
    const { input, mocks } = buildInput();
    const oldPathId = input.activePathId as string;

    mockedFetchAiPathsSettingsByKeysCached.mockRejectedValueOnce(new Error('timeout'));
    mockedFetchAiPathsSettingsCached.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useAiPathsSettingsPathActions(input));

    act(() => {
      result.current.handleSwitchPath('path_missing');
    });

    await waitFor(() => {
      expect(mocks.setActivePathId).toHaveBeenCalledWith(oldPathId);
    });
    expect(mocks.setIsPathSwitching).toHaveBeenCalledWith(true);
    expect(mocks.setIsPathSwitching).toHaveBeenCalledWith(false);
    expect(mocks.setPathConfigs).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(
      'Failed to load selected path. Try again in a moment.',
      {
        variant: 'error',
      }
    );
  });

  it('switches path using fallback full-settings lookup when selective fetch fails', async () => {
    const { input, mocks } = buildInput();
    const nextPathId = 'path_fallback';
    const recoveredConfig = createDefaultPathConfig(nextPathId);

    mockedFetchAiPathsSettingsByKeysCached.mockRejectedValueOnce(new Error('timeout'));
    mockedFetchAiPathsSettingsCached.mockResolvedValueOnce([
      {
        key: `ai_paths_config_${nextPathId}`,
        value: serializeStoredPathConfig(recoveredConfig),
      },
    ]);

    const { result } = renderHook(() => useAiPathsSettingsPathActions(input));

    act(() => {
      result.current.handleSwitchPath(nextPathId);
    });

    await waitFor(() => {
      expect(mocks.setActivePathId).toHaveBeenCalledWith(nextPathId);
    });
    expect(mocks.persistActivePathPreference).toHaveBeenCalledWith(nextPathId);
    expect(mocks.toast).not.toHaveBeenCalledWith(
      'Failed to load selected path. Try again in a moment.',
      expect.anything()
    );
  });

  it('does not auto-recover invalid runtime state while switching paths', async () => {
    const { input, mocks } = buildInput();
    const nextPathId = 'path_invalid';
    const invalidConfig = createDefaultPathConfig(nextPathId);
    invalidConfig.runtimeState = JSON.stringify({
      inputs: {},
      outputs: {},
      runId: 'legacy-run-id',
    });

    mockedFetchAiPathsSettingsByKeysCached.mockResolvedValueOnce([
      {
        key: `ai_paths_config_${nextPathId}`,
        value: JSON.stringify(invalidConfig),
      },
    ]);
    mockedFetchAiPathsSettingsCached.mockResolvedValueOnce([
      {
        key: `ai_paths_config_${nextPathId}`,
        value: JSON.stringify(invalidConfig),
      },
    ]);

    const { result } = renderHook(() => useAiPathsSettingsPathActions(input));

    act(() => {
      result.current.handleSwitchPath(nextPathId);
    });

    await waitFor(() => {
      expect(mocks.setActivePathId).toHaveBeenCalledWith(input.activePathId);
    });
    expect(mocks.setPathConfigs).not.toHaveBeenCalled();
    expect(mocks.persistActivePathPreference).not.toHaveBeenCalledWith(nextPathId);
    expect(mocks.reportAiPathsError).toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(
      'Failed to load selected path. Try again in a moment.',
      {
        variant: 'error',
      }
    );
  });

  it('does not persist trigger-context remediation while switching paths', async () => {
    const { input, mocks } = buildInput();
    const nextPathId = 'path_legacy_trigger';
    const fetchedConfig = buildLegacyTriggerConfig(nextPathId);

    mockedFetchAiPathsSettingsByKeysCached.mockResolvedValueOnce([
      {
        key: `ai_paths_config_${nextPathId}`,
        value: JSON.stringify(fetchedConfig),
      },
    ]);

    const { result } = renderHook(() => useAiPathsSettingsPathActions(input));

    act(() => {
      result.current.handleSwitchPath(nextPathId);
    });

    await waitFor(() => {
      expect(mocks.setActivePathId).toHaveBeenCalledWith(input.activePathId);
    });
    expect(mocks.toast).toHaveBeenCalledWith(
      'Failed to load selected path. Try again in a moment.',
      {
        variant: 'error',
      }
    );
    expect(mocks.setPathConfigs).not.toHaveBeenCalled();
  });

  it('duplicates paths with fresh canonical node ids and remapped samples', () => {
    const { input, mocks } = buildInput();
    const sourceId = input.activePathId as string;
    const sourceConfig = input.pathConfigs[sourceId] as PathConfig;
    const sourceSelectedNodeId = sourceConfig.nodes[0]?.id as string;
    input.pathConfigs[sourceId] = {
      ...sourceConfig,
      uiState: {
        selectedNodeId: sourceSelectedNodeId,
        configOpen: false,
      },
      parserSamples: {
        [sourceSelectedNodeId]: {
          entityType: 'product',
          entityId: 'product-1',
        },
      },
    };

    const { result } = renderHook(() => useAiPathsSettingsPathActions(input));

    act(() => {
      result.current.handleDuplicatePath(sourceId);
    });

    expect(mocks.setPaths).toHaveBeenCalledTimes(1);
    expect(mocks.setPathConfigs).toHaveBeenCalledTimes(1);
    expect(mocks.setActivePathId).toHaveBeenCalledTimes(1);

    const nextPaths = (mocks.setPaths.mock.calls[0]?.[0] as (prev: PathMeta[]) => PathMeta[])(
      input.paths
    );
    const duplicateMeta = nextPaths.find((path: PathMeta): boolean => path.id !== sourceId);
    expect(duplicateMeta).toBeDefined();

    const nextConfigs = (
      mocks.setPathConfigs.mock.calls[0]?.[0] as (
        prev: Record<string, PathConfig>
      ) => Record<string, PathConfig>
    )(input.pathConfigs);
    const duplicateConfig = nextConfigs[duplicateMeta?.id as string];
    const sourceNodeIds = new Set(sourceConfig.nodes.map((node) => node.id));
    const duplicateNodeIds = duplicateConfig.nodes.map((node) => node.id);

    expect(duplicateNodeIds).toHaveLength(sourceConfig.nodes.length);
    expect(duplicateNodeIds.every((nodeId) => /^node-[a-f0-9]{24}$/.test(nodeId))).toBe(true);
    expect(duplicateNodeIds.some((nodeId) => sourceNodeIds.has(nodeId))).toBe(false);
    expect(duplicateConfig.uiState?.selectedNodeId).toBeTruthy();
    expect(duplicateConfig.uiState?.selectedNodeId).not.toBe(sourceSelectedNodeId);
    expect(Object.keys(duplicateConfig.parserSamples ?? {})).toEqual([
      duplicateConfig.uiState?.selectedNodeId,
    ]);
    expect(duplicateConfig.runtimeState).toEqual({});
    expect(mocks.toast).toHaveBeenCalledWith('Path duplicated.', { variant: 'success' });
  });
});
