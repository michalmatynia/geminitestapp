"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/shared/ui";
import { logClientError } from "@/features/observability/utils/client-error-logger";
import { logger } from "@/shared/utils/logger";
import {
  fetchSettingsCached,
  invalidateSettingsCache,
} from "@/shared/api/settings-client";
import { withCsrfHeaders } from "@/shared/lib/security/csrf-client";
import type {
  AiNode,
  PathConfig,
  PathMeta,
  PathDebugSnapshot,
  PathDebugEntry,
  Edge,
  RuntimeState,
} from "@/shared/types/ai-paths";
import {
  evaluateGraphWithIteratorAutoContinue,
} from "@/features/ai/ai-paths/lib/core/runtime/engine";
import { appendLocalRun, runsApi } from "@/features/ai/ai-paths/lib";
import {
  AI_PATHS_UI_STATE_KEY,
  PATH_CONFIG_PREFIX,
  PATH_DEBUG_PREFIX,
  PATH_INDEX_KEY,
  TRIGGER_EVENTS,
} from "@/features/ai/ai-paths/lib/core/constants";
import {
  createDefaultPathConfig,
} from "@/features/ai/ai-paths/lib/core/utils/factory";
import {
  sanitizeEdges,
} from "@/features/ai/ai-paths/lib/core/utils/graph";
import { safeParseJson } from "@/features/ai/ai-paths/lib/core/utils/runtime";

const AI_PATHS_SETTINGS_STALE_MS = 10_000;
const AI_PATHS_ENTITY_STALE_MS = 10_000;

const normalizeNodes = (nodes: AiNode[]): AiNode[] => {
  return nodes.map((node: AiNode) => ({
    ...node,
    id: node.id || `node-${Math.random().toString(36).substr(2, 9)}`,
    title: node.title || node.type || "Untitled Node",
  }));
};

const safeJsonStringify = (value: unknown): string => {
  const seen = new WeakSet();
  const replacer = (_key: string, val: unknown): unknown => {
    if (typeof val === "bigint") return val.toString();
    if (val instanceof Date) return val.toISOString();
    if (val instanceof Set) return Array.from(val.values());
    if (val instanceof Map) return Object.fromEntries(val.entries());
    if (typeof val === "function" || typeof val === "symbol") return undefined;
    if (val && typeof val === "object") {
      if (seen.has(val)) return undefined;
      seen.add(val);
    }
    return val;
  };
  try {
    return JSON.stringify(value, replacer);
  } catch {
    return "";
  }
};

