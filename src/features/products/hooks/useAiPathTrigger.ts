'use client';

import { useQueryClient } from '@tanstack/react-query';

import { appendLocalRun, runsApi } from '@/features/ai/ai-paths/lib';
import {
  AI_PATHS_UI_STATE_KEY,
  PATH_DEBUG_PREFIX,
  TRIGGER_EVENTS,
} from '@/features/ai/ai-paths/lib/core/constants';
import {
  evaluateGraphWithIteratorAutoContinue,
} from '@/features/ai/ai-paths/lib/core/runtime/engine';
import {
  sanitizeEdges,
} from '@/features/ai/ai-paths/lib/core/utils/graph';
import {
  invalidateAiPathsSettingsCache,
  updateAiPathsSetting,
} from '@/features/ai/ai-paths/lib/settings-store-client';
import { logClientError } from '@/features/observability/utils/client-error-logger';
import { api } from '@/shared/lib/api-client';
import type {
  AiNode,
  PathConfig,
  PathDebugSnapshot,
  PathDebugEntry,
  Edge,
  RuntimeState,
} from '@/shared/contracts/ai-paths';
import { useToast } from '@/shared/ui';

import {
  getProductDetailQueryKey,
  invalidateProductsCountsAndDetail,
} from './productCache';
import { fetchPathSettings, findTriggerPath } from './useAiPathSettings';

const AI_PATHS_ENTITY_STALE_MS = 10_000;

const normalizeNodes = (nodes: AiNode[]): AiNode[] => {
  return nodes.map((node: AiNode) => ({
    ...node,
    id: node.id || `node-${Math.random().toString(36).substr(2, 9)}`,
    title: node.title || node.type || 'Untitled Node',
  }));
};

const safeJsonStringify = (value: unknown): string => {
  const seen = new WeakSet();
  const replacer = (_key: string, val: unknown): unknown => {
    if (typeof val === 'bigint') return val.toString();
    if (val instanceof Date) return val.toISOString();
    if (val instanceof Set) return Array.from(val.values());
    if (val instanceof Map) return Object.fromEntries(val.entries());
    if (typeof val === 'function' || typeof val === 'symbol') return undefined;
    if (val && typeof val === 'object') {
      if (seen.has(val)) return undefined;
      seen.add(val);
    }
    return val;
  };
  try {
    return JSON.stringify(value, replacer);
  } catch {
    return '';
  }
};

function buildTriggerContext(
  triggerNode: AiNode,
  triggerEvent: string,
  event?: React.MouseEvent<HTMLButtonElement>,
  product?: { id: string } | null,
  pathInfo?: { id?: string; name?: string }
): Record<string, unknown> {
  const timestamp = new Date().toISOString();
  const nativeEvent = event?.nativeEvent;
  const pointer = nativeEvent
    ? {
      clientX: nativeEvent.clientX,
      clientY: nativeEvent.clientY,
      pageX: nativeEvent.pageX,
      pageY: nativeEvent.pageY,
      screenX: nativeEvent.screenX,
      screenY: nativeEvent.screenY,
      offsetX: 'offsetX' in nativeEvent ? (nativeEvent as unknown as { offsetX: number }).offsetX : undefined,
      offsetY: 'offsetY' in nativeEvent ? (nativeEvent as unknown as { offsetY: number }).offsetY : undefined,
      button: nativeEvent.button,
      buttons: nativeEvent.buttons,
      altKey: nativeEvent.altKey,
      ctrlKey: nativeEvent.ctrlKey,
      shiftKey: nativeEvent.shiftKey,
      metaKey: nativeEvent.metaKey,
    }
    : undefined;
  const location =
    typeof window !== 'undefined'
      ? {
        href: window.location.href,
        origin: window.location.origin,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        referrer: document.referrer || undefined,
      }
      : {};
  const ui =
    typeof window !== 'undefined'
      ? {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio,
        },
        screen: {
          width: window.screen?.width,
          height: window.screen?.height,
          availWidth: window.screen?.availWidth,
          availHeight: window.screen?.availHeight,
        },
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        languages: navigator.languages,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        documentTitle: document.title,
        visibilityState: document.visibilityState,
        scroll: {
          x: window.scrollX,
          y: window.scrollY,
        },
      }
      : {};
  return {
    timestamp,
    location,
    ui,
    user: null,
    event: {
      id: triggerEvent,
      nodeId: triggerNode.id,
      nodeTitle: triggerNode.title,
      type: event?.type,
      pointer,
    },
    source: {
      pathId: pathInfo?.id,
      pathName: pathInfo?.name ?? 'Product Panel',
      tab: 'product',
    },
    extras: {
      triggerLabel: 'Path Generate Description',
    },
    entityId: product?.id,
    productId: product?.id,
    entityType: 'product',
  };
}

