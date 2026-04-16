import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  loadTriggerSettingsDataMock,
  resolveTriggerSelectionMock,
  enqueueAiPathRunMock,
  listAiPathRunsMock,
  mergeEnqueuedAiPathRunForCacheMock,
  resolveAiPathRunFromEnqueueResponseDataMock,
  evaluateRunPreflightMock,
  logClientCatchMock,
  pageContextRegistryMock,
  toastMock,
} = vi.hoisted(() => ({
  loadTriggerSettingsDataMock: vi.fn(),
  resolveTriggerSelectionMock: vi.fn(),
  enqueueAiPathRunMock: vi.fn(),
  listAiPathRunsMock: vi.fn(),
  mergeEnqueuedAiPathRunForCacheMock: vi.fn(),
  resolveAiPathRunFromEnqueueResponseDataMock: vi.fn(),
  evaluateRunPreflightMock: vi.fn(),
  logClientCatchMock: vi.fn(),
  pageContextRegistryMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/hooks/trigger-event-settings', async () => {
  const actual = await vi.importActual<
    typeof import('@/shared/lib/ai-paths/hooks/trigger-event-settings')
  >('@/shared/lib/ai-paths/hooks/trigger-event-settings');
  return {
    ...actual,
    loadTriggerSettingsData: (...args: unknown[]) => loadTriggerSettingsDataMock(...args),
  };
});

vi.mock('@/shared/lib/ai-paths/hooks/trigger-event-selection', async () => {
  const actual = await vi.importActual<
    typeof import('@/shared/lib/ai-paths/hooks/trigger-event-selection')
  >('@/shared/lib/ai-paths/hooks/trigger-event-selection');
  return {
    ...actual,
    resolveTriggerSelection: (...args: unknown[]) => resolveTriggerSelectionMock(...args),
  };
});

vi.mock('@/shared/lib/ai-paths/core/utils/run-preflight', async () => {
  const actual = await vi.importActual<
    typeof import('@/shared/lib/ai-paths/core/utils/run-preflight')
  >('@/shared/lib/ai-paths/core/utils/run-preflight');
  return {
    ...actual,
    evaluateRunPreflight: (...args: Parameters<typeof actual.evaluateRunPreflight>) =>
      evaluateRunPreflightMock(...args),
  };
});

vi.mock('@/shared/lib/ai-context-registry/page-context', () => ({
  useOptionalContextRegistryPageEnvelope: () => pageContextRegistryMock(),
}));

vi.mock('@/shared/lib/ai-paths/api/client', () => ({
  enqueueAiPathRun: (...args: unknown[]) => enqueueAiPathRunMock(...args),
  listAiPathRuns: (...args: unknown[]) => listAiPathRunsMock(...args),
  mergeEnqueuedAiPathRunForCache: (...args: unknown[]) => mergeEnqueuedAiPathRunForCacheMock(...args),
  resolveAiPathRunFromEnqueueResponseData: (...args: unknown[]) =>
    resolveAiPathRunFromEnqueueResponseDataMock(...args),
}));

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateAiPathQueue: vi.fn(),
  invalidateAiPathSettings: vi.fn(),
  invalidateIntegrationJobs: vi.fn(),
  invalidateNotes: vi.fn(),
  invalidateProductDetail: vi.fn(),
  notifyAiPathRunEnqueued: vi.fn(),
  optimisticallyInsertAiPathRunInQueueCache: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/settings-store-client', () => ({
  invalidateAiPathsSettingsCache: vi.fn(),
  updateAiPathsSetting: vi.fn(),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: vi.fn(),
  logClientCatch: (...args: unknown[]) => logClientCatchMock(...args),
}));

import { useAiPathTriggerEvent } from '@/shared/lib/ai-paths/hooks/useAiPathTriggerEvent';
import {
  getStarterWorkflowTemplateById,
  materializeStarterWorkflowPathConfig,
} from '@/shared/lib/ai-paths/core/starter-workflows';

