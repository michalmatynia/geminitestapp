import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createDefaultPathConfig,
  type PathConfig,
  type RuntimeState,
} from '@/shared/lib/ai-paths';
import { PATH_CONFIG_PREFIX } from '@/shared/lib/ai-paths';
import { fetchAiPathsSettingsByKeysCached } from '@/shared/lib/ai-paths/settings-store-client';

import type { UseAiPathsPersistenceArgs } from '../useAiPathsPersistence.types';
import { useAiPathsPersistence } from '../useAiPathsPersistence';
const selectNodeMock = vi.fn();
const setConfigOpenSelectionMock = vi.fn();
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
const setHistoryRetentionPassesGraphMock = vi.fn();
const setHistoryRetentionOptionsMaxGraphMock = vi.fn();
const setIsPathLockedGraphMock = vi.fn();
const setIsPathActiveGraphMock = vi.fn();
const setRuntimeStateMock = vi.fn();
const setParserSamplesMock = vi.fn();
const setUpdaterSamplesMock = vi.fn();
const setLastRunAtMock = vi.fn();
const setLoadingPersistenceMock = vi.fn();

const preferenceMock = {
  resolveUserPreferences: vi.fn(() => null),
  persistActivePathPreference: vi.fn(async () => undefined),
  persistUiState: vi.fn(async () => undefined),
  persistUserPreferences: vi.fn(async () => undefined),
  lastUiStatePayloadRef: { current: '' },
  lastUserPrefsActivePathIdRef: { current: null as string | null },
};

const pathMock = {
  autoSaveAt: null as string | null,
  autoSaveStatus: 'idle' as const,
  saving: false,
  persistPathConfig: vi.fn(async () => true),
  persistPathSettings: vi.fn(async () => null),
  buildPathSnapshot: vi.fn(() => 'snapshot'),
  lastSavedSnapshotRef: { current: null as string | null },
  setAutoSaveStatus: vi.fn(),
  setAutoSaveAt: vi.fn(),
};

const presetMock = {
  persistSettingsBulk: vi.fn(async () => undefined),
};

vi.mock('@/shared/lib/ai-paths/settings-store-client', async () => {
  const actual = await vi.importActual<
    typeof import('@/shared/lib/ai-paths/settings-store-client')
      >('@/shared/lib/ai-paths/settings-store-client');
  return {
    ...actual,
    fetchAiPathsSettingsByKeysCached: vi.fn(),
    updateAiPathsSettingsBulk: vi.fn(async () => []),
  };
});

vi.mock('../hooks/persistence/usePreferencePersistence', () => ({
  usePreferencePersistence: () => preferenceMock,
}));

vi.mock('../hooks/persistence/usePathPersistence', () => ({
  usePathPersistence: () => pathMock,
}));

vi.mock('../hooks/persistence/usePresetPersistence', () => ({
  usePresetPersistence: () => presetMock,
}));

vi.mock('@/features/ai/ai-paths/context/SelectionContext', () => ({
  useSelectionActions: () => ({
    selectNode: selectNodeMock,
    setConfigOpen: setConfigOpenSelectionMock,
  }),
}));

vi.mock('@/features/ai/ai-paths/context/GraphContext', () => ({
  useGraphActions: () => ({
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
    setHistoryRetentionPasses: setHistoryRetentionPassesGraphMock,
    setHistoryRetentionOptionsMax: setHistoryRetentionOptionsMaxGraphMock,
    setIsPathLocked: setIsPathLockedGraphMock,
    setIsPathActive: setIsPathActiveGraphMock,
  }),
}));

vi.mock('@/features/ai/ai-paths/context/RuntimeContext', () => ({
  useRuntimeActions: () => ({
    setRuntimeState: setRuntimeStateMock,
    setParserSamples: setParserSamplesMock,
    setUpdaterSamples: setUpdaterSamplesMock,
    setLastRunAt: setLastRunAtMock,
  }),
}));

vi.mock('@/features/ai/ai-paths/context/PersistenceContext', () => ({
  usePersistenceActions: () => ({
    setLoading: setLoadingPersistenceMock,
  }),
}));

const mockedFetchAiPathsSettingsByKeysCached = vi.mocked(fetchAiPathsSettingsByKeysCached);

