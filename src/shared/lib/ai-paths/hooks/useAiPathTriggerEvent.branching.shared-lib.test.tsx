import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  loadTriggerSettingsDataMock,
  resolveTriggerSelectionMock,
  enqueueAiPathRunMock,
  listAiPathRunsMock,
  resolveAiPathRunFromEnqueueResponseDataMock,
  logClientCatchMock,
  pageContextRegistryMock,
  toastMock,
} = vi.hoisted(() => ({
  loadTriggerSettingsDataMock: vi.fn(),
  resolveTriggerSelectionMock: vi.fn(),
  enqueueAiPathRunMock: vi.fn(),
  listAiPathRunsMock: vi.fn(),
  resolveAiPathRunFromEnqueueResponseDataMock: vi.fn(),
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

vi.mock('@/shared/lib/ai-context-registry/page-context', () => ({
  useOptionalContextRegistryPageEnvelope: () => pageContextRegistryMock(),
}));

vi.mock('@/shared/lib/ai-paths/api/client', () => ({
  enqueueAiPathRun: (...args: unknown[]) => enqueueAiPathRunMock(...args),
  listAiPathRuns: (...args: unknown[]) => listAiPathRunsMock(...args),
  mergeEnqueuedAiPathRunForCache: vi.fn(),
  resolveAiPathRunFromEnqueueResponseData: (...args: unknown[]) =>
    resolveAiPathRunFromEnqueueResponseDataMock(...args),
}));

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateAiPathSettings: vi.fn(),
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
    resolveAiPathRunFromEnqueueResponseDataMock.mockReset();
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

    const { result } = renderHook(() => useAiPathTriggerEvent(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.fireAiPathTriggerEvent({
        ...baseArgs,
        onProgress,
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
});
