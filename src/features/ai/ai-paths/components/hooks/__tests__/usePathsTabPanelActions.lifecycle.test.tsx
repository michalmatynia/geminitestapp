// @vitest-environment jsdom

import React, { useEffect } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AiPathsProvider,
  useGraphActions,
  useGraphDataState,
  usePathMetadataState,
  usePersistenceActions,
  useRuntimeActions,
  useRuntimeDataState,
  useRuntimeStatusState,
} from '@/features/ai/ai-paths/context';
import type { PathConfig, PathMeta } from '@/shared/contracts/ai-paths';
import { PATH_CONFIG_PREFIX, PATH_INDEX_KEY } from '@/shared/lib/ai-paths/core/constants';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils';
import {
  buildPersistedRuntimeState,
  sanitizePathConfig,
} from '@/shared/lib/ai-paths/core/utils';

import { usePathsTabPanelActions } from '../usePathsTabPanelActions';

type PersistedStore = {
  activePathId: string | null;
  pathConfigs: Record<string, PathConfig>;
  pathIndex: PathMeta[];
};

const mockState = vi.hoisted(() => ({
  confirm: vi.fn(),
  reportAiPathsError: vi.fn(),
  toast: vi.fn(),
  store: {
    activePathId: null,
    pathConfigs: {},
    pathIndex: [],
  } as PersistedStore,
}));

vi.mock('@/shared/hooks/ui/useConfirm', () => ({
  useConfirm: () => ({
    confirm: mockState.confirm,
    ConfirmationModal: (): React.JSX.Element => <div data-testid='confirmation-modal' />,
  }),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  useToast: () => ({ toast: mockState.toast }),
}));

vi.mock('@/features/ai/ai-paths/components/ai-paths-settings/useAiPathsErrorReporting', () => ({
  useAiPathsErrorReporting: () => ({
    reportAiPathsError: mockState.reportAiPathsError,
  }),
}));

vi.mock('@/shared/lib/observability/system-logger-client', () => ({
  logSystemEvent: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/settings-store-client', () => ({
  fetchAiPathsSettingsByKeysCached: vi.fn(async (keys: string[]) =>
    keys.flatMap((key: string) => {
      if (key === PATH_INDEX_KEY) {
        return [{ key, value: JSON.stringify(mockState.store.pathIndex) }];
      }
      if (!key.startsWith(PATH_CONFIG_PREFIX)) {
        return [];
      }
      const pathId = key.slice(PATH_CONFIG_PREFIX.length);
      const config = mockState.store.pathConfigs[pathId];
      if (!config) {
        return [];
      }
      return [{ key, value: JSON.stringify(config) }];
    })
  ),
  fetchAiPathsSettingsCached: vi.fn(async () => [
    { key: PATH_INDEX_KEY, value: JSON.stringify(mockState.store.pathIndex) },
    ...Object.entries(mockState.store.pathConfigs).map(([pathId, config]) => ({
      key: `${PATH_CONFIG_PREFIX}${pathId}`,
      value: JSON.stringify(config),
    })),
  ]),
  updateAiPathsSetting: vi.fn(async (key: string, value: string) => ({ key, value })),
  deleteAiPathsSettings: vi.fn(async (keys: string[]) => {
    keys.forEach((key: string) => {
      if (!key.startsWith(PATH_CONFIG_PREFIX)) return;
      delete mockState.store.pathConfigs[key.slice(PATH_CONFIG_PREFIX.length)];
    });
    return keys.length;
  }),
}));

type LifecycleHarness = {
  graphActions: ReturnType<typeof useGraphActions>;
  graphData: ReturnType<typeof useGraphDataState>;
  pathActions: ReturnType<typeof usePathsTabPanelActions>;
  pathMetadata: ReturnType<typeof usePathMetadataState>;
  persistenceActions: ReturnType<typeof usePersistenceActions>;
  runtimeActions: ReturnType<typeof useRuntimeActions>;
  runtimeData: ReturnType<typeof useRuntimeDataState>;
  runtimeStatus: ReturnType<typeof useRuntimeStatusState>;
};