const emptyRuntimeState = (): RuntimeState => ({
  status: 'idle',
  nodeStatuses: {},
  nodeOutputs: {},
  variables: {},
  events: [],
  currentRun: null,
  inputs: {},
  outputs: {},
});

const buildPathMeta = (
  config: Pick<PathConfig, 'id' | 'name'>
): UseAiPathsPersistenceArgs['paths'][number] => ({
  id: config.id,
  name: config.name,
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
});

describe('useAiPathsPersistence idle prefetch', () => {
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
    setHistoryRetentionPassesGraphMock.mockReset();
    setHistoryRetentionOptionsMaxGraphMock.mockReset();
    setIsPathLockedGraphMock.mockReset();
    setIsPathActiveGraphMock.mockReset();
    setRuntimeStateMock.mockReset();
    setParserSamplesMock.mockReset();
    setUpdaterSamplesMock.mockReset();
    setLastRunAtMock.mockReset();
    setLoadingPersistenceMock.mockReset();
  });

  it('does not request removed legacy validation key during hydration', async () => {
    const activePathId = 'path_active';
    const activeConfig = createDefaultPathConfig(activePathId);
    activeConfig.runMode = 'queue';

    mockedFetchAiPathsSettingsByKeysCached.mockImplementation(async (keys) => {
      if (keys.includes(`${PATH_CONFIG_PREFIX}${activePathId}`)) {
        return [
          {
            key: `${PATH_CONFIG_PREFIX}${activePathId}`,
            value: JSON.stringify(activeConfig),
          },
        ];
      }
      return [];
    });

    const args: UseAiPathsPersistenceArgs = {
      activePathId,
      activeTrigger: activeConfig.trigger,
      edges: activeConfig.edges,
      expandedPaletteGroups: new Set(['Trigger']),
      isPathActive: true,
      isPathLocked: false,
      lastRunAt: null,
      loadNonce: 0,
      loading: false,
      nodes: activeConfig.nodes,
      paletteCollapsed: false,
      parserSamples: {},
      pathConfigs: { [activePathId]: activeConfig },
      pathDescription: activeConfig.description,
      pathName: activeConfig.name,
      paths: [buildPathMeta(activeConfig)],
      executionMode: 'server',
      flowIntensity: 'medium',
      runMode: 'manual',
      strictFlowMode: true,
      blockedRunPolicy: 'fail_run',
      aiPathsValidation: { enabled: true },
      selectedNodeId: null,
      runtimeState: emptyRuntimeState(),
      updaterSamples: {},
      normalizeTriggerLabel: (value?: string | null) => value ?? 'Product Modal - Context Filter',
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
    };

    renderHook(() => useAiPathsPersistence(args));

    await waitFor(() => {
      expect(mockedFetchAiPathsSettingsByKeysCached).toHaveBeenCalled();
    });

    const requestedKeys = mockedFetchAiPathsSettingsByKeysCached.mock.calls.flatMap(
      (call) => call[0] ?? []
    );

    expect(requestedKeys).not.toContain('ai_paths_validation_v1');
    expect(requestedKeys).toContain('ai_paths_ui_state');
  });

  it('prefetches non-active path configs after initial hydration', async () => {
    const activePathId = 'path_active';
    const secondaryPathId = 'path_secondary';
    const activeConfig = createDefaultPathConfig(activePathId);
    const secondaryConfig = createDefaultPathConfig(secondaryPathId);
    const pathConfigsState: Record<string, PathConfig> = {
      [activePathId]: activeConfig,
    };

    mockedFetchAiPathsSettingsByKeysCached.mockImplementation(async (keys) => {
      if (keys.includes(`${PATH_CONFIG_PREFIX}${secondaryPathId}`)) {
        return [
          {
            key: `${PATH_CONFIG_PREFIX}${secondaryPathId}`,
            value: JSON.stringify(secondaryConfig),
          },
        ];
      }
      if (keys.includes(`${PATH_CONFIG_PREFIX}${activePathId}`)) {
        return [
          {
            key: `${PATH_CONFIG_PREFIX}${activePathId}`,
            value: JSON.stringify(activeConfig),
          },
        ];
      }
      return [];
    });

    const args: UseAiPathsPersistenceArgs = {
      activePathId,
      activeTrigger: activeConfig.trigger,
      edges: activeConfig.edges,
      expandedPaletteGroups: new Set(['Trigger']),
      isPathActive: true,
      isPathLocked: false,
      lastRunAt: null,
      loadNonce: 0,
      loading: false,
      nodes: activeConfig.nodes,
      paletteCollapsed: false,
      parserSamples: {},
      pathConfigs: pathConfigsState,
      pathDescription: activeConfig.description,
      pathName: activeConfig.name,
      paths: [buildPathMeta(activeConfig), buildPathMeta(secondaryConfig)],
      executionMode: 'server',
      flowIntensity: 'medium',
      runMode: 'manual',
      strictFlowMode: true,
      blockedRunPolicy: 'fail_run',
      aiPathsValidation: { enabled: true },
      selectedNodeId: null,
      runtimeState: emptyRuntimeState(),
      updaterSamples: {},
      normalizeTriggerLabel: (value?: string | null) => value ?? 'Product Modal - Context Filter',
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
    };

    renderHook(() => useAiPathsPersistence(args));

    await waitFor(
      () => {
        expect(mockedFetchAiPathsSettingsByKeysCached).toHaveBeenCalledWith(
          [`${PATH_CONFIG_PREFIX}${secondaryPathId}`],
          expect.objectContaining({ timeoutMs: 6000 })
        );
      },
      { timeout: 3000 }
    );

    await waitFor(() => {
      expect(setPathConfigsGraphMock).toHaveBeenCalledTimes(1);
    });
  });

  it('skips prefetch hydration for configs with legacy runtime identity payloads', async () => {
    const activePathId = 'path_active';
    const secondaryPathId = 'path_secondary_legacy_runtime';
    const activeConfig = createDefaultPathConfig(activePathId);
    const secondaryConfig = createDefaultPathConfig(secondaryPathId);
    secondaryConfig.runtimeState = JSON.stringify({
      status: 'idle',
      runId: 'legacy-run-id',
    });
    const pathConfigsState: Record<string, PathConfig> = {
      [activePathId]: activeConfig,
    };

    mockedFetchAiPathsSettingsByKeysCached.mockImplementation(async (keys) => {
      if (keys.includes(`${PATH_CONFIG_PREFIX}${secondaryPathId}`)) {
        return [
          {
            key: `${PATH_CONFIG_PREFIX}${secondaryPathId}`,
            value: JSON.stringify(secondaryConfig),
          },
        ];
      }
      if (keys.includes(`${PATH_CONFIG_PREFIX}${activePathId}`)) {
        return [
          {
            key: `${PATH_CONFIG_PREFIX}${activePathId}`,
            value: JSON.stringify(activeConfig),
          },
        ];
      }
      return [];
    });

    const args: UseAiPathsPersistenceArgs = {
      activePathId,
      activeTrigger: activeConfig.trigger,
      edges: activeConfig.edges,
      expandedPaletteGroups: new Set(['Trigger']),
      isPathActive: true,
      isPathLocked: false,
      lastRunAt: null,
      loadNonce: 0,
      loading: false,
      nodes: activeConfig.nodes,
      paletteCollapsed: false,
      parserSamples: {},
      pathConfigs: pathConfigsState,
      pathDescription: activeConfig.description,
      pathName: activeConfig.name,
      paths: [buildPathMeta(activeConfig), buildPathMeta(secondaryConfig)],
      executionMode: 'server',
      flowIntensity: 'medium',
      runMode: 'manual',
      strictFlowMode: true,
      blockedRunPolicy: 'fail_run',
      aiPathsValidation: { enabled: true },
      selectedNodeId: null,
      runtimeState: emptyRuntimeState(),
      updaterSamples: {},
      normalizeTriggerLabel: (value?: string | null) => value ?? 'Product Modal - Context Filter',
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
    };

    renderHook(() => useAiPathsPersistence(args));

    await waitFor(
      () => {
        expect(mockedFetchAiPathsSettingsByKeysCached).toHaveBeenCalledWith(
          [`${PATH_CONFIG_PREFIX}${secondaryPathId}`],
          expect.objectContaining({ timeoutMs: 6000 })
        );
      },
      { timeout: 3000 }
    );

    await new Promise((resolve) => setTimeout(resolve, 75));
    expect(setPathConfigsGraphMock).toHaveBeenCalledTimes(0);
  });
});