async function persistRunResults(
  selectedConfig: PathConfig,
  nodes: AiNode[],
  runtimeState: RuntimeState,
  runAt: string,
  uiState: Record<string, unknown> | null,
): Promise<void> {
  const debugEntries: PathDebugEntry[] = nodes
    .filter((node: AiNode) => node.type === 'database')
    .map((node: AiNode): PathDebugEntry | null => {
      const output = runtimeState.outputs?.[node.id] as
        | { debugPayload?: unknown }
        | undefined;
      const debugPayload = output?.debugPayload;
      if (debugPayload === undefined || debugPayload === null) return null;
      return {
        nodeId: node.id,
        title: node.title,
        debug: debugPayload,
      };
    })
    .filter((entry: PathDebugEntry | null): entry is PathDebugEntry => Boolean(entry));

  const debugSnapshot: PathDebugSnapshot | null = debugEntries.length
    ? {
      pathId: selectedConfig.id,
      runAt,
      entries: debugEntries,
    }
    : null;

  const debugValue = debugSnapshot ? safeJsonStringify(debugSnapshot) : '';
  const nextUiState = {
    ...(uiState && typeof uiState === 'object' ? uiState : {}),
    lastTriggeredAt: runAt,
  };

  if (debugValue) {
    await updateAiPathsSetting(`${PATH_DEBUG_PREFIX}${selectedConfig.id}`, debugValue);
  }
  await updateAiPathsSetting(AI_PATHS_UI_STATE_KEY, JSON.stringify(nextUiState));
  invalidateAiPathsSettingsCache();
}