export function useAiPathTrigger(): {
  handlePathGenerateDescription: (
    product: { id: string } | null,
    event?: React.MouseEvent<HTMLButtonElement>
  ) => Promise<void>;
} {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const buildTriggerContext = (
    triggerNode: AiNode,
    triggerEvent: string,
    event?: React.MouseEvent<HTMLButtonElement>,
    product?: { id: string } | null,
    pathInfo?: { id?: string; name?: string }
  ): Record<string, unknown> => {
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
          offsetX: "offsetX" in nativeEvent ? (nativeEvent as unknown as { offsetX: number }).offsetX : undefined,
          offsetY: "offsetY" in nativeEvent ? (nativeEvent as unknown as { offsetY: number }).offsetY : undefined,
          button: nativeEvent.button,
          buttons: nativeEvent.buttons,
          altKey: nativeEvent.altKey,
          ctrlKey: nativeEvent.ctrlKey,
          shiftKey: nativeEvent.shiftKey,
          metaKey: nativeEvent.metaKey,
        }
      : undefined;
    const location =
      typeof window !== "undefined"
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
      typeof window !== "undefined"
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
        pathName: pathInfo?.name ?? "Product Panel",
        tab: "product",
      },
      extras: {
        triggerLabel: "Path Generate Description",
      },
      entityId: product?.id,
      productId: product?.id,
      entityType: "product",
    };
  };

  const handlePathGenerateDescription = async (
    product: { id: string } | null,
    event?: React.MouseEvent<HTMLButtonElement>
  ): Promise<void> => {
    if (!product?.id) {
      toast("Save the product before running a path trigger.", {
        variant: "error",
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
      let settingsData: Array<{ key: string; value: string }> = [];
      try {
        settingsData = await queryClient.fetchQuery({
          queryKey: ["settings", "heavy"],
          queryFn: async () => {
            return await fetchSettingsCached({ scope: "heavy" });
          },
          staleTime: AI_PATHS_SETTINGS_STALE_MS,
        });
      } catch {
        settingsData = await fetchSettingsCached({ scope: "heavy" });
      }
      const map = new Map<string, string>(
        settingsData.map((item: { key: string; value: string }) => [item.key, item.value])
      );
      const uiStateRaw = map.get(AI_PATHS_UI_STATE_KEY);
      const uiStateParsed = uiStateRaw ? safeParseJson(uiStateRaw).value : null;
      const uiState =
        uiStateParsed && typeof uiStateParsed === "object"
          ? (uiStateParsed as Record<string, unknown>)
          : null;
      let configs: Record<string, PathConfig> = {};
      let settingsPathOrder: string[] = [];
      const indexRaw = map.get(PATH_INDEX_KEY);
      if (indexRaw) {
        try {
          const parsedIndex = JSON.parse(indexRaw) as PathMeta[];
          if (Array.isArray(parsedIndex)) {
            settingsPathOrder = parsedIndex
              .map((meta: PathMeta) => meta?.id)
              .filter((id: string | undefined): id is string => typeof id === "string" && id.length > 0);
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
        const legacyRaw = map.get(`${PATH_CONFIG_PREFIX}default`) ?? map.get("ai_paths_config");
        if (legacyRaw) {
          try {
            const parsedConfig = JSON.parse(legacyRaw) as PathConfig;
            const fallback = createDefaultPathConfig(parsedConfig.id ?? "default");
            configs[fallback.id] = {
              ...fallback,
              ...parsedConfig,
              id: parsedConfig.id ?? fallback.id,
              name: parsedConfig.name || fallback.name,
            };
          } catch {
            const fallback = createDefaultPathConfig("default");
            configs[fallback.id] = fallback;
          }
        }
      }
      const configsList: PathConfig[] = Object.values(configs);
      const pathOrder: string[] = settingsPathOrder;
      const orderedConfigs: PathConfig[] = pathOrder.length
        ? pathOrder
            .map((id: string) => configs[id])
            .filter((config: PathConfig | undefined): config is PathConfig => Boolean(config))
        : configsList;
      const triggerEvent = (TRIGGER_EVENTS[0]?.id as string) ?? "path_generate_description";
      const triggerCandidates: PathConfig[] = orderedConfigs.filter((config: PathConfig) =>
        Array.isArray(config?.nodes)
          ? config.nodes.some(
              (node: AiNode) =>
                node.type === "trigger" &&
                (node.config?.trigger?.event ?? triggerEvent) === triggerEvent
            )
          : false
      );
      const activePathId =
        typeof uiState?.activePathId === "string" && uiState.activePathId.trim().length > 0
          ? uiState.activePathId.trim()
          : null;
      const activeTriggerCandidate = activePathId
        ? triggerCandidates.find((config: PathConfig): boolean => config.id === activePathId)
        : undefined;
      const selectedConfig: PathConfig | undefined =
        activeTriggerCandidate ?? triggerCandidates[0] ?? orderedConfigs[0];
      if (!selectedConfig) {
        toast(
          "No AI Path found. Configure a path with the Path Generate Description trigger.",
          { variant: "error" }
        );
        return;
      }
      toast(`Running AI Path: ${selectedConfig.name}`, { variant: "success" });
      const nodes: AiNode[] = normalizeNodes(
        Array.isArray(selectedConfig.nodes) ? selectedConfig.nodes : []
      );
      const edges: Edge[] = sanitizeEdges(
        nodes,
        Array.isArray(selectedConfig.edges) ? selectedConfig.edges : []
      );
      const triggerNodes: AiNode[] = nodes.filter(
        (node: AiNode) =>
          node.type === "trigger" &&
          (node.config?.trigger?.event ?? triggerEvent) === triggerEvent
      );
      const triggerNode: AiNode | undefined =
        triggerNodes.find((node: AiNode) => edges.some((edge: Edge) => edge.from === node.id)) ??
        triggerNodes.find((node: AiNode) =>
          edges.some((edge: Edge) => edge.from === node.id || edge.to === node.id)
        ) ??
        triggerNodes[0] ??
        nodes.find((node: AiNode) => node.type === "trigger");
      if (!triggerNode) {
        toast("No trigger node found in the selected path.", { variant: "error" });
        return;
      }
      const triggerContext: Record<string, unknown> = buildTriggerContext(triggerNode, triggerEvent, event, product, {
        id: selectedConfig.id,
        name: selectedConfig.name,
      });
      const executionMode = selectedConfig.executionMode === "local" ? "local" : "server";
      if (executionMode === "server") {
        const enqueueResult = await runsApi.enqueue({
          pathId: selectedConfig.id ?? "path",
          pathName: selectedConfig.name ?? undefined,
          nodes,
          edges,
          triggerEvent,
          triggerNodeId: triggerNode.id,
          triggerContext,
          entityId: product.id,
          entityType: "product",
          meta: {
            source: "product_panel",
            triggerLabel: "Path Generate Description",
          },
        });
        if (!enqueueResult.ok) {
          toast(enqueueResult.error || "Failed to enqueue AI Path run.", {
            variant: "error",
          });
          return;
        }
        toast("AI Path run queued.", { variant: "success" });
        return;
      }
      startedAt = new Date().toISOString();
      startedAtMs = Date.now();
      localRunContext = {
        pathId: selectedConfig.id ?? null,
        pathName: selectedConfig.name ?? null,
        triggerEvent,
        triggerLabel: "Path Generate Description",
        entityType: "product",
        entityId: product.id,
        nodeCount: nodes.length,
      };
      const runtimeState: RuntimeState = await evaluateGraphWithIteratorAutoContinue({
        nodes,
        edges,
        activePathId: selectedConfig.id ?? "path",
        activePathName: selectedConfig.name ?? undefined,
        triggerNodeId: triggerNode.id,
        triggerEvent,
        triggerContext,
        deferPoll: false,
        fetchEntityByType: async (entityType: string, entityId: string): Promise<Record<string, unknown> | null> => {
          if (entityType !== "product") return null;
          return await queryClient.fetchQuery({
            queryKey: ["products", entityId],
            queryFn: async () => {
              const res = await fetch(`/api/products/${encodeURIComponent(entityId)}`);
              if (!res.ok) return null;
              return (await res.json()) as Record<string, unknown>;
            },
            staleTime: AI_PATHS_ENTITY_STALE_MS,
          });
        },
        reportAiPathsError: (error: unknown, meta?: Record<string, unknown>, summary?: string): void => {
          logger.error(summary ?? "AI Paths trigger failed", error, meta);
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
          status: "success",
          startedAt,
          finishedAt: runAt,
          durationMs: Date.now() - startedAtMs,
          nodeCount: localRunContext.nodeCount ?? null,
          source: "product_panel",
        });
      }
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["products-count"] });
      try {
        const updatedConfig: PathConfig = {
          ...selectedConfig,
          nodes,
          edges,
          runtimeState,
          lastRunAt: runAt,
          updatedAt: runAt,
        };
        const debugEntries: PathDebugEntry[] = nodes
          .filter((node: AiNode) => node.type === "database")
          .map((node: AiNode): PathDebugEntry | null => {
            const output = runtimeState.outputs[node.id] as
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
              pathId: updatedConfig.id,
              runAt,
              entries: debugEntries,
            }
          : null;
        configs[updatedConfig.id] = updatedConfig;
        const orderedIds: string[] = pathOrder.length
          ? pathOrder
          : orderedConfigs.map((config: PathConfig) => config.id);
        try {
          const csrfHeaders = withCsrfHeaders({ "Content-Type": "application/json" });
          const configValue = safeJsonStringify(updatedConfig);
          const indexValue = JSON.stringify(orderedIds.map((id: string) => ({ id })));
          const debugValue = debugSnapshot ? safeJsonStringify(debugSnapshot) : "";
          const nextUiState = {
            ...(uiState && typeof uiState === "object" ? uiState : {}),
            activePathId: updatedConfig.id,
          };
          if (configValue) {
            await fetch("/api/settings", {
              method: "POST",
              headers: csrfHeaders,
              body: JSON.stringify({
                key: `${PATH_CONFIG_PREFIX}${updatedConfig.id}`,
                value: configValue,
              }),
            });
          }
          if (debugValue) {
            await fetch("/api/settings", {
              method: "POST",
              headers: csrfHeaders,
              body: JSON.stringify({
                key: `${PATH_DEBUG_PREFIX}${updatedConfig.id}`,
                value: debugValue,
              }),
            });
          }
          if (orderedIds.length > 0) {
            await fetch("/api/settings", {
              method: "POST",
              headers: csrfHeaders,
              body: JSON.stringify({ key: PATH_INDEX_KEY, value: indexValue }),
            });
          }
          await fetch("/api/settings", {
            method: "POST",
            headers: csrfHeaders,
            body: JSON.stringify({
              key: AI_PATHS_UI_STATE_KEY,
              value: JSON.stringify(nextUiState),
            }),
          });
          invalidateSettingsCache();
        } catch (error) {
          logClientError(error, { context: { source: "useAiPathTrigger", action: "persistSettingsSnapshot", pathId: updatedConfig.id } });
        }
      } catch (error) {
        logClientError(error, { context: { source: "useAiPathTrigger", action: "persistRuntimeState", pathId: selectedConfig.id } });
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
          status: "error",
          startedAt,
          finishedAt: new Date().toISOString(),
          durationMs: Date.now() - startedAtMs,
          nodeCount: localRunContext.nodeCount ?? null,
          error: error instanceof Error ? error.message : "Local run failed",
          source: "product_panel",
        });
      }
      logClientError(error, { context: { source: "useAiPathTrigger", action: "runPathTrigger", productId: product.id } });
      toast("Failed to run AI Path trigger.", { variant: "error" });
    }
  };

  return { handlePathGenerateDescription };
}