const createWrapper = (): ((props: PropsWithChildren) => ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: PropsWithChildren): ReactElement {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

const baseArgs = {
  triggerEventId: 'button-product-row',
  triggerLabel: 'Trigger',
  entityType: 'product' as const,
  entityId: 'product-1',
};

describe('useAiPathTriggerEvent branching shared-lib coverage', () => {
  beforeEach(() => {
    loadTriggerSettingsDataMock.mockReset();
    resolveTriggerSelectionMock.mockReset();
    enqueueAiPathRunMock.mockReset();
    listAiPathRunsMock.mockReset();
    mergeEnqueuedAiPathRunForCacheMock.mockReset();
    resolveAiPathRunFromEnqueueResponseDataMock.mockReset();
    evaluateRunPreflightMock.mockReset();
    logClientCatchMock.mockReset();
    pageContextRegistryMock.mockReset();
    toastMock.mockReset();
    loadTriggerSettingsDataMock.mockResolvedValue({
      settingsData: [],
      mode: 'full',
    });
    pageContextRegistryMock.mockReturnValue(null);
    listAiPathRunsMock.mockResolvedValue({ ok: false, error: 'not-used' });
    resolveAiPathRunFromEnqueueResponseDataMock.mockReturnValue({
      runId: 'run-1',
      runRecord: null,
    });
    mergeEnqueuedAiPathRunForCacheMock.mockImplementation(
      (args: { fallbackRun: Record<string, unknown>; runRecord?: Record<string, unknown> | null }) =>
        args.runRecord ? { ...args.fallbackRun, ...args.runRecord } : args.fallbackRun
    );
    evaluateRunPreflightMock.mockReturnValue({
      nodeValidationEnabled: true,
      shouldBlock: false,
      blockReason: null,
      blockMessage: null,
      validationReport: {
        enabled: true,
        blocked: false,
        shouldWarn: false,
        findings: [],
        score: 100,
        failedRules: 0,
        blockThreshold: 0,
      },
      compileReport: {
        ok: true,
        errors: 0,
        warnings: 0,
        findings: [],
      },
      dependencyReport: {
        errors: 0,
        warnings: 0,
        findings: [],
      },
      dataContractReport: {
        errors: 0,
        warnings: 0,
        issues: [],
      },
      warnings: [],
    });
  });

  it('surfaces timeout-specific settings preload failures', async () => {
    loadTriggerSettingsDataMock.mockRejectedValue(new Error('Settings preload timed out'));
    const onProgress = vi.fn();

    const { result } = renderHook(() => useAiPathTriggerEvent(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.fireAiPathTriggerEvent({
        ...baseArgs,
        onProgress,
      });
    });

    expect(toastMock).toHaveBeenNthCalledWith(2, expect.stringContaining('settings_preload_timeout'), {
      variant: 'error',
    });
    expect(onProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: 'error',
        error: 'settings_preload_timeout',
      })
    );
  });

  it('reports trigger settings selection failures', async () => {
    resolveTriggerSelectionMock.mockRejectedValue(new Error('Selection exploded'));
    const onProgress = vi.fn();

    const { result } = renderHook(() => useAiPathTriggerEvent(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.fireAiPathTriggerEvent({
        ...baseArgs,
        onProgress,
      });
    });

    expect(toastMock).toHaveBeenNthCalledWith(2, 'Selection exploded', {
      variant: 'error',
    });
    expect(onProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: 'error',
        error: 'trigger_settings_invalid',
        message: 'Selection exploded',
      })
    );
  });

  it('warns when no path is configured for the trigger', async () => {
    resolveTriggerSelectionMock.mockResolvedValue({
      triggerCandidates: [],
      activeTriggerCandidates: [],
      selectedConfig: null,
      uiState: null,
      missingPreferredPathId: null,
    });
    const onProgress = vi.fn();
    const onError = vi.fn();
    const onFinished = vi.fn();

    const { result } = renderHook(() => useAiPathTriggerEvent(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.fireAiPathTriggerEvent({
        ...baseArgs,
        onProgress,
        onError,
        onFinished,
      });
    });

    expect(toastMock).toHaveBeenNthCalledWith(2, 'No AI Path configured for trigger: button-product-row', {
      variant: 'warning',
    });
    expect(onProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: 'error',
        error: 'no_path_configured',
      })
    );
    expect(onError).toHaveBeenCalledWith('No AI Path configured for trigger: button-product-row');
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('warns when all paths for the trigger are disabled', async () => {
    resolveTriggerSelectionMock.mockResolvedValue({
      triggerCandidates: [{ id: 'path-a' }],
      activeTriggerCandidates: [],
      selectedConfig: null,
      uiState: null,
      missingPreferredPathId: null,
    });
    const onProgress = vi.fn();

    const { result } = renderHook(() => useAiPathTriggerEvent(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.fireAiPathTriggerEvent({
        ...baseArgs,
        onProgress,
      });
    });

    expect(toastMock).toHaveBeenNthCalledWith(2, 'All AI Paths for this trigger are disabled.', {
      variant: 'warning',
    });
    expect(onProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: 'error',
        error: 'path_disabled',
      })
    );
  });

  it('warns when multiple active paths remain without a preferred path id', async () => {
    resolveTriggerSelectionMock.mockResolvedValue({
      triggerCandidates: [{ id: 'path-a' }, { id: 'path-b' }],
      activeTriggerCandidates: [{ id: 'path-a' }, { id: 'path-b' }],
      selectedConfig: null,
      uiState: null,
      missingPreferredPathId: null,
    });
    const onProgress = vi.fn();

    const { result } = renderHook(() => useAiPathTriggerEvent(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.fireAiPathTriggerEvent({
        ...baseArgs,
        onProgress,
      });
    });

    expect(toastMock).toHaveBeenNthCalledWith(
      2,
      'Multiple active paths for trigger. Please specify preferredPathId.',
      {
        variant: 'warning',
      }
    );
    expect(onProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: 'error',
        error: 'ambiguous_path_selection',
      })
    );
  });

  it('forwards page context registry data when enqueueing a trigger run', async () => {
    const starter = getStarterWorkflowTemplateById('starter_parameter_inference');
    if (!starter) throw new Error('Missing starter_parameter_inference template');

    const selectedConfig = materializeStarterWorkflowPathConfig(starter, {
      pathId: 'path_context_registry_forwarding',
      seededDefault: false,
    });
    selectedConfig.nodes = selectedConfig.nodes.map((node) =>
      node.type === 'trigger'
        ? {
            ...node,
            config: {
              ...node.config,
              trigger: {
                ...node.config?.trigger,
                event: baseArgs.triggerEventId,
              },
            },
          }
        : node
    );

    const contextRegistry = {
      refs: [],
      engineVersion: 'registry:test',
      resolved: {
        refs: [],
        nodes: [],
        documents: [
          {
            id: 'runtime:product-editor:leaf-categories:test',
            kind: 'runtime_document' as const,
            entityType: 'product_editor_leaf_categories',
            title: 'Product leaf categories',
            summary: 'Leaf categories',
            status: null,
            tags: ['products'],
            relatedNodeIds: [],
            sections: [
              {
                kind: 'text' as const,
                title: 'Leaf category options',
                text: '[{\"id\":\"cat-1\",\"name\":\"Pins\"}]',
              },
            ],
            provenance: { source: 'test' },
          },
        ],
        truncated: false,
        engineVersion: 'registry:test',
      },
    };

    resolveTriggerSelectionMock.mockResolvedValue({
      triggerCandidates: [selectedConfig],
      activeTriggerCandidates: [selectedConfig],
      selectedConfig,
      uiState: null,
      missingPreferredPathId: null,
    });
    pageContextRegistryMock.mockReturnValue(contextRegistry);
    enqueueAiPathRunMock.mockResolvedValue({
      ok: true,
      data: {
        runId: 'run-1',
      },
    });

    const { result } = renderHook(() => useAiPathTriggerEvent(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.fireAiPathTriggerEvent(baseArgs);
    });

    expect(enqueueAiPathRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pathId: 'path_context_registry_forwarding',
        contextRegistry,
      }),
      { timeoutMs: 90_000 }
    );
  });

  it('fires onFinished after a successful enqueue', async () => {
    const starter = getStarterWorkflowTemplateById('starter_parameter_inference');
    if (!starter) throw new Error('Missing starter_parameter_inference template');

    const selectedConfig = materializeStarterWorkflowPathConfig(starter, {
      pathId: 'path_success_finished_callback',
      seededDefault: false,
    });
    selectedConfig.nodes = selectedConfig.nodes.map((node) =>
      node.type === 'trigger'
        ? {
            ...node,
            config: {
              ...node.config,
              trigger: {
                ...node.config?.trigger,
                event: baseArgs.triggerEventId,
              },
            },
          }
        : node
    );

    resolveTriggerSelectionMock.mockResolvedValue({
      triggerCandidates: [selectedConfig],
      activeTriggerCandidates: [selectedConfig],
      selectedConfig,
      uiState: null,
      missingPreferredPathId: null,
    });
    enqueueAiPathRunMock.mockResolvedValue({
      ok: true,
      data: {
        runId: 'run-success-finished',
      },
    });
    resolveAiPathRunFromEnqueueResponseDataMock.mockReturnValue({
      runId: 'run-success-finished',
      runRecord: null,
    });
    const onSuccess = vi.fn();
    const onFinished = vi.fn();

    const { result } = renderHook(() => useAiPathTriggerEvent(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.fireAiPathTriggerEvent({
        ...baseArgs,
        onSuccess,
        onFinished,
      });
    });

    expect(onSuccess).toHaveBeenCalledWith('run-success-finished');
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('forwards the selected graph when enqueuing a trigger run', async () => {
    const starter = getStarterWorkflowTemplateById('starter_parameter_inference');
    if (!starter) throw new Error('Missing starter_parameter_inference template');

    const selectedConfig = materializeStarterWorkflowPathConfig(starter, {
      pathId: 'path_forward_selected_graph',
      seededDefault: false,
    });
    selectedConfig.nodes = selectedConfig.nodes.map((node) =>
      node.type === 'trigger'
        ? {
            ...node,
            config: {
              ...node.config,
              trigger: {
                ...node.config?.trigger,
                event: baseArgs.triggerEventId,
              },
            },
          }
        : node
    );

    resolveTriggerSelectionMock.mockResolvedValue({
      triggerCandidates: [selectedConfig],
      activeTriggerCandidates: [selectedConfig],
      selectedConfig,
      uiState: null,
      missingPreferredPathId: null,
    });
    enqueueAiPathRunMock.mockResolvedValue({
      ok: true,
      data: {
        runId: 'run-forward-selected-graph',
      },
    });
    resolveAiPathRunFromEnqueueResponseDataMock.mockReturnValue({
      runId: 'run-forward-selected-graph',
      runRecord: null,
    });

    const { result } = renderHook(() => useAiPathTriggerEvent(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.fireAiPathTriggerEvent(baseArgs);
    });

    expect(enqueueAiPathRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pathId: selectedConfig.id,
        nodes: selectedConfig.nodes,
        edges: selectedConfig.edges,
      }),
      { timeoutMs: 90_000 }
    );
  });

  it('warns product trigger surfaces when the saved path still relies on the AI Brain default model', async () => {
    const starter = getStarterWorkflowTemplateById('starter_product_name_normalize');
    if (!starter) throw new Error('Missing starter_product_name_normalize template');

    const selectedConfig = materializeStarterWorkflowPathConfig(starter, {
      pathId: 'path_name_normalize_v1',
      seededDefault: false,
    });
    selectedConfig.nodes = selectedConfig.nodes.map((node) =>
      node.type === 'trigger'
        ? {
            ...node,
            config: {
              ...node.config,
              trigger: {
                ...node.config?.trigger,
                event: baseArgs.triggerEventId,
              },
            },
          }
        : node
    );

    resolveTriggerSelectionMock.mockResolvedValue({
      triggerCandidates: [selectedConfig],
      activeTriggerCandidates: [selectedConfig],
      selectedConfig,
      uiState: null,
      missingPreferredPathId: null,
    });
    enqueueAiPathRunMock.mockResolvedValue({
      ok: true,
      data: {
        runId: 'run-1',
      },
    });

    const { result } = renderHook(() => useAiPathTriggerEvent(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.fireAiPathTriggerEvent({
        ...baseArgs,
        source: {
          location: 'product_modal',
          tab: 'product',
        },
      });
    });

    expect(toastMock).toHaveBeenCalledWith(
      expect.stringContaining('still relies on AI Brain default'),
      {
        variant: 'info',
      }
    );
    expect(enqueueAiPathRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pathId: 'path_name_normalize_v1',
      }),
      { timeoutMs: 90_000 }
    );
  });

  it('reuses cached preflight results for repeated runs on the same selected path version', async () => {
    const starter = getStarterWorkflowTemplateById('starter_parameter_inference');
    if (!starter) throw new Error('Missing starter_parameter_inference template');

    const selectedConfig = materializeStarterWorkflowPathConfig(starter, {
      pathId: 'path_cached_preflight',
      seededDefault: false,
    });
    selectedConfig.updatedAt = '2026-04-11T20:30:00.000Z';
    selectedConfig.nodes = selectedConfig.nodes.map((node) =>
      node.type === 'trigger'
        ? {
            ...node,
            config: {
              ...node.config,
              trigger: {
                ...node.config?.trigger,
                event: baseArgs.triggerEventId,
              },
            },
          }
        : node
    );

    resolveTriggerSelectionMock.mockResolvedValue({
      triggerCandidates: [selectedConfig],
      activeTriggerCandidates: [selectedConfig],
      selectedConfig,
      uiState: null,
      missingPreferredPathId: null,
    });
    enqueueAiPathRunMock
      .mockResolvedValueOnce({ ok: true, data: { runId: 'run-1' } })
      .mockResolvedValueOnce({ ok: true, data: { runId: 'run-2' } });
    resolveAiPathRunFromEnqueueResponseDataMock
      .mockReturnValueOnce({ runId: 'run-1', runRecord: null })
      .mockReturnValueOnce({ runId: 'run-2', runRecord: null });

    const { result } = renderHook(() => useAiPathTriggerEvent(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.fireAiPathTriggerEvent(baseArgs);
    });

    await act(async () => {
      await result.current.fireAiPathTriggerEvent(baseArgs);
    });

    expect(evaluateRunPreflightMock).toHaveBeenCalledTimes(1);
    expect(enqueueAiPathRunMock).toHaveBeenCalledTimes(2);
  });

  it('skips getEntityJson when the trigger workflow disables entity snapshot embedding', async () => {
    const starter = getStarterWorkflowTemplateById('starter_product_name_normalize');
    if (!starter) throw new Error('Missing starter_product_name_normalize template');

    const selectedConfig = materializeStarterWorkflowPathConfig(starter, {
      pathId: 'path_name_normalize_v1',
      seededDefault: false,
    });
    selectedConfig.nodes = selectedConfig.nodes.map((node) =>
      node.type === 'trigger'
        ? {
            ...node,
            config: {
              ...node.config,
              trigger: {
                ...node.config?.trigger,
                event: baseArgs.triggerEventId,
                entitySnapshotMode: 'never',
              },
            },
          }
        : node
    );

    resolveTriggerSelectionMock.mockResolvedValue({
      triggerCandidates: [selectedConfig],
      activeTriggerCandidates: [selectedConfig],
      selectedConfig,
      uiState: null,
      missingPreferredPathId: null,
    });
    enqueueAiPathRunMock.mockResolvedValue({
      ok: true,
      data: {
        runId: 'run-1',
      },
    });

    const getEntityJson = vi.fn(() => ({ id: 'product-1', name_en: 'Test Product' }));
    const { result } = renderHook(() => useAiPathTriggerEvent(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.fireAiPathTriggerEvent({
        ...baseArgs,
        source: {
          location: 'product_modal',
          tab: 'product',
        },
        getEntityJson,
      });
    });

    expect(getEntityJson).not.toHaveBeenCalled();
    expect(enqueueAiPathRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerContext: expect.not.objectContaining({
          entityJson: expect.anything(),
        }),
      }),
      { timeoutMs: 90_000 }
    );
  });
});