export function useAiPathTrigger(): {
  handlePathGenerateDescription: (
    product: { id: string } | null,
    event?: React.MouseEvent<HTMLButtonElement>
  ) => Promise<void>;
  } {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handlePathGenerateDescription = async (
    product: { id: string } | null,
    event?: React.MouseEvent<HTMLButtonElement>
  ): Promise<void> => {
    if (!product?.id) {
      toast('Save the product before running a path trigger.', {
        variant: 'error',
      });
      return;
    }

    let localRunContext: {
      pathId?: string | null;
      pathName?: string | null;
      triggerEvent?: string | null;
      triggerLabel?: string | null;
      entityType?: string | null;
      entityId?: string | null;
      nodeCount?: number | null;
    } | null = null;
    let startedAt: string | null = null;
    let startedAtMs: number | null = null;

    try {
      const { orderedConfigs, uiState, preferredActivePathId } =
        await fetchPathSettings(queryClient);

      const triggerEvent = (TRIGGER_EVENTS[0]?.id as string) ?? 'path_generate_description';
      const selectedConfig = findTriggerPath(
        orderedConfigs,
        uiState,
        preferredActivePathId,
        triggerEvent
      );

      if (!selectedConfig) {
        toast(
          'No AI Path found. Configure a path with the Path Generate Description trigger.',
          { variant: 'error' }
        );
        return;
      }

      toast(`Running AI Path: ${selectedConfig.name}`, { variant: 'success' });

      const nodes: AiNode[] = normalizeNodes(
        Array.isArray(selectedConfig.nodes) ? selectedConfig.nodes : []
      );
      const edges: Edge[] = sanitizeEdges(
        nodes,
        Array.isArray(selectedConfig.edges) ? selectedConfig.edges : []
      );

      const triggerNodes: AiNode[] = nodes.filter(
        (node: AiNode) =>
          node.type === 'trigger' &&
          (node.config?.trigger?.event ?? triggerEvent) === triggerEvent
      );
      const triggerNode: AiNode | undefined =
        triggerNodes.find((node: AiNode) => edges.some((edge: Edge) => edge.from === node.id)) ??
        triggerNodes.find((node: AiNode) =>
          edges.some((edge: Edge) => edge.from === node.id || edge.to === node.id)
        ) ??
        triggerNodes[0] ??
        nodes.find((node: AiNode) => node.type === 'trigger');

      if (!triggerNode) {
        toast('No trigger node found in the selected path.', { variant: 'error' });
        return;
      }

      const triggerContext = buildTriggerContext(triggerNode, triggerEvent, event, product, {
        id: selectedConfig.id,
        name: selectedConfig.name,
      });

      const executionMode = selectedConfig.executionMode === 'local' ? 'local' : 'server';

      if (executionMode === 'server') {
        const enqueueResult = await runsApi.enqueue({
          pathId: selectedConfig.id ?? 'path',
          pathName: selectedConfig.name ?? undefined,
          nodes,
          edges,
          triggerEvent,
          triggerNodeId: triggerNode.id,
          triggerContext,
          entityId: product.id,
          entityType: 'product',
          meta: {
            source: 'product_panel',
            triggerLabel: 'Path Generate Description',
            strictFlowMode: selectedConfig.strictFlowMode !== false,
          },
        });
        if (!enqueueResult.ok) {
          toast(enqueueResult.error || 'Failed to enqueue AI Path run.', {
            variant: 'error',
          });
          return;
        }
        toast('AI Path run queued.', { variant: 'success' });
        return;
      }

      // Local execution
      startedAt = new Date().toISOString();
      startedAtMs = Date.now();
      localRunContext = {
        pathId: selectedConfig.id ?? null,
        pathName: selectedConfig.name ?? null,
        triggerEvent,
        triggerLabel: 'Path Generate Description',
        entityType: 'product',
        entityId: product.id,
        nodeCount: nodes.length,
      };

      const runtimeState: RuntimeState = await evaluateGraphWithIteratorAutoContinue({
        nodes,
        edges,
        activePathId: selectedConfig.id ?? 'path',
        activePathName: selectedConfig.name ?? undefined,
        triggerNodeId: triggerNode.id,
        triggerEvent,
        triggerContext,
        strictFlowMode: selectedConfig.strictFlowMode !== false,
        deferPoll: false,
        fetchEntityByType: async (entityType: string, entityId: string): Promise<Record<string, unknown> | null> => {
          if (entityType !== 'product') return null;
          return await queryClient.fetchQuery({
            queryKey: getProductDetailQueryKey(entityId),
            queryFn: async (): Promise<Record<string, unknown> | null> => {
              try {
                return await api.get<Record<string, unknown>>(
                  `/api/products/${encodeURIComponent(entityId)}`,
                  { logError: false }
                );
              } catch {
                return null;
              }
            },
            staleTime: AI_PATHS_ENTITY_STALE_MS,
          });
        },
        reportAiPathsError: (error: unknown, meta?: Record<string, unknown>, summary?: string): void => {
          logClientError(error, {
            context: {
              source: 'useAiPathTrigger',
              action: 'reportAiPathsError',
              summary: summary ?? 'AI Paths trigger failed',
              ...meta
            }
          });
        },
        toast,
      });

      const runAt = new Date().toISOString();

      if (localRunContext && startedAt && startedAtMs !== null) {
        void appendLocalRun({
          pathId: localRunContext.pathId ?? null,
          pathName: localRunContext.pathName ?? null,
          triggerEvent: localRunContext.triggerEvent ?? null,
          triggerLabel: localRunContext.triggerLabel ?? null,
          entityType: localRunContext.entityType ?? null,
          entityId: localRunContext.entityId ?? null,
          status: 'success',
          startedAt,
          finishedAt: runAt,
          durationMs: Date.now() - startedAtMs,
          nodeCount: localRunContext.nodeCount ?? null,
          source: 'product_panel',
        });
      }

      await invalidateProductsCountsAndDetail(queryClient, product.id);

      try {
        await persistRunResults(
          selectedConfig,
          nodes,
          runtimeState,
          runAt,
          uiState,
        );
      } catch (error) {
        logClientError(error, { context: { source: 'useAiPathTrigger', action: 'persistRuntimeState', pathId: selectedConfig.id } });
      }
    } catch (error) {
      if (localRunContext && startedAt && startedAtMs !== null) {
        void appendLocalRun({
          pathId: localRunContext.pathId ?? null,
          pathName: localRunContext.pathName ?? null,
          triggerEvent: localRunContext.triggerEvent ?? null,
          triggerLabel: localRunContext.triggerLabel ?? null,
          entityType: localRunContext.entityType ?? null,
          entityId: localRunContext.entityId ?? null,
          status: 'error',
          startedAt,
          finishedAt: new Date().toISOString(),
          durationMs: Date.now() - startedAtMs,
          nodeCount: localRunContext.nodeCount ?? null,
          error: error instanceof Error ? error.message : 'Local run failed',
          source: 'product_panel',
        });
      }
      logClientError(error, { context: { source: 'useAiPathTrigger', action: 'runPathTrigger', productId: product.id } });
      toast('Failed to run AI Path trigger.', { variant: 'error' });
    }
  };

  return { handlePathGenerateDescription };
}