const summarizeNodes = (nodes: Array<Record<string, unknown>>): string[] =>
  nodes
    .map((node: Record<string, unknown>) =>
      [
        String(node.id ?? ''),
        String(node.type ?? ''),
        String(node.title ?? ''),
      ].join('|')
    )
    .sort();

const summarizeEdges = (edges: Array<Record<string, unknown>>): string[] =>
  edges
    .map((edge: Record<string, unknown>) =>
      [
        String(edge.id ?? ''),
        String(edge.from ?? ''),
        String(edge.fromPort ?? ''),
        String(edge.to ?? ''),
        String(edge.toPort ?? ''),
      ].join('|')
    )
    .sort();

const buildRunRecord = (pathId: string, pathName: string, timestamp: string) => ({
  id: `run-${pathId}`,
  status: 'completed' as const,
  startedAt: timestamp,
  finishedAt: timestamp,
  pathId,
  pathName,
  createdAt: timestamp,
  updatedAt: timestamp,
});

function useLifecycleHarness(): LifecycleHarness {
  const pathActions = usePathsTabPanelActions();
  const graphActions = useGraphActions();
  const graphData = useGraphDataState();
  const pathMetadata = usePathMetadataState();
  const persistenceActions = usePersistenceActions();
  const runtimeActions = useRuntimeActions();
  const runtimeData = useRuntimeDataState();
  const runtimeStatus = useRuntimeStatusState();

  useEffect(() => {
    const persistConfigForPath = (pathId: string): PathConfig => {
      const now = runtimeStatus.lastRunAt ?? new Date().toISOString();
      const baseConfig = pathMetadata.pathConfigs[pathId] ?? createDefaultPathConfig(pathId);
      const activePath = pathMetadata.activePathId === pathId;

      return sanitizePathConfig({
        ...createDefaultPathConfig(pathId),
        ...baseConfig,
        id: pathId,
        name: activePath ? pathMetadata.pathName : baseConfig.name,
        description: activePath ? pathMetadata.pathDescription : baseConfig.description,
        trigger: activePath ? pathMetadata.activeTrigger : baseConfig.trigger,
        executionMode: activePath ? pathMetadata.executionMode : baseConfig.executionMode,
        flowIntensity: activePath ? pathMetadata.flowIntensity : baseConfig.flowIntensity,
        runMode: activePath ? pathMetadata.runMode : baseConfig.runMode,
        strictFlowMode: activePath ? pathMetadata.strictFlowMode : baseConfig.strictFlowMode,
        blockedRunPolicy: activePath
          ? pathMetadata.blockedRunPolicy
          : baseConfig.blockedRunPolicy,
        aiPathsValidation: activePath
          ? pathMetadata.aiPathsValidation
          : baseConfig.aiPathsValidation,
        historyRetentionPasses: activePath
          ? pathMetadata.historyRetentionPasses
          : baseConfig.historyRetentionPasses,
        historyRetentionOptionsMax: activePath
          ? pathMetadata.historyRetentionOptionsMax
          : baseConfig.historyRetentionOptionsMax,
        nodes: activePath ? graphData.nodes : baseConfig.nodes,
        edges: activePath ? graphData.edges : baseConfig.edges,
        isLocked: activePath ? pathMetadata.isPathLocked : baseConfig.isLocked,
        isActive: activePath ? pathMetadata.isPathActive : baseConfig.isActive,
        parserSamples: activePath ? runtimeData.parserSamples : baseConfig.parserSamples,
        updaterSamples: activePath ? runtimeData.updaterSamples : baseConfig.updaterSamples,
        runtimeState: activePath
          ? buildPersistedRuntimeState(runtimeData.runtimeState, graphData.nodes)
          : baseConfig.runtimeState,
        lastRunAt: activePath ? runtimeStatus.lastRunAt : baseConfig.lastRunAt,
        updatedAt: now,
        uiState: {
          ...(baseConfig.uiState ?? {}),
          configOpen: false,
        },
      });
    };

    persistenceActions.setOperationHandlers({
      savePathConfig: async (): Promise<boolean> => {
        const activePathId = pathMetadata.activePathId;
        if (!activePathId) return false;

        const persistedConfig = persistConfigForPath(activePathId);
        const nextUpdatedAt = persistedConfig.updatedAt;
        const nextPaths = pathMetadata.paths.map((path: PathMeta): PathMeta =>
          path.id === activePathId
            ? {
                ...path,
                name: pathMetadata.pathName,
                updatedAt: nextUpdatedAt,
              }
            : path
        );

        mockState.store.pathConfigs[activePathId] = persistedConfig;
        mockState.store.pathIndex = nextPaths;
        mockState.store.activePathId = activePathId;

        graphActions.setPathConfigs((prev: Record<string, PathConfig>): Record<string, PathConfig> => ({
          ...prev,
          [activePathId]: persistedConfig,
        }));
        graphActions.setPaths(nextPaths);

        return true;
      },
      persistPathSettings: async (
        nextPaths: PathMeta[],
        configId: string,
        config: PathConfig
      ): Promise<PathConfig> => {
        const persistedConfig = sanitizePathConfig(config);
        mockState.store.pathConfigs[configId] = persistedConfig;
        mockState.store.pathIndex = nextPaths;
        mockState.store.activePathId = configId;
        return persistedConfig;
      },
      persistSettingsBulk: async (entries: Array<{ key: string; value: string }>): Promise<void> => {
        entries.forEach(({ key, value }: { key: string; value: string }) => {
          if (key === PATH_INDEX_KEY) {
            mockState.store.pathIndex = JSON.parse(value) as PathMeta[];
            return;
          }
          if (!key.startsWith(PATH_CONFIG_PREFIX)) return;
          mockState.store.pathConfigs[key.slice(PATH_CONFIG_PREFIX.length)] = JSON.parse(
            value
          ) as PathConfig;
        });
      },
      persistActivePathPreference: async (pathId: string | null): Promise<void> => {
        mockState.store.activePathId = pathId;
      },
      savePathIndex: async (nextPaths: PathMeta[]): Promise<void> => {
        mockState.store.pathIndex = nextPaths;
      },
    });

    return (): void => {
      persistenceActions.setOperationHandlers({});
    };
  }, [
    graphActions,
    graphData.edges,
    graphData.nodes,
    pathMetadata.activePathId,
    pathMetadata.activeTrigger,
    pathMetadata.aiPathsValidation,
    pathMetadata.blockedRunPolicy,
    pathMetadata.executionMode,
    pathMetadata.flowIntensity,
    pathMetadata.historyRetentionOptionsMax,
    pathMetadata.historyRetentionPasses,
    pathMetadata.isPathActive,
    pathMetadata.isPathLocked,
    pathMetadata.pathConfigs,
    pathMetadata.pathDescription,
    pathMetadata.pathName,
    pathMetadata.paths,
    pathMetadata.runMode,
    pathMetadata.strictFlowMode,
    persistenceActions,
    runtimeData.parserSamples,
    runtimeData.runtimeState,
    runtimeData.updaterSamples,
    runtimeStatus.lastRunAt,
  ]);

  return {
    graphActions,
    graphData,
    pathActions,
    pathMetadata,
    persistenceActions,
    runtimeActions,
    runtimeData,
    runtimeStatus,
  };
}

