import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Dispatch, SetStateAction } from 'react';

import type { PathConfig, PathMeta, RuntimeState } from '@/shared/lib/ai-paths';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths';

import { useAiPathsSettingsPathActions } from '../useAiPathsSettingsPathActions';
import {
  fetchAiPathsSettingsByKeysCached,
  fetchAiPathsSettingsCached,
} from '@/shared/lib/ai-paths/settings-store-client';

type PathActionsInput = Parameters<typeof useAiPathsSettingsPathActions>[0];

vi.mock('@/shared/lib/ai-paths/settings-store-client', async () => {
  const actual = await vi.importActual<typeof import('@/shared/lib/ai-paths/settings-store-client')>(
    '@/shared/lib/ai-paths/settings-store-client'
  );
  return {
    ...actual,
    fetchAiPathsSettingsByKeysCached: vi.fn(),
    fetchAiPathsSettingsCached: vi.fn(),
    deleteAiPathsSettings: vi.fn().mockResolvedValue(0),
  };
});

const mockedFetchAiPathsSettingsByKeysCached = vi.mocked(fetchAiPathsSettingsByKeysCached);
const mockedFetchAiPathsSettingsCached = vi.mocked(fetchAiPathsSettingsCached);

const createDispatchMock = <T,>() => {
  const fn = vi.fn<(value: SetStateAction<T>) => void>();
  return {
    dispatch: fn as Dispatch<SetStateAction<T>>,
    mock: fn,
  };
};

const emptyRuntimeState = (): RuntimeState =>
  ({
    status: 'idle',
    nodeStatuses: {},
    nodeOutputs: {},
    variables: {},
    events: [],
    inputs: {},
    outputs: {},
  }) as RuntimeState;

const buildInput = (): {
  input: PathActionsInput;
  mocks: {
    setActivePathId: ReturnType<typeof createDispatchMock<string | null>>['mock'];
    setPathConfigs: ReturnType<typeof createDispatchMock<Record<string, PathConfig>>>['mock'];
    setPaths: ReturnType<typeof createDispatchMock<PathMeta[]>>['mock'];
    toast: ReturnType<typeof vi.fn>;
    persistActivePathPreference: ReturnType<typeof vi.fn>;
  };
} => {
  const oldPathId = 'path_old';
  const oldConfig = createDefaultPathConfig(oldPathId);
  const oldPath: PathMeta = {
    id: oldPathId,
    name: oldConfig.name,
    createdAt: oldConfig.createdAt,
    updatedAt: oldConfig.updatedAt,
  };

  const setActivePathId = createDispatchMock<string | null>();
  const setPathConfigs = createDispatchMock<Record<string, PathConfig>>();
  const setPaths = createDispatchMock<PathMeta[]>();
  const setNodes = createDispatchMock(oldConfig.nodes);
  const setEdges = createDispatchMock(oldConfig.edges);
  const setPathName = createDispatchMock<string>();
  const setPathDescription = createDispatchMock<string>();
  const setActiveTrigger = createDispatchMock<string>();
  const setExecutionMode = createDispatchMock<PathActionsInput['executionMode']>();
  const setFlowIntensity = createDispatchMock<PathActionsInput['flowIntensity']>();
  const setRunMode = createDispatchMock<PathActionsInput['runMode']>();
  const setStrictFlowMode = createDispatchMock<boolean>();
  const setBlockedRunPolicy = createDispatchMock<PathActionsInput['blockedRunPolicy']>();
  const setAiPathsValidation = createDispatchMock<PathActionsInput['aiPathsValidation']>();
  const setParserSamples = createDispatchMock<Record<string, PathActionsInput['parserSamples'][string]>>();
  const setUpdaterSamples = createDispatchMock<Record<string, PathActionsInput['updaterSamples'][string]>>();
  const setRuntimeState = createDispatchMock<RuntimeState>();
  const setLastRunAt = createDispatchMock<string | null>();
  const setIsPathLocked = createDispatchMock<boolean>();
  const setIsPathActive = createDispatchMock<boolean>();
  const setSelectedNodeId = createDispatchMock<string | null>();
  const setConfigOpen = createDispatchMock<boolean>();

  const toast = vi.fn();
  const persistPathSettings = vi.fn().mockResolvedValue(undefined);
  const persistSettingsBulk = vi.fn().mockResolvedValue(undefined);
  const persistActivePathPreference = vi.fn().mockResolvedValue(undefined);

  const input: PathActionsInput = {
    activePathId: oldPathId,
    setActivePathId: setActivePathId.dispatch,
    isPathLocked: false,
    pathConfigs: { [oldPathId]: oldConfig },
    setPathConfigs: setPathConfigs.dispatch,
    paths: [oldPath],
    setPaths: setPaths.dispatch,
    setNodes: setNodes.dispatch,
    setEdges: setEdges.dispatch,
    setPathName: setPathName.dispatch,
    setPathDescription: setPathDescription.dispatch,
    setActiveTrigger: setActiveTrigger.dispatch,
    setExecutionMode: setExecutionMode.dispatch,
    setFlowIntensity: setFlowIntensity.dispatch,
    setRunMode: setRunMode.dispatch,
    setStrictFlowMode: setStrictFlowMode.dispatch,
    setBlockedRunPolicy: setBlockedRunPolicy.dispatch,
    setAiPathsValidation: setAiPathsValidation.dispatch,
    setParserSamples: setParserSamples.dispatch,
    setUpdaterSamples: setUpdaterSamples.dispatch,
    setRuntimeState: setRuntimeState.dispatch,
    setLastRunAt: setLastRunAt.dispatch,
    setIsPathLocked: setIsPathLocked.dispatch,
    setIsPathActive: setIsPathActive.dispatch,
    setSelectedNodeId: setSelectedNodeId.dispatch,
    setConfigOpen: setConfigOpen.dispatch,
    normalizeTriggerLabel: (value) => value ?? 'Product Modal - Context Filter',
    updateActivePathMeta: vi.fn(),
    persistPathSettings,
    persistSettingsBulk,
    persistActivePathPreference,
    reportAiPathsError: vi.fn(),
    confirm: vi.fn(),
    toast,
  };

  return {
    input,
    mocks: {
      setActivePathId: setActivePathId.mock,
      setPathConfigs: setPathConfigs.mock,
      setPaths: setPaths.mock,
      toast,
      persistActivePathPreference,
    },
  };
};

