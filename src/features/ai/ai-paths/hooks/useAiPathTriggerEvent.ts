'use client';

import { useQueryClient } from '@tanstack/react-query';

import {
  normalizeNodes,
  sanitizeEdges,
  createDefaultPathConfig,
  safeParseJson,
  AI_PATHS_UI_STATE_KEY,
  PATH_CONFIG_PREFIX,
  PATH_INDEX_KEY,
  TRIGGER_EVENTS,
  appendLocalRun,
  entityApi,
  evaluateGraphWithIteratorAutoContinue,
  runsApi,
} from '@/features/ai/ai-paths/lib';
import { jobKeys } from '@/features/jobs/hooks/useJobQueries';
import {
  fetchSettingsCached,
  invalidateSettingsCache,
} from '@/shared/api/settings-client';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import type {
  AiNode,
  Edge,
  PathConfig,
  PathMeta,
} from '@/shared/types/ai-paths';
import { useToast } from '@/shared/ui';
import { logger } from '@/shared/utils/logger';

type TriggerEventEntityType = 'product' | 'note' | 'custom';

const AI_PATHS_SETTINGS_STALE_MS = 10_000;

export type FireAiPathTriggerEventArgs = {
  triggerEventId: string;
  triggerLabel?: string | null | undefined;
  entityType: TriggerEventEntityType;
  entityId?: string | null | undefined;
  getEntityJson?: () => Record<string, unknown> | null;
  event?: React.MouseEvent<HTMLButtonElement> | React.MouseEvent;
  source?: { tab?: string; location?: string; page?: string } | null;
  extras?: Record<string, unknown> | null;
  onProgress?: (payload: {
    status: 'running' | 'success' | 'error';
    progress: number;
    completedNodes: number;
    totalNodes: number;
    node?: { id: string; title?: string | null; type?: string | null } | null;
  }) => void;
};

const loadPathConfigsFromSettings = async (
  settingsData?: Array<{ key: string; value: string }>
): Promise<{
  configs: Record<string, PathConfig>;
  settingsPathOrder: string[];
}> => {
  const configs: Record<string, PathConfig> = {};
  let settingsPathOrder: string[] = [];
  try {
    const data =
      settingsData ??
      ((await (async (): Promise<Array<{ key: string; value: string }> | null> => {
        return await fetchSettingsCached({ scope: 'heavy' });
      })()) ?? []);
    if (!data.length) return { configs: {}, settingsPathOrder: [] };
    const map = new Map<string, string>(
      data.map((item: { key: string; value: string }) => [item.key, item.value])
    );
    const indexRaw = map.get(PATH_INDEX_KEY);
    if (indexRaw) {
      try {
        const parsedIndex = JSON.parse(indexRaw) as PathMeta[];
        if (Array.isArray(parsedIndex)) {
          settingsPathOrder = parsedIndex
            .map((meta: PathMeta) => meta?.id)
            .filter((id: string | undefined): id is string => typeof id === 'string' && id.length > 0);
          parsedIndex.forEach((meta: PathMeta) => {
            if (!meta?.id) return;
            const configRaw = map.get(`${PATH_CONFIG_PREFIX}${meta.id}`);
            if (!configRaw) {
              configs[meta.id] = createDefaultPathConfig(meta.id);
              return;
            }
            try {
              const parsedConfig = JSON.parse(configRaw) as PathConfig;
              configs[meta.id] = {
                ...createDefaultPathConfig(meta.id),
                ...parsedConfig,
                id: meta.id,
                name: parsedConfig?.name || meta.name || `Path ${meta.id}`,
              };
            } catch {
              configs[meta.id] = createDefaultPathConfig(meta.id);
            }
          });
        }
      } catch {
        settingsPathOrder = [];
      }
    }
    if (Object.keys(configs).length === 0) {
      const legacyRaw = map.get(`${PATH_CONFIG_PREFIX}default`) ?? map.get('ai_paths_config');
      if (legacyRaw) {
        try {
          const parsedConfig = JSON.parse(legacyRaw) as PathConfig;
          const fallback = createDefaultPathConfig(parsedConfig.id ?? 'default');
          configs[fallback.id] = {
            ...fallback,
            ...parsedConfig,
            id: parsedConfig.id ?? fallback.id,
            name: parsedConfig.name || fallback.name,
          };
        } catch {
          const fallback = createDefaultPathConfig('default');
          configs[fallback.id] = fallback;
        }
      }
    }
  } catch {
    return { configs: {}, settingsPathOrder: [] };
  }
  return { configs, settingsPathOrder };
};