const renderLifecycleHook = (options?: {
  initialActivePathId?: string | null;
  initialPathConfigs?: Record<string, PathConfig>;
  initialPaths?: PathMeta[];
}) =>
  renderHook(() => useLifecycleHarness(), {
    wrapper: ({ children }: { children: React.ReactNode }): React.JSX.Element => (
      <AiPathsProvider
        initialActivePathId={options?.initialActivePathId ?? null}
        initialEdges={[]}
        initialLoading={false}
        initialNodes={[]}
        initialPathConfigs={options?.initialPathConfigs ?? {}}
        initialPaths={options?.initialPaths ?? []}
        initialRuntimeState={{ inputs: {}, outputs: {} } as never}
      >
        {children}
      </AiPathsProvider>
    ),
  });

describe('usePathsTabPanelActions lifecycle', () => {
  beforeEach(() => {
    mockState.confirm.mockReset();
    mockState.reportAiPathsError.mockReset();
    mockState.toast.mockReset();
    mockState.store.activePathId = null;
    mockState.store.pathConfigs = {};
    mockState.store.pathIndex = [];
  });

  it('persists saved graph/runtime results and reloads them across remounts', async () => {
    const firstMount = renderLifecycleHook();

    act(() => {
      firstMount.result.current.pathActions.handleCreatePath();
    });

    const firstPathId = firstMount.result.current.pathMetadata.activePathId;
    expect(firstPathId).toBeTruthy();

    const firstPathGraph = createDefaultPathConfig(firstPathId as string);
    const firstNodeId = firstPathGraph.nodes[0]?.id as string;
    const firstRunTimestamp = '2026-04-09T10:00:00.000Z';

    act(() => {
      firstMount.result.current.graphActions.setPathName('Lifecycle Path A');
      firstMount.result.current.graphActions.setNodes(firstPathGraph.nodes);
      firstMount.result.current.graphActions.setEdges(firstPathGraph.edges);
      firstMount.result.current.runtimeActions.updateNodeInputs(firstNodeId, {
        seed: 'path-a',
      });
      firstMount.result.current.runtimeActions.updateNodeOutputs(firstNodeId, {
        result: 'alpha',
      });
      firstMount.result.current.runtimeActions.setRuntimeState((prev) => ({
        ...prev,
        status: 'completed',
        currentRun: buildRunRecord(firstPathId as string, 'Lifecycle Path A', firstRunTimestamp),
        nodeStatuses: {
          [firstNodeId]: 'completed',
        },
        nodeOutputs: {
          [firstNodeId]: {
            result: 'alpha',
          },
        },
      }));
      firstMount.result.current.runtimeActions.setLastRunAt(firstRunTimestamp);
      firstMount.result.current.runtimeActions.setCurrentRunId(`run-${firstPathId}`);
      firstMount.result.current.runtimeActions.setRuntimeRunStatus('completed');
    });

    let firstSaveSucceeded = false;
    await act(async () => {
      firstSaveSucceeded = await firstMount.result.current.persistenceActions.savePathConfig();
    });
    expect(firstSaveSucceeded).toBe(true);
    expect(mockState.store.pathConfigs[firstPathId as string]?.runtimeState).toContain('alpha');

    act(() => {
      firstMount.result.current.pathActions.handleCreatePath();
    });

    const secondPathId = firstMount.result.current.pathMetadata.activePathId;
    expect(secondPathId).toBeTruthy();
    expect(secondPathId).not.toBe(firstPathId);

    const secondPathGraph = createDefaultPathConfig(secondPathId as string);
    const secondNodeId = (secondPathGraph.nodes[1] ?? secondPathGraph.nodes[0])?.id as string;
    const secondRunTimestamp = '2026-04-09T11:00:00.000Z';

    act(() => {
      firstMount.result.current.graphActions.setPathName('Lifecycle Path B');
      firstMount.result.current.graphActions.setNodes(secondPathGraph.nodes);
      firstMount.result.current.graphActions.setEdges(secondPathGraph.edges);
      firstMount.result.current.runtimeActions.clearAllRuntime();
      firstMount.result.current.runtimeActions.updateNodeInputs(secondNodeId, {
        seed: 'path-b',
      });
      firstMount.result.current.runtimeActions.updateNodeOutputs(secondNodeId, {
        result: 'beta',
      });
      firstMount.result.current.runtimeActions.setRuntimeState((prev) => ({
        ...prev,
        status: 'completed',
        currentRun: buildRunRecord(secondPathId as string, 'Lifecycle Path B', secondRunTimestamp),
        nodeStatuses: {
          [secondNodeId]: 'completed',
        },
        nodeOutputs: {
          [secondNodeId]: {
            result: 'beta',
          },
        },
      }));
      firstMount.result.current.runtimeActions.setLastRunAt(secondRunTimestamp);
      firstMount.result.current.runtimeActions.setCurrentRunId(`run-${secondPathId}`);
      firstMount.result.current.runtimeActions.setRuntimeRunStatus('completed');
    });

    let secondSaveSucceeded = false;
    await act(async () => {
      secondSaveSucceeded = await firstMount.result.current.persistenceActions.savePathConfig();
    });
    expect(secondSaveSucceeded).toBe(true);
    expect(mockState.store.pathIndex).toHaveLength(2);
    expect(mockState.store.pathConfigs[secondPathId as string]?.runtimeState).toContain('beta');

    firstMount.unmount();

    const reloadedMount = renderLifecycleHook({
      initialActivePathId: secondPathId,
      initialPathConfigs: {},
      initialPaths: mockState.store.pathIndex,
    });

    act(() => {
      reloadedMount.result.current.pathActions.handleSwitchPath(firstPathId as string);
    });

    await waitFor(() => {
      expect(reloadedMount.result.current.pathMetadata.activePathId).toBe(firstPathId);
      expect(reloadedMount.result.current.pathMetadata.pathName).toBe('Lifecycle Path A');
      expect(
        summarizeNodes(
          reloadedMount.result.current.graphData.nodes as Array<Record<string, unknown>>
        )
      ).toEqual(
        summarizeNodes(
          (mockState.store.pathConfigs[firstPathId as string]?.nodes ??
            []) as Array<Record<string, unknown>>
        )
      );
      expect(
        summarizeEdges(
          reloadedMount.result.current.graphData.edges as Array<Record<string, unknown>>
        )
      ).toEqual(
        summarizeEdges(
          (mockState.store.pathConfigs[firstPathId as string]?.edges ??
            []) as Array<Record<string, unknown>>
        )
      );
      expect(reloadedMount.result.current.runtimeData.runtimeState.outputs[firstNodeId]).toEqual({
        result: 'alpha',
      });
      expect(reloadedMount.result.current.runtimeData.runtimeState.currentRun?.id).toBe(
        `run-${firstPathId}`
      );
      expect(reloadedMount.result.current.runtimeStatus.lastRunAt).toBe(firstRunTimestamp);
    });

    act(() => {
      reloadedMount.result.current.pathActions.handleSwitchPath(secondPathId as string);
    });

    await waitFor(() => {
      expect(reloadedMount.result.current.pathMetadata.activePathId).toBe(secondPathId);
      expect(reloadedMount.result.current.pathMetadata.pathName).toBe('Lifecycle Path B');
      expect(
        summarizeNodes(
          reloadedMount.result.current.graphData.nodes as Array<Record<string, unknown>>
        )
      ).toEqual(
        summarizeNodes(
          (mockState.store.pathConfigs[secondPathId as string]?.nodes ??
            []) as Array<Record<string, unknown>>
        )
      );
      expect(
        summarizeEdges(
          reloadedMount.result.current.graphData.edges as Array<Record<string, unknown>>
        )
      ).toEqual(
        summarizeEdges(
          (mockState.store.pathConfigs[secondPathId as string]?.edges ??
            []) as Array<Record<string, unknown>>
        )
      );
      expect(reloadedMount.result.current.runtimeData.runtimeState.outputs[secondNodeId]).toEqual({
        result: 'beta',
      });
      expect(reloadedMount.result.current.runtimeData.runtimeState.currentRun?.id).toBe(
        `run-${secondPathId}`
      );
      expect(reloadedMount.result.current.runtimeStatus.lastRunAt).toBe(secondRunTimestamp);
    });

    expect(mockState.store.activePathId).toBe(secondPathId);
    expect(mockState.reportAiPathsError).not.toHaveBeenCalled();
  });
});
