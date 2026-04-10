import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePathPersistence } from '../usePathPersistence';

const mockState = vi.hoisted(() => ({
  graphActions: {
    setNodes: vi.fn(),
    setEdges: vi.fn(),
    setPathConfigs: vi.fn(),
    setPaths: vi.fn(),
  },
  runtimeActions: {
    setLastError: vi.fn(),
    setLastRunAt: vi.fn(),
    setParserSamples: vi.fn(),
    setRuntimeState: vi.fn(),
    setUpdaterSamples: vi.fn(),
  },
  selectionActions: {
    selectNode: vi.fn(),
  },
  buildPersistedRuntimeState: vi.fn(),
  sanitizePathConfig: vi.fn((config: Record<string, unknown>) => ({
    ...config,
    sanitized: true,
  })),
  compileGraph: vi.fn(),
  normalizeParserSamples: vi.fn((samples: unknown) => samples ?? {}),
  normalizeNodes: vi.fn((nodes: unknown) => nodes),
  normalizeUpdaterSamples: vi.fn((samples: unknown) => samples ?? {}),
  parseRuntimeState: vi.fn((state: unknown) => state),
  safeParseJson: vi.fn((value: string) => ({ value: JSON.parse(value) })),
  stableStringify: vi.fn((value: unknown) => JSON.stringify(value)),
  sanitizeEdges: vi.fn((_nodes: unknown, edges: unknown) => edges),
  buildCompileWarningMessage: vi.fn(() => 'Compile warning summary'),
  updateAiPathsSettingsBulk: vi.fn(),
  pruneSingleCardinalityIncomingEdges: vi.fn(),
  buildNodesForAutoSaveHelper: vi.fn((nodes: unknown) => nodes),
  collectInvalidPathSavePayloadIssues: vi.fn(() => []),
  lintPathNodeRoles: vi.fn(() => ({ errors: [], warnings: [] })),
  mergeNodeOverride: vi.fn((nodes: Array<Record<string, unknown>>, nodeOverride?: Record<string, unknown>) =>
    nodeOverride
      ? nodes.map((node) => (node.id === nodeOverride.id ? nodeOverride : node))
      : nodes
  ),
  normalizeConfigForHash: vi.fn((config: unknown) => config),
  resolvePersistedNodeConfigMismatch: vi.fn(() => null),
  resolvePathSaveBlockedMessage: vi.fn(() => null),
  shouldExposePathSaveRawMessage: vi.fn(() => false),
  stripNodeConfig: vi.fn((nodes: unknown) => nodes),
  logClientError: vi.fn(), logClientCatch: vi.fn(),
  repairPathNodeIdentities: vi.fn((config: Record<string, unknown>) => ({
    config,
    changed: false,
    warnings: [],
  })),
}));

vi.mock('@/shared/lib/ai-paths/core/utils/path-config-sanitization', () => ({
  buildPersistedRuntimeState: (...args: unknown[]) => mockState.buildPersistedRuntimeState(...args),
  sanitizePathConfig: (...args: unknown[]) => mockState.sanitizePathConfig(...args),
}));

vi.mock('@/shared/lib/ai-paths/core/definitions', () => ({
  palette: [],
}));

vi.mock('@/shared/lib/ai-paths/core/utils/node-identity', () => ({
  repairPathNodeIdentities: (...args: unknown[]) => mockState.repairPathNodeIdentities(...args),
}));

vi.mock('@/shared/lib/ai-paths/core/utils/runtime-state', () => ({
  normalizeParserSamples: (...args: unknown[]) => mockState.normalizeParserSamples(...args),
  normalizeUpdaterSamples: (...args: unknown[]) => mockState.normalizeUpdaterSamples(...args),
  parseRuntimeState: (...args: unknown[]) => mockState.parseRuntimeState(...args),
}));

vi.mock('@/features/ai/ai-paths/context/GraphContext', () => ({
  useGraphActions: () => mockState.graphActions,
}));

vi.mock('@/features/ai/ai-paths/context/RuntimeContext', () => ({
  useRuntimeActions: () => mockState.runtimeActions,
}));