const resolveTriggerSelection = async (
  settingsData: Array<{ key: string; value: string }>,
  triggerEventId: string
): Promise<{
  triggerCandidates: PathConfig[];
  selectedConfig: PathConfig | null;
  uiState: Record<string, unknown> | null;
}> => {
  const { configs, settingsPathOrder } = await loadPathConfigsFromSettings(settingsData);
  const configsList: PathConfig[] = Object.values(configs);
  const pathOrder: string[] = settingsPathOrder;
  const map = new Map<string, string>(
    settingsData.map((item: { key: string; value: string }) => [item.key, item.value])
  );
  const uiStateRaw = map.get(AI_PATHS_UI_STATE_KEY);
  const uiStateParsed = uiStateRaw ? safeParseJson(uiStateRaw).value : null;
  const uiState =
    uiStateParsed && typeof uiStateParsed === 'object'
      ? (uiStateParsed as Record<string, unknown>)
      : null;

  const orderedConfigs: PathConfig[] = pathOrder.length
    ? pathOrder
      .map((id: string) => configs[id])
      .filter((config: PathConfig | undefined): config is PathConfig => Boolean(config))
    : configsList;

  const fallbackTriggerEventId = (TRIGGER_EVENTS[0]?.id as string) ?? 'manual';
  const triggerCandidates: PathConfig[] = orderedConfigs.filter((config: PathConfig) =>
    Array.isArray(config?.nodes)
      ? config.nodes.some((node: AiNode) => {
        if (node.type !== 'trigger') return false;
        const configuredEvent = node.config?.trigger?.event ?? fallbackTriggerEventId;
        return configuredEvent === triggerEventId;
      })
      : false
  );

  const activePathId =
    typeof uiState?.activePathId === 'string' && uiState.activePathId.trim().length > 0
      ? uiState.activePathId.trim()
      : null;

  const preferredConfig: PathConfig | null =
    (activePathId
      ? triggerCandidates.find((config: PathConfig): boolean => config.id === activePathId)
      : undefined) ??
    triggerCandidates[0] ??
    null;

  const selectedConfig =
    preferredConfig?.isActive === false
      ? triggerCandidates.find((candidate: PathConfig): boolean => candidate.isActive !== false) ?? preferredConfig
      : preferredConfig;

  return { triggerCandidates, selectedConfig, uiState };
};