describe('useAiPathsSettingsPathActions handleSwitchPath', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies fetched path config and persists active path preference', async () => {
    const { input, mocks } = buildInput();
    const nextPathId = 'path_next';
    const fetchedConfig = createDefaultPathConfig(nextPathId);

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
      expect(mocks.setActivePathId).toHaveBeenCalledWith(nextPathId);
    });
    expect(mocks.persistActivePathPreference).toHaveBeenCalledWith(nextPathId);
    expect(mocks.setPathConfigs).toHaveBeenCalledTimes(1);
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
    expect(mocks.setPathConfigs).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith('Failed to load selected path. Try again in a moment.', {
      variant: 'error',
    });
  });

  it('switches path using fallback full-settings lookup when selective fetch fails', async () => {
    const { input, mocks } = buildInput();
    const nextPathId = 'path_fallback';
    const recoveredConfig = createDefaultPathConfig(nextPathId);

    mockedFetchAiPathsSettingsByKeysCached.mockRejectedValueOnce(new Error('timeout'));
    mockedFetchAiPathsSettingsCached.mockResolvedValueOnce([
      {
        key: `ai_paths_config_${nextPathId}`,
        value: JSON.stringify(recoveredConfig),
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

  it('recovers invalid runtime state while switching paths', async () => {
    const { input, mocks } = buildInput();
    const nextPathId = 'path_invalid';
    const invalidConfig = createDefaultPathConfig(nextPathId);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
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
      mockedFetchAiPathsSettingsCached.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useAiPathsSettingsPathActions(input));

      act(() => {
        result.current.handleSwitchPath(nextPathId);
      });

      await waitFor(() => {
        expect(mocks.setActivePathId).toHaveBeenCalledWith(nextPathId);
      });
      expect(mocks.setPathConfigs).toHaveBeenCalledTimes(1);
      expect(mocks.persistActivePathPreference).toHaveBeenCalledWith(nextPathId);
      expect(mocks.toast).not.toHaveBeenCalledWith(
        'Failed to load selected path. Try again in a moment.',
        expect.anything()
      );
    } finally {
      warnSpy.mockRestore();
    }
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