vi.mock('@/features/ai/ai-paths/context/SelectionContext', () => ({
  useSelectionActions: () => mockState.selectionActions,
}));

vi.mock('@/shared/lib/ai-paths', () => ({
  PATH_CONFIG_PREFIX: 'path-config:',
  PATH_INDEX_KEY: 'path-index',
  STORAGE_VERSION: 7,
  compileGraph: (...args: unknown[]) => mockState.compileGraph(...args),
  normalizeNodes: (...args: unknown[]) => mockState.normalizeNodes(...args),
  safeParseJson: (...args: unknown[]) => mockState.safeParseJson(...args),
  stableStringify: (...args: unknown[]) => mockState.stableStringify(...args),
  sanitizeEdges: (...args: unknown[]) => mockState.sanitizeEdges(...args),
}));

vi.mock('@/shared/lib/ai-paths/core/utils/compile-warning-message', () => ({
  buildCompileWarningMessage: (...args: unknown[]) => mockState.buildCompileWarningMessage(...args),
}));

vi.mock('@/shared/lib/ai-paths/settings-store-client', () => ({
  updateAiPathsSettingsBulk: (...args: unknown[]) => mockState.updateAiPathsSettingsBulk(...args),
}));

vi.mock('@/features/ai/ai-paths/components/ai-paths-settings/edge-cardinality-repair', () => ({
  pruneSingleCardinalityIncomingEdges: (...args: unknown[]) =>
    mockState.pruneSingleCardinalityIncomingEdges(...args),
}));

vi.mock('@/features/ai/ai-paths/components/ai-paths-settings/useAiPathsPersistence.helpers', () => ({
  buildNodesForAutoSave: (...args: unknown[]) => mockState.buildNodesForAutoSaveHelper(...args),
  collectInvalidPathSavePayloadIssues: (...args: unknown[]) =>
    mockState.collectInvalidPathSavePayloadIssues(...args),
  lintPathNodeRoles: (...args: unknown[]) => mockState.lintPathNodeRoles(...args),
  mergeNodeOverride: (...args: unknown[]) => mockState.mergeNodeOverride(...args),
  normalizeConfigForHash: (...args: unknown[]) => mockState.normalizeConfigForHash(...args),
  resolvePersistedNodeConfigMismatch: (...args: unknown[]) =>
    mockState.resolvePersistedNodeConfigMismatch(...args),
  resolvePathSaveBlockedMessage: (...args: unknown[]) =>
    mockState.resolvePathSaveBlockedMessage(...args),
  shouldExposePathSaveRawMessage: (...args: unknown[]) =>
    mockState.shouldExposePathSaveRawMessage(...args),
  stripNodeConfig: (...args: unknown[]) => mockState.stripNodeConfig(...args),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => mockState.logClientError(...args),
}));

const createArgs = (overrides: Record<string, unknown> = {}) =>
  ({
    activePathId: 'path-1',
    activeTrigger: 'Product Modal - Context Filter',
    edges: [
      { id: 'edge-b', source: 'node-2', target: 'node-1' },
      { id: 'edge-a', source: 'node-1', target: 'node-2' },
    ],
    expandedPaletteGroups: new Set(['group-a']),
    isPathActive: true,
    isPathLocked: false,
    lastRunAt: '2026-03-19T10:00:00.000Z',
    loadNonce: 2,
    loading: false,
    nodes: [
      { id: 'node-2', title: 'Node 2', config: { stale: true } },
      { id: 'node-1', title: 'Node 1', config: { stale: true } },
    ],
    paletteCollapsed: false,
    parserSamples: { 'node-1': { json: '{"ok":true}' } },
    pathConfigs: {
      'path-1': {
        id: 'path-1',
        version: 9,
        runCount: 4,
        nodes: [{ id: 'node-1' }],
        edges: [{ id: 'edge-a' }],
      },
    },
    pathDescription: 'Main path',
    pathName: 'Primary Path',
    paths: [
      {
        id: 'path-1',
        name: 'Primary Path',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      },
    ],
    executionMode: 'server',
    flowIntensity: 'medium',
    runMode: 'manual',
    strictFlowMode: true,
    blockedRunPolicy: 'fail_run',
    aiPathsValidation: { enabled: true },
    selectedNodeId: 'node-1',
    runtimeState: {
      status: 'idle',
      inputs: { 'node-1': { value: 1 } },
      outputs: { 'node-2': { value: 2 } },
    },
    updaterSamples: { 'node-2': { json: '{"ok":false}' } },
    normalizeTriggerLabel: (value?: string | null) => value?.trim() || 'Fallback Trigger',
    reportAiPathsError: vi.fn(),
    toast: vi.fn(),
    ...overrides,
  }) as never;