const buildTriggerContext = (args: {
  triggerNode: AiNode;
  triggerEventId: string;
  triggerLabel?: string | null | undefined;
  entityType: TriggerEventEntityType;
  entityId?: string | null | undefined;
  entityJson?: Record<string, unknown> | null;
  event?: React.MouseEvent;
  pathInfo?: { id?: string; name?: string } | null;
  source?: { tab?: string; location?: string; page?: string } | null;
  extras?: Record<string, unknown> | null;
}): Record<string, unknown> => {
  const timestamp = new Date().toISOString();
  const nativeEvent = args.event?.nativeEvent;
  const pointer = nativeEvent
    ? {
      clientX: nativeEvent.clientX,
      clientY: nativeEvent.clientY,
      pageX: nativeEvent.pageX,
      pageY: nativeEvent.pageY,
      screenX: nativeEvent.screenX,
      screenY: nativeEvent.screenY,
      offsetX: nativeEvent.offsetX,
      offsetY: nativeEvent.offsetY,
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

  const base: Record<string, unknown> = {
    timestamp,
    location,
    ui,
    user: null,
    event: {
      id: args.triggerEventId,
      nodeId: args.triggerNode.id,
      nodeTitle: args.triggerNode.title,
      type: args.event?.type,
      pointer,
    },
    source: {
      pathId: args.pathInfo?.id,
      pathName: args.pathInfo?.name ?? 'AI Trigger Button',
      tab: args.source?.tab ?? args.entityType,
      location: args.source?.location ?? null,
      page: args.source?.page ?? null,
    },
    extras: {
      triggerLabel: args.triggerLabel ?? null,
      ...(args.extras ?? {}),
    },
    entityId: args.entityId ?? null,
    entityType: args.entityType,
    ...(args.entityType === 'product' && args.entityId ? { productId: args.entityId } : {}),
  };

  if (args.entityJson) {
    base.entityJson = args.entityJson;
    base.entity = args.entityJson;
    if (args.entityType === 'product') base.product = args.entityJson;
  }

  return base;
};

export function useAiPathTriggerEvent(): {
  fireAiPathTriggerEvent: (args: FireAiPathTriggerEventArgs) => Promise<void>;
  } {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const fireAiPathTriggerEvent = async (args: FireAiPathTriggerEventArgs): Promise<void> => {
    const triggerEventId = args.triggerEventId.trim();
    if (!triggerEventId) {
      toast('Missing trigger id.', { variant: 'error' });
      return;
    }

    try {
      let settingsData: Array<{ key: string; value: string }> = [];
      try {
        settingsData = await queryClient.fetchQuery({
          queryKey: ['settings', 'heavy'],
          queryFn: async () => {
            return await fetchSettingsCached({ scope: 'heavy' });
          },
          staleTime: AI_PATHS_SETTINGS_STALE_MS,
        });
      } catch {
        settingsData = await fetchSettingsCached({ scope: 'heavy' });
      }

      let selection = await resolveTriggerSelection(settingsData, triggerEventId);
      const triggerCandidates: PathConfig[] = selection.triggerCandidates;

      if (triggerCandidates.length === 0) {
        toast(
          `No AI Path found for trigger "${args.triggerLabel ?? triggerEventId}". Add a Trigger node with event "${triggerEventId}".`,
          { variant: 'error' }
        );
        return;
      }

      let selectedConfig = selection.selectedConfig;
      let uiState = selection.uiState;
      if (!selectedConfig) {
        toast(
          `No AI Path found for trigger "${args.triggerLabel ?? triggerEventId}". Add a Trigger node with event "${triggerEventId}".`,
          { variant: 'error' }
        );
        return;
      }

      if (selectedConfig.isActive === false) {
        // Guard against stale settings cache after path activation toggles.
        invalidateSettingsCache('heavy');
        const freshSettingsData = await fetchSettingsCached({ scope: 'heavy', bypassCache: true });
        selection = await resolveTriggerSelection(freshSettingsData, triggerEventId);
        if (selection.selectedConfig?.isActive === false || !selection.selectedConfig) {
          toast('This path is deactivated. Activate it to run.', { variant: 'info' });
          return;
        }
        settingsData = freshSettingsData;
        selectedConfig = selection.selectedConfig;
        uiState = selection.uiState;
      }

      toast(`Running AI Path: ${selectedConfig.name}`, { variant: 'success' });

      const nodes: AiNode[] = normalizeNodes(Array.isArray(selectedConfig.nodes) ? selectedConfig.nodes : []);
      const edges: Edge[] = sanitizeEdges(nodes, Array.isArray(selectedConfig.edges) ? selectedConfig.edges : []);
      const fallbackTriggerEventId = (TRIGGER_EVENTS[0]?.id as string) ?? 'manual';

      const triggerNodes: AiNode[] = nodes.filter((node: AiNode) => {
        if (node.type !== 'trigger') return false;
        const configuredEvent = node.config?.trigger?.event ?? fallbackTriggerEventId;
        return configuredEvent === triggerEventId;
      });

      const triggerNode: AiNode | undefined =
        triggerNodes.find((node: AiNode) => edges.some((edge: Edge) => edge.from === node.id)) ??
        triggerNodes.find((node: AiNode) => edges.some((edge: Edge) => edge.from === node.id || edge.to === node.id)) ??
        triggerNodes[0];

      if (!triggerNode) {
        toast('No trigger node found for this event.', { variant: 'error' });
        return;
      }

      const adjacency = new Map<string, Set<string>>();
      edges.forEach((edge: Edge) => {
        if (!edge.from || !edge.to) return;
        const fromSet = adjacency.get(edge.from) ?? new Set<string>();
        fromSet.add(edge.to);
        adjacency.set(edge.from, fromSet);
        const toSet = adjacency.get(edge.to) ?? new Set<string>();
        toSet.add(edge.from);
        adjacency.set(edge.to, toSet);
      });

      const connected = new Set<string>();
      const queue: string[] = [triggerNode.id];
      connected.add(triggerNode.id);
      while (queue.length) {
        const current = queue.shift();
        if (!current) continue;
        const neighbors = adjacency.get(current);
        if (!neighbors) continue;
        neighbors.forEach((neighbor: string) => {
          if (connected.has(neighbor)) return;
          connected.add(neighbor);
          queue.push(neighbor);
        });
      }

      const alwaysActiveTypes = new Set(['parser', 'prompt', 'viewer', 'database']);
      const totalNodes = Math.max(
        1,
        nodes.filter((node: AiNode): boolean => {
          if (node.type === 'simulation') return false;
          return connected.has(node.id) || alwaysActiveTypes.has(node.type);
        }).length
      );
      const completed = new Set<string>();
      const reportProgress = (payload: {
        status: 'running' | 'success' | 'error';
        progress: number;
        node?: AiNode | null | undefined;
      }): void => {
        if (!args.onProgress) return;
        const rawProgress = Number.isFinite(payload.progress) ? payload.progress : 0;
        const clamped = Math.max(0, Math.min(1, rawProgress));
        const node = payload.node
          ? { id: payload.node.id, title: payload.node.title ?? null, type: payload.node.type ?? null }
          : null;
        args.onProgress({
          status: payload.status,
          progress: clamped,
          completedNodes: completed.size,
          totalNodes,
          node,
        });
      };

      const entityJson = args.getEntityJson ? args.getEntityJson() : null;

      const triggerContext = buildTriggerContext({
        triggerNode,
        triggerEventId,
        triggerLabel: args.triggerLabel ?? null,
        entityType: args.entityType,
        entityId: args.entityId ?? null,
        entityJson,
        ...(args.event ? { event: args.event as React.MouseEvent } : {}),
        pathInfo: { id: selectedConfig.id, name: selectedConfig.name },
        source: args.source ?? null,
        extras: args.extras ?? null,
      });

      reportProgress({ status: 'running', progress: 0 });

      const persistRunSnapshot = async (runAt: string): Promise<void> => {
        try {
          const csrfHeaders = withCsrfHeaders({ 'Content-Type': 'application/json' });
          const nextUiState = {
            ...(uiState && typeof uiState === 'object' ? uiState : {}),
            activePathId: selectedConfig.id,
            lastTriggeredAt: runAt,
          };
          await fetch('/api/settings', {
            method: 'POST',
            headers: csrfHeaders,
            body: JSON.stringify({
              key: AI_PATHS_UI_STATE_KEY,
              value: JSON.stringify(nextUiState),
            }),
          });
          invalidateSettingsCache();
        } catch (error) {
          logger.error('Failed to persist AI Paths settings snapshot', error);
        }
      };

      const executionMode = selectedConfig.executionMode ?? 'server';
      const startedAt = new Date().toISOString();
      const startedAtMs = Date.now();
      const runId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `run_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;

      if (executionMode === 'local') {
        try {
          await evaluateGraphWithIteratorAutoContinue({
            nodes,
            edges,
            activePathId: selectedConfig.id ?? null,
            activePathName: selectedConfig.name ?? null,
            runId,
            runStartedAt: startedAt,
            triggerNodeId: triggerNode.id,
            triggerEvent: triggerEventId,
            triggerContext,
            deferPoll: true,
            recordHistory: true,
            historyLimit: 50,
            fetchEntityByType: async (entityType: string, entityId: string) => {
              const result = await entityApi.getByType(entityType, entityId);
              return result.ok ? result.data : null;
            },
            reportAiPathsError: (error, meta, summary) => {
              logger.error(summary ?? 'AI Paths run error', { error, ...meta });
            },
            toast,
            onNodeFinish: ({ node }) => {
              if (!completed.has(node.id)) {
                completed.add(node.id);
              }
              reportProgress({
                status: 'running',
                progress: completed.size / totalNodes,
                node,
              });
            },
          });
          const runAt = new Date().toISOString();
          reportProgress({ status: 'success', progress: 1 });
          toast('AI Path run completed locally.', { variant: 'success' });
          void appendLocalRun({
            pathId: selectedConfig.id ?? null,
            pathName: selectedConfig.name ?? null,
            triggerEvent: triggerEventId,
            triggerLabel: args.triggerLabel ?? null,
            entityType: args.entityType,
            entityId: args.entityId ?? null,
            status: 'success',
            startedAt,
            finishedAt: runAt,
            durationMs: Date.now() - startedAtMs,
            nodeCount: totalNodes,
            source: 'trigger_button',
          });
          if (args.entityType === 'product') {
            void queryClient.invalidateQueries({ queryKey: ['products'] });
            void queryClient.invalidateQueries({ queryKey: ['products-count'] });
            void queryClient.invalidateQueries({ queryKey: jobKeys.productAi });
          }
          if (args.entityType === 'note') {
            void queryClient.invalidateQueries({ queryKey: ['notes'] });
          }
          await persistRunSnapshot(runAt);
        } catch (error) {
          reportProgress({ status: 'error', progress: 0 });
          toast('AI Path run failed.', { variant: 'error' });
          void appendLocalRun({
            pathId: selectedConfig.id ?? null,
            pathName: selectedConfig.name ?? null,
            triggerEvent: triggerEventId,
            triggerLabel: args.triggerLabel ?? null,
            entityType: args.entityType,
            entityId: args.entityId ?? null,
            status: 'error',
            startedAt,
            finishedAt: new Date().toISOString(),
            durationMs: Date.now() - startedAtMs,
            nodeCount: totalNodes,
            error: error instanceof Error ? error.message : 'Local run failed',
            source: 'trigger_button',
          });
        }
        return;
      }

      const enqueueResult = await runsApi.enqueue({
        pathId: selectedConfig.id ?? 'path',
        pathName: selectedConfig.name ?? undefined,
        nodes,
        edges,
        triggerEvent: triggerEventId,
        triggerNodeId: triggerNode.id,
        triggerContext,
        entityId: args.entityId ?? null,
        entityType: args.entityType,
        meta: {
          source: 'trigger_button',
          triggerEventId,
          triggerLabel: args.triggerLabel ?? null,
          ...(args.source ? { sourceInfo: args.source } : {}),
          ...(args.extras ?? {}),
        },
      });

      if (!enqueueResult.ok) {
        reportProgress({ status: 'error', progress: 0 });
        toast(enqueueResult.error || 'Failed to enqueue AI Path run.', { variant: 'error' });
        return;
      }

      const runAt = new Date().toISOString();
      reportProgress({ status: 'success', progress: 1 });
      toast('AI Path run queued.', { variant: 'success' });

      if (args.entityType === 'product') {
        void queryClient.invalidateQueries({ queryKey: ['products'] });
        void queryClient.invalidateQueries({ queryKey: ['products-count'] });
        void queryClient.invalidateQueries({ queryKey: jobKeys.productAi });
      }
      if (args.entityType === 'note') {
        void queryClient.invalidateQueries({ queryKey: ['notes'] });
      }

      await persistRunSnapshot(runAt);
    } catch (error) {
      logger.error('Failed to run AI Path trigger', error);
      toast('Failed to run AI Path trigger.', { variant: 'error' });
    }
  };

  return { fireAiPathTriggerEvent };
}
