import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultPathConfig, type PathConfig } from '@/shared/lib/ai-paths';
import { PATH_CONFIG_PREFIX } from '@/shared/lib/ai-paths';
import { fetchAiPathsSettingsByKeysCached } from '@/shared/lib/ai-paths/settings-store-client';

import type { UseAiPathsPersistenceArgs } from '../useAiPathsPersistence.types';
import { useAiPathsPersistence } from '../useAiPathsPersistence';

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
  persistRuntimePathState: vi.fn(async () => undefined),
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

const mockedFetchAiPathsSettingsByKeysCached = vi.mocked(fetchAiPathsSettingsByKeysCached);

describe('useAiPathsPersistence idle prefetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefetches non-active path configs after initial hydration', async () => {
    const activePathId = 'path_active';
    const secondaryPathId = 'path_secondary';
    const activeConfig = createDefaultPathConfig(activePathId);
    const secondaryConfig = createDefaultPathConfig(secondaryPathId);
    let pathConfigsState: Record<string, PathConfig> = {
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
      paths: [
        {
          id: activePathId,
          name: activeConfig.name,
          createdAt: activeConfig.createdAt,
          updatedAt: activeConfig.updatedAt,
        },
        {
          id: secondaryPathId,
          name: secondaryConfig.name,
          createdAt: secondaryConfig.createdAt,
          updatedAt: secondaryConfig.updatedAt,
        },
      ],
      executionMode: 'server',
      flowIntensity: 'medium',
      runMode: 'manual',
      strictFlowMode: true,
      blockedRunPolicy: 'fail_run',
      aiPathsValidation: { enabled: true },
      selectedNodeId: null,
      runtimeState: {} as UseAiPathsPersistenceArgs['runtimeState'],
      updaterSamples: {},
      normalizeDbNodePreset: (raw) => raw as never,
      normalizeDbQueryPreset: (raw) => raw as never,
      normalizeTriggerLabel: (value?: string | null) => value ?? 'Product Modal - Context Filter',
      persistLastError: async () => undefined,
      reportAiPathsError: vi.fn(),
      setActivePathId: vi.fn(),
      setActiveTrigger: vi.fn(),
      setClusterPresets: vi.fn(),
      setDbNodePresets: vi.fn(),
      setDbQueryPresets: vi.fn(),
      setEdges: vi.fn(),
      setExpandedPaletteGroups: vi.fn(),
      setLastError: vi.fn(),
      setLastRunAt: vi.fn(),
      setLoading: vi.fn(),
      setIsPathActive: vi.fn(),
      setIsPathLocked: vi.fn(),
      setNodes: vi.fn(),
      setPaletteCollapsed: vi.fn(),
      setParserSamples: vi.fn(),
      setPathConfigs: vi.fn(
        (
          updater:
            | Record<string, PathConfig>
            | ((prev: Record<string, PathConfig>) => Record<string, PathConfig>)
        ) => {
          pathConfigsState = typeof updater === 'function' ? updater(pathConfigsState) : updater;
        }
      ),
      setPathDebugSnapshots: vi.fn(),
      setPathDescription: vi.fn(),
      setExecutionMode: vi.fn(),
      setFlowIntensity: vi.fn(),
      setRunMode: vi.fn(),
      setStrictFlowMode: vi.fn(),
      setBlockedRunPolicy: vi.fn(),
      setAiPathsValidation: vi.fn(),
      setHistoryRetentionPasses: vi.fn(),
      setHistoryRetentionOptionsMax: vi.fn(),
      setPathName: vi.fn(),
      setPaths: vi.fn(),
      setRuntimeState: vi.fn(),
      setConfigOpen: vi.fn(),
      setSelectedNodeId: vi.fn(),
      setUpdaterSamples: vi.fn(),
      toast: vi.fn(),
    };

    renderHook(() => useAiPathsPersistence(args));

    await waitFor(() => {
      expect(mockedFetchAiPathsSettingsByKeysCached).toHaveBeenCalledWith(
        [`${PATH_CONFIG_PREFIX}${secondaryPathId}`],
        expect.objectContaining({ timeoutMs: 6000 })
      );
    }, { timeout: 3000 });
  });
});