const createCore = () => ({
  enqueueSettingsWrite: vi.fn(async <T,>(operation: () => Promise<T>) => await operation()),
  stringifyForStorage: vi.fn((value: unknown) => JSON.stringify(value)),
  persistLastError: vi.fn(async (_error: unknown) => undefined),
});

describe('usePathPersistence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T15:00:00.000Z'));

    mockState.graphActions.setNodes.mockReset();
    mockState.graphActions.setEdges.mockReset();
    mockState.graphActions.setPathConfigs.mockReset();
    mockState.graphActions.setPaths.mockReset();
    mockState.runtimeActions.setLastError.mockReset();
    mockState.runtimeActions.setLastRunAt.mockReset();
    mockState.runtimeActions.setParserSamples.mockReset();
    mockState.runtimeActions.setRuntimeState.mockReset();
    mockState.runtimeActions.setUpdaterSamples.mockReset();
    mockState.selectionActions.selectNode.mockReset();
    mockState.buildPersistedRuntimeState.mockReset().mockReturnValue({ persisted: true });
    mockState.sanitizePathConfig.mockReset().mockImplementation((config: Record<string, unknown>) => ({
      ...config,
      sanitized: true,
    }));
    mockState.compileGraph.mockReset().mockReturnValue({ errors: 0, warnings: 0, findings: [] });
    mockState.normalizeParserSamples.mockReset().mockImplementation((samples: unknown) => samples ?? {});
    mockState.normalizeNodes.mockReset().mockImplementation((nodes: unknown) => nodes);
    mockState.normalizeUpdaterSamples.mockReset().mockImplementation((samples: unknown) => samples ?? {});
    mockState.parseRuntimeState.mockReset().mockImplementation((state: unknown) => state);
    mockState.safeParseJson.mockReset().mockImplementation((value: string) => ({ value: JSON.parse(value) }));
    mockState.stableStringify.mockReset().mockImplementation((value: unknown) => JSON.stringify(value));
    mockState.sanitizeEdges.mockReset().mockImplementation((_nodes: unknown, edges: unknown) => edges);
    mockState.buildCompileWarningMessage.mockReset().mockReturnValue('Compile warning summary');
    mockState.updateAiPathsSettingsBulk.mockReset().mockImplementation(async (payload: unknown) => payload);
    mockState.pruneSingleCardinalityIncomingEdges.mockReset().mockImplementation((_nodes: unknown, edges: unknown) => ({
      edges,
      removedEdges: [],
    }));
    mockState.buildNodesForAutoSaveHelper.mockReset().mockImplementation((nodes: unknown) => nodes);
    mockState.collectInvalidPathSavePayloadIssues.mockReset().mockReturnValue([]);
    mockState.lintPathNodeRoles.mockReset().mockReturnValue({ errors: [], warnings: [] });
    mockState.mergeNodeOverride.mockReset().mockImplementation(
      (nodes: Array<Record<string, unknown>>, nodeOverride?: Record<string, unknown>) =>
        nodeOverride
          ? nodes.map((node) => (node.id === nodeOverride.id ? nodeOverride : node))
          : nodes
    );
    mockState.normalizeConfigForHash.mockReset().mockImplementation((config: unknown) => config);
    mockState.resolvePersistedNodeConfigMismatch.mockReset().mockReturnValue(null);
    mockState.resolvePathSaveBlockedMessage.mockReset().mockReturnValue(null);
    mockState.shouldExposePathSaveRawMessage.mockReset().mockReturnValue(false);
    mockState.stripNodeConfig.mockReset().mockImplementation((nodes: unknown) => nodes);
    mockState.logClientError.mockReset();
    mockState.repairPathNodeIdentities.mockReset().mockImplementation((config: Record<string, unknown>) => ({
      config,
      changed: false,
      warnings: [],
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('persists path settings, parses the saved config, and dedupes identical payloads', async () => {
    const args = createArgs();
    const core = createCore();
    const config = {
      id: 'path-1',
      updatedAt: '2026-03-19T15:00:00.000Z',
      nodes: [{ id: 'node-1' }],
      edges: [{ id: 'edge-a' }],
    };
    mockState.updateAiPathsSettingsBulk.mockResolvedValueOnce([
      { key: 'path-index', value: JSON.stringify(args.paths) },
      {
        key: 'path-config:path-1',
        value: JSON.stringify({ ...config, persisted: true }),
      },
    ]);

    const { result } = renderHook(() => usePathPersistence(args, core));

    const first = await act(async () =>
      await result.current.persistPathSettings(args.paths, 'path-1', config as never)
    );
    const second = await act(async () =>
      await result.current.persistPathSettings(args.paths, 'path-1', config as never)
    );

    expect(first).toEqual({ ...config, persisted: true });
    expect(second).toEqual({ ...config, sanitized: true });
    expect(core.enqueueSettingsWrite).toHaveBeenCalledTimes(1);
    expect(mockState.updateAiPathsSettingsBulk).toHaveBeenCalledTimes(1);
    expect(mockState.updateAiPathsSettingsBulk).toHaveBeenCalledWith([
      { key: 'path-index', value: JSON.stringify(args.paths) },
      {
        key: 'path-config:path-1',
        value: JSON.stringify({ ...config, sanitized: true }),
      },
    ]);
  });

  it('falls back to the sanitized config when persisted payload parsing fails', async () => {
    const args = createArgs();
    const core = createCore();
    const config = {
      id: 'path-1',
      updatedAt: '2026-03-19T15:00:00.000Z',
      nodes: [{ id: 'node-1' }],
      edges: [{ id: 'edge-a' }],
    };
    const parseFailure = new Error('bad persisted payload');
    mockState.updateAiPathsSettingsBulk.mockResolvedValueOnce([
      { key: 'path-index', value: JSON.stringify(args.paths) },
      {
        key: 'path-config:path-1',
        value: '{"bad":true}',
      },
    ]);
    mockState.safeParseJson.mockImplementationOnce(() => {
      throw parseFailure;
    });

    const { result } = renderHook(() => usePathPersistence(args, core));

    const persisted = await act(async () =>
      await result.current.persistPathSettings(args.paths, 'path-1', config as never)
    );

    expect(persisted).toEqual({ ...config, sanitized: true });
    expect(mockState.logClientError).toHaveBeenCalledWith(parseFailure);
  });

  it('builds sorted path snapshots with persisted runtime state and run count', () => {
    const args = createArgs();
    const core = createCore();
    mockState.buildPersistedRuntimeState.mockReturnValue({ persistedRuntime: true, nodeCount: 2 });
    mockState.stripNodeConfig.mockImplementation((nodes: Array<Record<string, unknown>>) =>
      nodes.map(({ config, ...node }) => node)
    );

    const { result } = renderHook(() => usePathPersistence(args, core));

    const snapshot = result.current.buildPathSnapshot('Renamed Path');
    const parsed = JSON.parse(snapshot) as Record<string, unknown>;

    expect(parsed).toMatchObject({
      activePathId: 'path-1',
      name: 'Renamed Path',
      description: 'Main path',
      trigger: 'Product Modal - Context Filter',
      executionMode: 'server',
      flowIntensity: 'medium',
      runMode: 'manual',
      strictFlowMode: true,
      blockedRunPolicy: 'fail_run',
      parserSamples: { 'node-1': { json: '{"ok":true}' } },
      updaterSamples: { 'node-2': { json: '{"ok":false}' } },
      runtimeState: { persistedRuntime: true, nodeCount: 2 },
      lastRunAt: '2026-03-19T10:00:00.000Z',
      runCount: 4,
    });
    expect(parsed.uiState).toEqual({ selectedNodeId: 'node-1' });
    expect(parsed.nodes).toEqual([
      { id: 'node-1', title: 'Node 1' },
      { id: 'node-2', title: 'Node 2' },
    ]);
    expect(parsed.edges).toEqual([
      { id: 'edge-a', source: 'node-1', target: 'node-2' },
      { id: 'edge-b', source: 'node-2', target: 'node-1' },
    ]);
  });

  it('blocks saving when path-save guard returns a message', async () => {
    const args = createArgs();
    const core = createCore();
    mockState.resolvePathSaveBlockedMessage.mockReturnValue('Path is locked');

    const { result } = renderHook(() => usePathPersistence(args, core));

    const saved = await act(async () => await result.current.persistPathConfig());

    expect(saved).toBe(false);
    expect(args.toast).toHaveBeenCalledWith('Path is locked', { variant: 'info' });
    expect(mockState.updateAiPathsSettingsBulk).not.toHaveBeenCalled();
  });

  it('persists a valid path config, emits warnings, and updates graph/runtime state', async () => {
    const args = createArgs({
      toast: vi.fn(),
    });
    const core = createCore();
    mockState.lintPathNodeRoles.mockReturnValue({
      errors: [],
      warnings: ['Role warning'],
      duplicateRoleTypes: [],
    });
    mockState.pruneSingleCardinalityIncomingEdges.mockReturnValue({
      edges: [{ id: 'edge-a', source: 'node-1', target: 'node-2' }],
      removedEdges: [{ id: 'edge-b', source: 'node-2', target: 'node-1' }],
    });
    mockState.compileGraph.mockReturnValue({
      errors: 1,
      warnings: 1,
      findings: [{ severity: 'error', message: 'Compile issue' }],
    });

    const { result } = renderHook(() => usePathPersistence(args, core));

    const saved = await act(async () => await result.current.persistPathConfig());

    expect(saved).toBe(true);
    expect(mockState.graphActions.setPathConfigs).toHaveBeenCalledWith({
      'path-1': expect.objectContaining({
        id: 'path-1',
        version: 9,
        name: 'Primary Path',
        updatedAt: '2026-03-19T15:00:00.000Z',
        sanitized: true,
      }),
    });
    expect(mockState.graphActions.setNodes).toHaveBeenCalledWith(args.nodes);
    expect(mockState.graphActions.setEdges).toHaveBeenNthCalledWith(1, [
      { id: 'edge-a', source: 'node-1', target: 'node-2' },
    ]);
    expect(mockState.graphActions.setEdges).toHaveBeenLastCalledWith([
      { id: 'edge-a', source: 'node-1', target: 'node-2' },
    ]);
    expect(mockState.selectionActions.selectNode).toHaveBeenCalledWith('node-1');
    expect(mockState.graphActions.setPaths).toHaveBeenCalledWith([
      {
        id: 'path-1',
        name: 'Primary Path',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-19T15:00:00.000Z',
      },
    ]);
    expect(mockState.runtimeActions.setLastError).toHaveBeenCalledWith(null);
    expect(core.persistLastError).toHaveBeenCalledWith(null);
    expect(args.toast).toHaveBeenNthCalledWith(1, 'Role warning', { variant: 'info' });
    expect(args.toast).toHaveBeenNthCalledWith(
      2,
      'Auto-repaired 1 duplicate wire on single-cardinality inputs.',
      { variant: 'warning' }
    );
    expect(args.toast).toHaveBeenNthCalledWith(3, 'Compile issue', { variant: 'warning' });
    expect(args.toast).toHaveBeenNthCalledWith(4, 'Compile warning summary', {
      variant: 'warning',
    });
    expect(args.toast).toHaveBeenNthCalledWith(5, 'AI Paths saved.', { variant: 'success' });
    expect(result.current.lastSavedSnapshotRef.current).toContain('"activePathId":"path-1"');
  });

  it('repairs legacy node identities before sanitizing and persisting', async () => {
    const args = createArgs({
      selectedNodeId: 'legacy-node-1',
      nodes: [
        { id: 'legacy-node-1', title: 'Node 1', type: 'viewer', position: { x: 0, y: 0 } },
        { id: 'legacy-node-2', title: 'Node 2', type: 'viewer', position: { x: 1, y: 1 } },
      ],
      parserSamples: { 'legacy-node-1': { json: '{"ok":true}' } },
      updaterSamples: { 'legacy-node-2': { json: '{"ok":false}' } },
      runtimeState: {
        status: 'idle',
        inputs: { 'legacy-node-1': { value: 1 } },
        outputs: { 'legacy-node-2': { value: 2 } },
      },
    });
    const core = createCore();
    const repairedConfig = {
      id: 'path-1',
      version: 9,
      name: 'Primary Path',
      description: 'Main path',
      trigger: 'Product Modal - Context Filter',
      executionMode: 'server',
      flowIntensity: 'medium',
      runMode: 'manual',
      strictFlowMode: true,
      blockedRunPolicy: 'fail_run',
      aiPathsValidation: { enabled: true },
      nodes: [
        {
          id: 'node-111111111111111111111111',
          instanceId: 'node-111111111111111111111111',
          nodeTypeId: 'nt-111111111111111111111111',
          title: 'Node 1',
          type: 'viewer',
          position: { x: 0, y: 0 },
        },
        {
          id: 'node-222222222222222222222222',
          instanceId: 'node-222222222222222222222222',
          nodeTypeId: 'nt-222222222222222222222222',
          title: 'Node 2',
          type: 'viewer',
          position: { x: 1, y: 1 },
        },
      ],
      edges: [
        {
          id: 'edge-a',
          source: 'node-111111111111111111111111',
          target: 'node-222222222222222222222222',
        },
        {
          id: 'edge-b',
          source: 'node-222222222222222222222222',
          target: 'node-111111111111111111111111',
        },
      ],
      updatedAt: '2026-03-19T15:00:00.000Z',
      isLocked: false,
      isActive: true,
      parserSamples: {
        'node-111111111111111111111111': { json: '{"ok":true}' },
      },
      updaterSamples: {
        'node-222222222222222222222222': { json: '{"ok":false}' },
      },
      runtimeState: {
        status: 'idle',
        inputs: { 'node-111111111111111111111111': { value: 1 } },
        outputs: { 'node-222222222222222222222222': { value: 2 } },
      },
      lastRunAt: '2026-03-19T10:00:00.000Z',
      runCount: 4,
      uiState: {
        selectedNodeId: 'node-111111111111111111111111',
      },
    };
    mockState.repairPathNodeIdentities.mockImplementation((config: Record<string, unknown>) => ({
      config: {
        ...config,
        ...repairedConfig,
      },
      changed: true,
      warnings: [],
    }));

    const { result } = renderHook(() => usePathPersistence(args, core));

    const saved = await act(async () => await result.current.persistPathConfig());

    expect(saved).toBe(true);
    expect(mockState.sanitizePathConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        nodes: repairedConfig.nodes,
        parserSamples: repairedConfig.parserSamples,
        updaterSamples: repairedConfig.updaterSamples,
        uiState: repairedConfig.uiState,
      })
    );
    expect(mockState.updateAiPathsSettingsBulk).toHaveBeenCalledWith([
      expect.objectContaining({ key: 'path-index' }),
      expect.objectContaining({
        key: 'path-config:path-1',
        value: expect.stringContaining('node-111111111111111111111111'),
      }),
    ]);
    expect(mockState.graphActions.setNodes).toHaveBeenCalledWith(repairedConfig.nodes);
    expect(mockState.runtimeActions.setParserSamples).toHaveBeenCalledWith(
      repairedConfig.parserSamples
    );
    expect(mockState.runtimeActions.setUpdaterSamples).toHaveBeenCalledWith(
      repairedConfig.updaterSamples
    );
    expect(mockState.runtimeActions.setRuntimeState).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'idle',
        inputs: repairedConfig.runtimeState.inputs,
        outputs: repairedConfig.runtimeState.outputs,
      })
    );
    expect(mockState.runtimeActions.setLastRunAt).toHaveBeenCalledWith(
      repairedConfig.lastRunAt
    );
    expect(mockState.selectionActions.selectNode).toHaveBeenCalledWith(
      'node-111111111111111111111111'
    );
  });
});
