"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/shared/ui";
import { logger } from "@/shared/utils/logger";

import type {
  AiNode,
  Edge,
  PathConfig,
  PathMeta,
  PathDebugEntry,
  PathDebugSnapshot,
  RuntimeState,
} from "@/shared/types/ai-paths";
import {
  evaluateGraph,
  normalizeNodes,
  sanitizeEdges,
  createDefaultPathConfig,
  PATH_CONFIG_PREFIX,
  PATH_DEBUG_PREFIX,
  PATH_INDEX_KEY,
  TRIGGER_EVENTS,
} from "@/features/ai/ai-paths/lib";

type TriggerEventEntityType = "product" | "note" | "custom";

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
    status: "running" | "success" | "error";
    progress: number;
    completedNodes: number;
    totalNodes: number;
    node?: { id: string; title?: string | null; type?: string | null } | null;
  }) => void;
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

const loadPathConfigsFromSettings = async (): Promise<{
  configs: Record<string, PathConfig>;
  settingsPathOrder: string[];
}> => {
  const configs: Record<string, PathConfig> = {};
  let settingsPathOrder: string[] = [];
  try {
    const settingsRes = await fetch("/api/settings", { cache: "no-store" });
    if (!settingsRes.ok) return { configs: {}, settingsPathOrder: [] };
    const data = (await settingsRes.json()) as Array<{ key: string; value: string }>;
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
  } catch {
    return { configs: {}, settingsPathOrder: [] };
  }
  return { configs, settingsPathOrder };
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
      pathName: args.pathInfo?.name ?? "AI Trigger Button",
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
    ...(args.entityType === "product" && args.entityId ? { productId: args.entityId } : {}),
  };

  if (args.entityJson) {
    base.entityJson = args.entityJson;
    base.entity = args.entityJson;
    if (args.entityType === "product") base.product = args.entityJson;
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
      toast("Missing trigger id.", { variant: "error" });
      return;
    }

    try {
      const prefsRes = await fetch("/api/user/preferences", { cache: "no-store" });
      if (!prefsRes.ok) {
        throw new Error("Failed to load AI Paths preferences.");
      }
      const prefs = (await prefsRes.json()) as {
        aiPathsPathConfigs?: Record<string, PathConfig> | string | null;
        aiPathsPathIndex?: Array<{ id?: string }> | null;
        aiPathsActivePathId?: string | null;
      };

      let configs: Record<string, PathConfig> = {};
      let settingsPathOrder: string[] = [];

      if (typeof prefs.aiPathsPathConfigs === "string") {
        try {
          const parsed = JSON.parse(prefs.aiPathsPathConfigs) as Record<string, PathConfig>;
          configs = parsed && typeof parsed === "object" ? parsed : {};
        } catch {
          configs = {};
        }
      } else if (prefs.aiPathsPathConfigs && typeof prefs.aiPathsPathConfigs === "object") {
        configs = prefs.aiPathsPathConfigs;
      }

      if (!configs || Object.keys(configs).length === 0) {
        const fallback = await loadPathConfigsFromSettings();
        configs = fallback.configs;
        settingsPathOrder = fallback.settingsPathOrder;
      }

      const configsList: PathConfig[] = Object.values(configs);
      const pathOrder: string[] = Array.isArray(prefs.aiPathsPathIndex)
        ? prefs.aiPathsPathIndex
            .map((item: { id?: string }) => item?.id)
            .filter((id: string | undefined): id is string => typeof id === "string" && id.length > 0)
        : settingsPathOrder;

      const orderedConfigs: PathConfig[] = pathOrder.length
        ? pathOrder
            .map((id: string) => configs[id])
            .filter((config: PathConfig | undefined): config is PathConfig => Boolean(config))
        : configsList;

      const defaultEvent = (TRIGGER_EVENTS[0]?.id as string) ?? "manual";
      const triggerCandidates: PathConfig[] = orderedConfigs.filter((config: PathConfig) =>
        Array.isArray(config?.nodes)
          ? config.nodes.some((node: AiNode) => {
              if (node.type !== "trigger") return false;
              const configuredEvent = node.config?.trigger?.event ?? defaultEvent;
              return configuredEvent === triggerEventId;
            })
          : false
      );

      if (triggerCandidates.length === 0) {
        toast(
          `No AI Path found for trigger \"${args.triggerLabel ?? triggerEventId}\". Add a Trigger node with event \"${triggerEventId}\".`,
          { variant: "error" }
        );
        return;
      }

      const activePathId =
        typeof prefs.aiPathsActivePathId === "string" && prefs.aiPathsActivePathId.trim().length > 0
          ? prefs.aiPathsActivePathId.trim()
          : null;

      const selectedConfig: PathConfig =
        (activePathId
          ? triggerCandidates.find((config: PathConfig): boolean => config.id === activePathId)
          : undefined) ??
        triggerCandidates[0]!;

      if (selectedConfig.isActive === false) {
        toast("This path is deactivated. Activate it to run.", { variant: "info" });
        return;
      }

      toast(`Running AI Path: ${selectedConfig.name}`, { variant: "success" });

      const nodes: AiNode[] = normalizeNodes(Array.isArray(selectedConfig.nodes) ? selectedConfig.nodes : []);
      const edges: Edge[] = sanitizeEdges(nodes, Array.isArray(selectedConfig.edges) ? selectedConfig.edges : []);

      const triggerNodes: AiNode[] = nodes.filter((node: AiNode) => {
        if (node.type !== "trigger") return false;
        const configuredEvent = node.config?.trigger?.event ?? defaultEvent;
        return configuredEvent === triggerEventId;
      });

      const triggerNode: AiNode | undefined =
        triggerNodes.find((node: AiNode) => edges.some((edge: Edge) => edge.from === node.id)) ??
        triggerNodes.find((node: AiNode) => edges.some((edge: Edge) => edge.from === node.id || edge.to === node.id)) ??
        triggerNodes[0];

      if (!triggerNode) {
        toast("No trigger node found for this event.", { variant: "error" });
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

      const alwaysActiveTypes = new Set(["parser", "prompt", "viewer", "database"]);
      const totalNodes = Math.max(
        1,
        nodes.filter((node: AiNode): boolean => {
          if (node.type === "simulation") return false;
          return connected.has(node.id) || alwaysActiveTypes.has(node.type);
        }).length
      );
      const completed = new Set<string>();

      const reportProgress = (payload: {
        status: "running" | "success" | "error";
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

      reportProgress({ status: "running", progress: 0 });

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

      const runAt = new Date().toISOString();
      let runtimeState: RuntimeState;
      try {
        runtimeState = await evaluateGraph({
          nodes,
          edges,
          activePathId: selectedConfig.id ?? "path",
          activePathName: selectedConfig.name ?? undefined,
          triggerNodeId: triggerNode.id,
          triggerEvent: triggerEventId,
          triggerContext,
          deferPoll: false,
          onNodeFinish: (payload: { node: AiNode }): void => {
            const { node } = payload;
            if (!node || node.type === "simulation") return;
            if (!connected.has(node.id) && !alwaysActiveTypes.has(node.type)) return;
            if (!completed.has(node.id)) {
              completed.add(node.id);
            }
            reportProgress({ status: "running", progress: completed.size / totalNodes, node });
          },
          onNodeError: (payload: { node: AiNode; error: unknown }): void => {
            const { node, error } = payload;
            logger.error("AI Paths trigger node failed", error, { nodeId: node.id, nodeType: node.type });
            reportProgress({ status: "error", progress: completed.size / totalNodes, node });
          },
          fetchEntityByType: async (entityType: string, entityId: string): Promise<Record<string, unknown> | null> => {
            if (!entityId) return null;
            if (entityType === "product") {
              const res = await fetch(`/api/products/${encodeURIComponent(entityId)}`, { cache: "no-store" });
              if (!res.ok) return null;
              return (await res.json()) as Record<string, unknown>;
            }
            if (entityType === "note") {
              const res = await fetch(`/api/notes/${encodeURIComponent(entityId)}`, { cache: "no-store" });
              if (!res.ok) return null;
              return (await res.json()) as Record<string, unknown>;
            }
            return null;
          },
          reportAiPathsError: (error: unknown, meta?: Record<string, unknown>, summary?: string): void => {
            logger.error(summary ?? "AI Paths trigger failed", error, meta);
          },
          toast,
        });
      } catch (error) {
        reportProgress({ status: "error", progress: completed.size / totalNodes });
        throw error;
      }

      reportProgress({ status: "success", progress: 1 });

      if (args.entityType === "product") {
        void queryClient.invalidateQueries({ queryKey: ["products"] });
        void queryClient.invalidateQueries({ queryKey: ["products-count"] });
      }
      if (args.entityType === "note") {
        void queryClient.invalidateQueries({ queryKey: ["notes"] });
      }

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
            const output = runtimeState.outputs[node.id] as { debugPayload?: unknown } | undefined;
            const debugPayload = output?.debugPayload;
            if (debugPayload === undefined || debugPayload === null) return null;
            return { nodeId: node.id, title: node.title, debug: debugPayload };
          })
          .filter((entry: PathDebugEntry | null): entry is PathDebugEntry => Boolean(entry));

        const debugSnapshot: PathDebugSnapshot | null = debugEntries.length
          ? { pathId: updatedConfig.id, runAt, entries: debugEntries }
          : null;

        configs[updatedConfig.id] = updatedConfig;
        const orderedIds: string[] = pathOrder.length ? pathOrder : orderedConfigs.map((config: PathConfig) => config.id);
        const safeConfigs: string = safeJsonStringify(configs);

        await fetch("/api/user/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            aiPathsPathConfigs: safeConfigs || configs,
            aiPathsActivePathId: updatedConfig.id,
            ...(orderedIds.length > 0 && { aiPathsPathIndex: orderedIds.map((id: string) => ({ id })) }),
          }),
        });

        try {
          const configValue = safeJsonStringify(updatedConfig);
          const indexValue = JSON.stringify(orderedIds.map((id: string) => ({ id })));
          const debugValue = debugSnapshot ? safeJsonStringify(debugSnapshot) : "";
          if (configValue) {
            await fetch("/api/settings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key: `${PATH_CONFIG_PREFIX}${updatedConfig.id}`, value: configValue }),
            });
          }
          if (debugValue) {
            await fetch("/api/settings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key: `${PATH_DEBUG_PREFIX}${updatedConfig.id}`, value: debugValue }),
            });
          }
          if (orderedIds.length > 0) {
            await fetch("/api/settings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key: PATH_INDEX_KEY, value: indexValue }),
            });
          }
        } catch (error) {
          logger.error("Failed to persist AI Paths settings snapshot", error);
        }
      } catch (error) {
        logger.error("Failed to persist AI Paths runtime state", error);
      }
    } catch (error) {
      logger.error("Failed to run AI Path trigger", error);
      toast("Failed to run AI Path trigger.", { variant: "error" });
    }
  };

  return { fireAiPathTriggerEvent };
}
