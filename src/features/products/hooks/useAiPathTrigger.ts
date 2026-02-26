'use client';

import { useQueryClient } from '@tanstack/react-query';

import { runsApi } from '@/features/ai/ai-paths/lib/api/client';
import {
  TRIGGER_EVENTS,
} from '@/features/ai/ai-paths/lib/core/constants';
import {
  sanitizeEdges,
} from '@/features/ai/ai-paths/lib/core/utils/graph';
import { logClientError } from '@/features/observability/utils/client-error-logger';
import type {
  AiNode,
  PathConfig,
  Edge,
} from '@/shared/contracts/ai-paths';
import {
  invalidateAiPathQueue,
  notifyAiPathRunEnqueued,
  optimisticallyInsertAiPathRunInQueueCache,
} from '@/shared/lib/query-invalidation';
import { useToast } from '@/shared/ui';

import { fetchPathSettings, findTriggerPath } from './useAiPathSettings';
const PRODUCT_TRIGGER_PRIMARY_EVENT_ID = 'path_generate_description';
const PRODUCT_TRIGGER_FALLBACK_EVENT_ID = (TRIGGER_EVENTS[0]?.id as string) ?? 'manual';
const PRODUCT_TRIGGER_EVENT_IDS = Array.from(
  new Set([PRODUCT_TRIGGER_PRIMARY_EVENT_ID, PRODUCT_TRIGGER_FALLBACK_EVENT_ID])
);

const normalizeNodes = (nodes: AiNode[]): AiNode[] => {
  return nodes.map((node: AiNode) => ({
    ...node,
    id: node.id || `node-${Math.random().toString(36).substr(2, 9)}`,
    title: node.title || node.type || 'Untitled Node',
  }));
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

    try {
      const { orderedConfigs, preferredActivePathId, uiState } =
        await fetchPathSettings(queryClient);

      const resolveTriggerSelection = (
        requireServerExecution: boolean
      ): { selectedConfig: PathConfig; triggerEvent: string } | null => {
        return (
          PRODUCT_TRIGGER_EVENT_IDS
            .map((eventId: string): { selectedConfig: PathConfig; triggerEvent: string } | null => {
              const selectedConfig = findTriggerPath(
                orderedConfigs,
                uiState,
                preferredActivePathId,
                eventId,
                {
                  fallbackToAnyPath: false,
                  defaultTriggerEventId: PRODUCT_TRIGGER_FALLBACK_EVENT_ID,
                  preferServerExecution: true,
                  requireServerExecution,
                }
              );
              return selectedConfig ? { selectedConfig, triggerEvent: eventId } : null;
            })
            .find(
              (
                candidate
              ): candidate is { selectedConfig: PathConfig; triggerEvent: string } =>
                candidate !== null
            ) ?? null
        );
      };

      const triggerSelection =
        resolveTriggerSelection(true) ?? resolveTriggerSelection(false);

      if (!triggerSelection) {
        toast(
          'No AI Path found. Add a Trigger node with event "path_generate_description" or "manual".',
          { variant: 'error' }
        );
        return;
      }

      const { selectedConfig, triggerEvent } = triggerSelection;
      if (triggerEvent !== PRODUCT_TRIGGER_PRIMARY_EVENT_ID) {
        toast(
          `Using fallback trigger "${triggerEvent}". Configure a Trigger node event "${PRODUCT_TRIGGER_PRIMARY_EVENT_ID}" to control Product panel routing explicitly.`,
          { variant: 'info' }
        );
      }

      toast(`Running AI Path: ${selectedConfig.name}`, { variant: 'success' });

      const nodes: AiNode[] = normalizeNodes(selectedConfig.nodes ?? []);
      const edges: Edge[] = sanitizeEdges(
        nodes,
        Array.isArray(selectedConfig.edges) ? selectedConfig.edges : []
      );

      const triggerNodes: AiNode[] = nodes.filter(
        (node: AiNode) =>
          node.type === 'trigger' &&
          (node.config?.trigger?.event ?? PRODUCT_TRIGGER_FALLBACK_EVENT_ID) === triggerEvent
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

      if (executionMode === 'local') {
        toast('This path is in Local mode. Local browser execution is unavailable here, so it will be queued on the server.', {
          variant: 'warning',
        });
      }
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
      const queuedRun =
        enqueueResult.data && typeof enqueueResult.data === 'object'
          ? (enqueueResult.data as { run?: unknown }).run
          : null;
      optimisticallyInsertAiPathRunInQueueCache(queryClient, queuedRun);
      void invalidateAiPathQueue(queryClient);
      notifyAiPathRunEnqueued(
        queuedRun &&
          typeof queuedRun === 'object' &&
          typeof (queuedRun as { id?: unknown }).id === 'string'
          ? ((queuedRun as { id: string }).id)
          : null
      );
      toast('AI Path run queued.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'useAiPathTrigger', action: 'runPathTrigger', productId: product.id } });
      toast('Failed to run AI Path trigger.', { variant: 'error' });
    }
  };

  return { handlePathGenerateDescription };
}
