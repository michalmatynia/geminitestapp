"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUpdateSetting } from "@/shared/hooks/use-settings";
import type {
  AiNode,
  DbQueryConfig,
  Edge,
  ParserSampleState,
  PathConfig,
  PathDebugEntry,
  PathDebugSnapshot,
  RuntimePortValues,
  RuntimeState,
  UpdaterSampleState,
} from "@/features/ai/ai-paths/lib";
import {
  PATH_DEBUG_PREFIX,
  STORAGE_VERSION,
  TRIGGER_EVENTS,
  aiJobsApi,
  coerceInput,
  entityApi,
  evaluateGraph,
  runsApi,
} from "@/features/ai/ai-paths/lib";
import { extractImageUrls } from "@/features/ai/ai-paths/lib/core/runtime/utils";
import {
  DEFAULT_DB_QUERY,
  pollDatabaseQuery,
  pollGraphJob,
  safeJsonStringify,
} from "../AiPathsSettingsUtils";

type ToastFn = (message: string, options?: Partial<{ variant: "success" | "error" | "info"; duration: number }>) => void;

type UseAiPathsRuntimeArgs = {
  activePathId: string | null;
  activeTab: "canvas" | "paths" | "docs" | "queue";
  activeTrigger: string;
  edges: Edge[];
  nodes: AiNode[];
  pathDescription: string;
  pathName: string;
  parserSamples: Record<string, ParserSampleState>;
  updaterSamples: Record<string, UpdaterSampleState>;
  runtimeState: RuntimeState;
  lastRunAt: string | null;
  setLastRunAt: (value: string | null) => void;
  setPathConfigs: React.Dispatch<React.SetStateAction<Record<string, PathConfig>>>;
  setPathDebugSnapshots: React.Dispatch<
    React.SetStateAction<Record<string, PathDebugSnapshot>>
  >;
  setRuntimeState: React.Dispatch<React.SetStateAction<RuntimeState>>;
  toast: ToastFn;
  reportAiPathsError: (
    error: unknown,
    context: Record<string, unknown>,
    fallbackMessage?: string
  ) => void;
};

type UseAiPathsRuntimeResult = {
  handleRunSimulation: (simulationNode: AiNode, triggerEvent?: string) => Promise<void>;
  handleFireTrigger: (triggerNode: AiNode, event?: React.MouseEvent) => void;
  handleFireTriggerPersistent: (
    triggerNode: AiNode,
    event?: React.MouseEvent
  ) => Promise<void>;
  handleSendToAi: (sourceNodeId: string, prompt: string) => Promise<void>;
  sendingToAi: boolean;
};

export function useAiPathsRuntime({
  activePathId,
  activeTab,
  activeTrigger,
  edges,
  nodes,
  pathDescription,
  pathName,
  parserSamples,
  updaterSamples,
  runtimeState,
  lastRunAt,
  setLastRunAt,
  setPathConfigs,
  setPathDebugSnapshots,
  setRuntimeState,
  toast,
  reportAiPathsError,
}: UseAiPathsRuntimeArgs): UseAiPathsRuntimeResult {
  const [sendingToAi, setSendingToAi] = useState(false);

  const pollInFlightRef = useRef<Set<string>>(new Set());
  const lastTriggerNodeIdRef = useRef<string | null>(null);
  const triggerContextRef = useRef<Record<string, unknown> | null>(null);
  const pendingSimulationContextRef = useRef<Record<string, unknown> | null>(null);
  const runtimeStateRef = useRef<RuntimeState>({ inputs: {}, outputs: {} });
  const queryClient = useQueryClient();
  const updateSettingMutation = useUpdateSetting();

  const enqueueAiJobMutation = useMutation({
    mutationFn: async (payload: {
      productId: string;
      type: string;
      payload: unknown;
    }): Promise<unknown> => {
      const result = await aiJobsApi.enqueue(payload);
      if (!result.ok) {
        throw new Error(result.error || "Failed to enqueue AI job.");
      }
      return result.data;
    },
  });

  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (!res.ok) return null;
      return (await res.json()) as {
        user?: { id?: string; name?: string | null; email?: string | null };
      };
    },
    staleTime: 0,
  });

  const sessionUser = useMemo(() => {
    const user = sessionQuery.data?.user;
    if (!user) return null;
    return {
      id: user.id,
      name: user.name ?? null,
      email: user.email ?? null,
    };
  }, [sessionQuery.data]);

  useEffect((): void => {
    runtimeStateRef.current = runtimeState;
  }, [runtimeState]);

  const fetchProductById = useCallback(
    async (productId: string): Promise<Record<string, unknown> | null> => {
      try {
        return await queryClient.fetchQuery({
          queryKey: ["products", productId],
          queryFn: async (): Promise<Record<string, unknown> | null> => {
            const result = await entityApi.getProduct(productId);
            return result.ok ? result.data : null;
          },
          staleTime: 0,
        });
      } catch (error) {
        reportAiPathsError(error, { action: "fetchProduct", productId }, "Failed to fetch product:");
        return null;
      }
    },
    [queryClient, reportAiPathsError]
  );

  const fetchNoteById = useCallback(
    async (noteId: string): Promise<Record<string, unknown> | null> => {
      try {
        return await queryClient.fetchQuery({
          queryKey: ["notes", noteId],
          queryFn: async (): Promise<Record<string, unknown> | null> => {
            const result = await entityApi.getNote(noteId);
            return result.ok ? result.data : null;
          },
          staleTime: 0,
        });
      } catch (error) {
        reportAiPathsError(error, { action: "fetchNote", noteId }, "Failed to fetch note:");
        return null;
      }
    },
    [queryClient, reportAiPathsError]
  );

  const normalizeEntityType = (value?: string | null): string | null => {
    const normalized = value?.trim().toLowerCase();
    if (!normalized) return null;
    if (normalized === "product" || normalized === "products") return "product";
    if (normalized === "note" || normalized === "notes") return "note";
    return normalized;
  };

  const fetchEntityByType = useCallback(
    async (entityType: string, entityId: string): Promise<Record<string, unknown> | null> => {
      if (!entityType || !entityId) return null;
      const normalized = normalizeEntityType(entityType);
      if (normalized === "product") {
        return fetchProductById(entityId);
      }
      if (normalized === "note") {
        return fetchNoteById(entityId);
      }
      return null;
    },
    [fetchProductById, fetchNoteById]
  );

  const buildActivePathConfig = useCallback(
    (updatedAt: string): PathConfig => ({
      id: activePathId ?? "default",
      version: STORAGE_VERSION,
      name: pathName,
      description: pathDescription,
      trigger: activeTrigger,
      nodes,
      edges,
      updatedAt,
      parserSamples,
      updaterSamples,
      runtimeState,
      lastRunAt,
    }),
    [
      activePathId,
      pathName,
      pathDescription,
      activeTrigger,
      nodes,
      edges,
      parserSamples,
      updaterSamples,
      runtimeState,
      lastRunAt,
    ]
  );

  const getDomSelector = (element: Element | null): string | null => {
    if (!element) return null;
    const selectorEscape = (val: string): string => {
      if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
        return CSS.escape(val);
      }
      return val.replace(/[^\w-]/g, "\\$&");
    };
    const dataSelector =
      element.getAttribute("data-component") ||
      element.getAttribute("data-testid") ||
      element.getAttribute("data-node");
    if (dataSelector) {
      const attr =
        element.getAttribute("data-component") !== null
          ? "data-component"
          : element.getAttribute("data-testid") !== null
            ? "data-testid"
            : "data-node";
      return `${element.tagName.toLowerCase()}[${attr}="${selectorEscape(dataSelector)}"]`;
    }
    if (element.id) {
      return `#${selectorEscape(element.id)}`;
    }
    const segments: string[] = [];
    let current: Element | null = element;
    while (current && current.tagName.toLowerCase() !== "html" && segments.length < 5) {
      const tagName = current.tagName.toLowerCase();
      const parent: HTMLElement | null = current.parentElement;
      if (!parent) break;
      const siblings: Element[] = Array.from(parent.children).filter(
        (child: Element): boolean => child.tagName === (current as Element).tagName
      );
      const index: number = siblings.indexOf(current) + 1;
      segments.unshift(`${tagName}:nth-of-type(${index})`);
      if (parent.id) {
        segments.unshift(`#${selectorEscape(parent.id)}`);
        break;
      }
      current = parent as Element;
    }
    return segments.length ? segments.join(" > ") : element.tagName.toLowerCase();
  };

  const getTargetInfo = (event?: React.MouseEvent): Record<string, unknown> | null => {
    const target = event?.target as Element | null;
    if (!target) return null;
    const element =
      target.closest(
        "[data-component],[data-testid],[data-node],button,a,[role='button']"
      ) ?? target;
    const rect = element.getBoundingClientRect();
    const dataset = element instanceof HTMLElement ? element.dataset : undefined;
    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id || undefined,
      className: element.getAttribute("class") || undefined,
      name: element.getAttribute("name") || undefined,
      type: element.getAttribute("type") || undefined,
      role: element.getAttribute("role") || undefined,
      ariaLabel: element.getAttribute("aria-label") || undefined,
      dataComponent: element.getAttribute("data-component") || undefined,
      dataTestId: element.getAttribute("data-testid") || undefined,
      dataNode: element.getAttribute("data-node") || undefined,
      selector: getDomSelector(element),
      boundingClientRect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
      },
      dataset: dataset ? { ...dataset } : undefined,
    };
  };

  const buildDebugSnapshot = useCallback(
    (pathId: string | null, runAt: string, state: RuntimeState): PathDebugSnapshot | null => {
      if (!pathId) return null;
      const entries = nodes
        .filter((node: AiNode): boolean => node.type === "database")
        .map((node: AiNode): PathDebugEntry | null => {
          const output = state.outputs[node.id] as
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
        .filter((entry: PathDebugEntry | null): entry is PathDebugEntry => entry !== null);
      if (entries.length === 0) return null;
      return { pathId, runAt, entries };
    },
    [nodes]
  );

  const persistDebugSnapshot = useCallback(
    async (pathId: string | null, runAt: string, state: RuntimeState): Promise<void> => {
      if (!pathId) return;
      const snapshot = buildDebugSnapshot(pathId, runAt, state);
      if (!snapshot) return;
      const payload = safeJsonStringify(snapshot);
      if (!payload) return;
      try {
        await updateSettingMutation.mutateAsync({
          key: `${PATH_DEBUG_PREFIX}${pathId}`,
          value: payload,
        });
        setPathDebugSnapshots((prev: Record<string, PathDebugSnapshot>) => ({
          ...prev,
          [pathId]: snapshot,
        }));
      } catch (error) {
        console.warn("[AI Paths] Failed to persist debug snapshot.", error);
      }
    },
    [buildDebugSnapshot, updateSettingMutation, setPathDebugSnapshots]
  );

  const buildTriggerContext = (
    triggerNode: AiNode,
    triggerEvent: string,
    event?: React.MouseEvent
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
          offsetX: "offsetX" in nativeEvent ? nativeEvent.offsetX : undefined,
          offsetY: "offsetY" in nativeEvent ? nativeEvent.offsetY : undefined,
          button: nativeEvent.button,
          buttons: nativeEvent.buttons,
          altKey: nativeEvent.altKey,
          ctrlKey: nativeEvent.ctrlKey,
          shiftKey: nativeEvent.shiftKey,
          metaKey: nativeEvent.metaKey,
        }
      : undefined;
    const targetInfo = getTargetInfo(event);
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
      user: sessionUser,
      event: {
        id: triggerEvent,
        nodeId: triggerNode.id,
        nodeTitle: triggerNode.title,
        type: event?.type,
        pointer,
        target: targetInfo,
      },
      source: {
        pathId: activePathId,
        pathName,
        tab: activeTab,
      },
      extras: {
        triggerLabel: activeTrigger,
      },
    };
  };

  const runGraphForTrigger = useCallback(async (
    triggerNode: AiNode,
    event?: React.MouseEvent,
    contextOverride?: Record<string, unknown>
  ): Promise<void> => {
    const triggerEvent =
      triggerNode.config?.trigger?.event ??
      TRIGGER_EVENTS[0]?.id ??
      "path_generate_description";
    lastTriggerNodeIdRef.current = triggerNode.id;
    const triggerContext = {
      ...buildTriggerContext(triggerNode, triggerEvent, event),
      ...(pendingSimulationContextRef.current ?? {}),
      ...(contextOverride ?? {}),
    };
    triggerContextRef.current = triggerContext;
    pendingSimulationContextRef.current = null;
    const result = await evaluateGraph({
      nodes,
      edges,
      activePathId,
      activePathName: pathName,
      triggerNodeId: triggerNode.id,
      triggerEvent,
      triggerContext,
      deferPoll: true,
      recordHistory: true,
      historyLimit: 50,
      seedHistory: runtimeStateRef.current.history ?? undefined,
      fetchEntityByType,
      reportAiPathsError,
      toast,
    });
    const runAt = new Date().toISOString();
    setRuntimeState(result);
    setLastRunAt(runAt);
    void persistDebugSnapshot(activePathId ?? null, runAt, result);
    if (activePathId) {
      setPathConfigs((prev: Record<string, PathConfig>) => ({
        ...prev,
        [activePathId]: {
          ...(prev[activePathId] ?? buildActivePathConfig(runAt)),
          runtimeState: result,
          lastRunAt: runAt,
        },
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, activePathId, pathName, fetchEntityByType, toast]);

  const runPollUpdate = useCallback(
    async (
      node: AiNode,
      options: {
        jobId?: string;
        nodeInputs: RuntimePortValues;
      }
    ): Promise<void> => {
      const fallbackJobId = options.jobId;
      const pollKey = `${node.id}:${options.jobId ?? "db"}`;
      if (pollInFlightRef.current.has(pollKey)) return;
      pollInFlightRef.current.add(pollKey);
      try {
        const pollConfig = node.config?.poll;
        const pollMode = pollConfig?.mode ?? "job";
        let pollOutput: RuntimePortValues | null = null;
        if (pollMode === "database") {
          const queryConfig: DbQueryConfig = {
            ...DEFAULT_DB_QUERY,
            ...(pollConfig?.dbQuery ?? {}),
          };
          const response = await pollDatabaseQuery(options.nodeInputs, {
            intervalMs: pollConfig?.intervalMs ?? 2000,
            maxAttempts: pollConfig?.maxAttempts ?? 30,
            dbQuery: queryConfig,
            successPath: pollConfig?.successPath ?? "status",
            successOperator: pollConfig?.successOperator ?? "equals",
            successValue: pollConfig?.successValue ?? "completed",
            resultPath: pollConfig?.resultPath ?? "result",
          });
          pollOutput = {
            result: response.result,
            status: response.status,
            bundle: response.bundle,
          };
        } else {
          const jobId = options.jobId ?? "";
          if (!jobId) {
            return;
          }
          const result = await pollGraphJob(jobId, {
            intervalMs: pollConfig?.intervalMs ?? 2000,
            maxAttempts: pollConfig?.maxAttempts ?? 30,
          });

          pollOutput = {
            result,
            status: "completed",
            jobId,
            bundle: { jobId, status: "completed", result },
          };
        }
        const resolvedJobId =
          typeof pollOutput?.jobId === "string" ? pollOutput.jobId : fallbackJobId;
        const updatedOutputs: Record<string, RuntimePortValues> = {
          ...runtimeStateRef.current.outputs,
          [node.id]: pollOutput ?? runtimeStateRef.current.outputs[node.id] ?? {},
        };
        if (resolvedJobId) {
          nodes
            .filter((item: AiNode): boolean => item.type === "model")
            .forEach((modelNode: AiNode) => {
              const modelOutput = updatedOutputs[modelNode.id] as
                | { jobId?: string; status?: string; result?: unknown; debugPayload?: unknown }
                | undefined;
              if (!modelOutput || modelOutput.jobId !== resolvedJobId) return;
              updatedOutputs[modelNode.id] = {
                ...modelOutput,
                status: pollOutput?.status ?? "completed",
                result:
                  pollOutput?.result !== undefined ? pollOutput.result : modelOutput.result,
              };
            });
        }
        setRuntimeState((prev: RuntimeState): RuntimeState => ({
          ...prev,
          outputs: updatedOutputs,
        }));
        const triggerNodeId = lastTriggerNodeIdRef.current ?? undefined;
        const seededOutputs = updatedOutputs;
        const downstreamState = await evaluateGraph({
          nodes,
          edges,
          activePathId,
          activePathName: pathName,
          ...(triggerNodeId ? { triggerNodeId } : {}),
          triggerContext: triggerContextRef.current,
          deferPoll: true,
          skipAiJobs: true,
          seedOutputs: seededOutputs,
          seedHashes: runtimeStateRef.current.hashes ?? undefined,
          seedHistory: runtimeStateRef.current.history ?? undefined,
          recordHistory: true,
          historyLimit: 50,
          fetchEntityByType,
          reportAiPathsError,
          toast,
        });
        const runAt = new Date().toISOString();
        setRuntimeState(downstreamState);
        setLastRunAt(runAt);
        void persistDebugSnapshot(activePathId ?? null, runAt, downstreamState);
        if (activePathId) {
          setPathConfigs((prev: Record<string, PathConfig>) => ({
            ...prev,
            [activePathId]: {
              ...(prev[activePathId] ?? buildActivePathConfig(runAt)),
              runtimeState: downstreamState,
              lastRunAt: runAt,
            },
          }));
        }
      } catch (error) {
        reportAiPathsError(
          error,
          { action: "pollJob", nodeId: node.id, jobId: fallbackJobId },
          "AI job polling failed:"
        );
        setRuntimeState((prev: RuntimeState): RuntimeState => ({
          ...prev,
          outputs: {
            ...prev.outputs,
            [node.id]: {
              result: null,
              status: "failed",
              jobId: fallbackJobId,
              bundle: {
                jobId: fallbackJobId,
                status: "failed",
                error: error instanceof Error ? error.message : "Polling failed",
              },
            },
          },
        }));
      } finally {
        pollInFlightRef.current.delete(pollKey);
      }
    },
    [
      nodes,
      edges,
      activePathId,
      pathName,
      fetchEntityByType,
      reportAiPathsError,
      toast,
      persistDebugSnapshot,
      buildActivePathConfig,
      setPathConfigs,
      setRuntimeState,
      setLastRunAt,
    ]
  );

  const startPendingPolls = useCallback(
    (state: RuntimeState): void => {
      nodes
        .filter((node: AiNode): boolean => node.type === "poll")
        .forEach((node: AiNode) => {
          const pollConfig = node.config?.poll;
          const output = state.outputs[node.id] as
            | { status?: string; jobId?: string }
            | undefined;
          const nodeInputs = state.inputs[node.id] ?? {};
          const inputJobId = coerceInput(nodeInputs.jobId);
          const jobId =
            output?.jobId ??
            (typeof inputJobId === "string" || typeof inputJobId === "number"
              ? String(inputJobId).trim()
              : "");
          const status = output?.status ?? "polling";
          if (status === "completed" || status === "failed") return;
          if (pollConfig?.mode !== "database" && !jobId) return;
          void runPollUpdate(node, { jobId, nodeInputs });
        });
    },
    [nodes, runPollUpdate]
  );

  useEffect((): void => {
    if (!runtimeState || nodes.length === 0) return;
    startPendingPolls(runtimeState);
  }, [nodes, runtimeState, startPendingPolls]);

  const dispatchTrigger = (eventName: string, entityId: string, entityType?: string): void => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("ai-path-trigger", {
        detail: {
          trigger: eventName,
          productId: entityId,
          entityId,
          entityType: entityType ?? "product",
        },
      })
    );
  };

  const handleRunSimulation = useCallback(
    async (simulationNode: AiNode, triggerEvent?: string): Promise<void> => {
      const entityId =
        simulationNode.config?.simulation?.entityId?.trim() ||
        simulationNode.config?.simulation?.productId?.trim();
      const entityType =
        normalizeEntityType(simulationNode.config?.simulation?.entityType) ?? "product";
      if (!entityId) {
        toast("Enter an Entity ID in the simulation node.", { variant: "error" });
        return;
      }
      const entity = await fetchEntityByType(entityType, entityId);
      const imageUrls = entity ? extractImageUrls(entity) : [];
      const simulationContext: Record<string, unknown> = {
        entityId,
        entityType,
        ...(entityType === "product" ? { productId: entityId } : {}),
        ...(imageUrls.length ? { images: imageUrls, imageUrls } : {}),
        ...(entity ? { entity } : {}),
      };
      pendingSimulationContextRef.current = simulationContext;
      let eventName = triggerEvent ?? TRIGGER_EVENTS[0]?.id ?? "path_generate_description";
      if (!triggerEvent) {
        const connectedTriggerIds = edges.flatMap((edge: Edge): string[] => {
          if (
            edge.from === simulationNode.id &&
            (!edge.fromPort || edge.fromPort === "context" || edge.fromPort === "simulation")
          ) {
            return [edge.to];
          }
          if (
            edge.to === simulationNode.id &&
            (!edge.toPort || edge.toPort === "trigger")
          ) {
            return [edge.from];
          }
          return [];
        });
        const triggerNode = nodes.find(
          (node: AiNode): boolean =>
            node.type === "trigger" && connectedTriggerIds.includes(node.id)
        );
        if (triggerNode) {
          eventName = triggerNode.config?.trigger?.event ?? eventName;
          await runGraphForTrigger(triggerNode, undefined, simulationContext);
        }
      }
      dispatchTrigger(eventName, entityId, entityType);
      if (!entity) {
        toast(`No entity found for ${entityType} ${entityId}. Using fallback context.`, {
          variant: "info",
        });
      }
      toast(`Simulated ${eventName} for ${entityType} ${entityId}`, {
        variant: "success",
      });
    },
    [edges, fetchEntityByType, nodes, runGraphForTrigger, toast]
  );

  const handleFireTrigger = (triggerNode: AiNode, event?: React.MouseEvent): void => {
    void (async (): Promise<void> => {
      const triggerEvent = triggerNode.config?.trigger?.event ?? TRIGGER_EVENTS[0]?.id;
      const isScheduled = triggerEvent === "scheduled_run";
      const connectedSimulationIds = edges.flatMap((edge: Edge): string[] => {
        if (
          edge.to === triggerNode.id &&
          (!edge.toPort || edge.toPort === "context" || edge.toPort === "simulation") &&
          (!edge.fromPort || edge.fromPort === "context" || edge.fromPort === "simulation")
        ) {
          return [edge.from];
        }
        if (
          edge.from === triggerNode.id &&
          (!edge.fromPort || edge.fromPort === "trigger") &&
          (!edge.toPort || edge.toPort === "trigger")
        ) {
          return [edge.to];
        }
        return [];
      });
      const simulationNodes = nodes.filter(
        (node: AiNode): boolean =>
          node.type === "simulation" && connectedSimulationIds.includes(node.id)
      );
      if (simulationNodes.length === 0) {
        if (!isScheduled) {
          toast("Connect a Simulation node to the Trigger context input.", {
            variant: "error",
          });
          return;
        }
        await runGraphForTrigger(triggerNode, event);
        return;
      }
      for (const node of simulationNodes) {
        await handleRunSimulation(node, triggerEvent);
      }
      await runGraphForTrigger(triggerNode, event, pendingSimulationContextRef.current ?? undefined);
    })();
  };

  const handleFireTriggerPersistent = async (
    triggerNode: AiNode,
    event?: React.MouseEvent
  ): Promise<void> => {
    const triggerEvent = triggerNode.config?.trigger?.event ?? TRIGGER_EVENTS[0]?.id;
    const isScheduled = triggerEvent === "scheduled_run";
    const connectedSimulationIds = edges.flatMap((edge: Edge): string[] => {
      if (
        edge.to === triggerNode.id &&
        (!edge.toPort || edge.toPort === "context" || edge.toPort === "simulation") &&
        (!edge.fromPort || edge.fromPort === "context" || edge.fromPort === "simulation")
      ) {
        return [edge.from];
      }
      if (
        edge.from === triggerNode.id &&
        (!edge.fromPort || edge.fromPort === "trigger") &&
        (!edge.toPort || edge.toPort === "trigger")
      ) {
        return [edge.to];
      }
      return [];
    });
    const simulationNodes = nodes.filter(
      (node: AiNode): boolean =>
        node.type === "simulation" && connectedSimulationIds.includes(node.id)
    );
    if (simulationNodes.length === 0) {
      if (!isScheduled) {
        toast("Connect a Simulation node to the Trigger context input.", {
          variant: "error",
        });
        return;
      }
      const triggerContext = buildTriggerContext(triggerNode, triggerEvent ?? "", event);
      const enqueueResult = await runsApi.enqueue({
        pathId: activePathId ?? "default",
        pathName,
        nodes,
        edges,
        ...(triggerEvent ? { triggerEvent } : {}),
        triggerNodeId: triggerNode.id,
        triggerContext,
        meta: {
          source: "ai_paths_ui",
        },
      });
      if (!enqueueResult.ok) {
        toast(enqueueResult.error || "Failed to enqueue persistent run.", {
          variant: "error",
        });
        return;
      }
      toast("Persistent run queued.", { variant: "success" });
      return;
    }
    const primarySimulation = simulationNodes[0]!;
    const entityId =
      primarySimulation.config?.simulation?.entityId?.trim() ||
      primarySimulation.config?.simulation?.productId?.trim() ||
      "";
    const entityType = primarySimulation.config?.simulation?.entityType?.trim() || "product";
    if (!entityId) {
      toast("Simulation node is missing an Entity ID.", { variant: "error" });
      return;
    }
    const triggerContext = {
      ...buildTriggerContext(triggerNode, triggerEvent ?? "", event),
      entityId,
      entityType,
    };
    const enqueueResult = await runsApi.enqueue({
      pathId: activePathId ?? "default",
      pathName,
      nodes,
      edges,
      ...(triggerEvent ? { triggerEvent } : {}),
      triggerNodeId: triggerNode.id,
      triggerContext,
      entityId,
      entityType,
      meta: {
        source: "ai_paths_ui",
      },
    });
    if (!enqueueResult.ok) {
      toast(enqueueResult.error || "Failed to enqueue persistent run.", {
        variant: "error",
      });
      return;
    }
    toast("Persistent run queued.", { variant: "success" });
  };

  const handleSendToAi = async (sourceNodeId: string, prompt: string): Promise<void> => {
    // Find the source node to determine its type
    const sourceNode = nodes.find((n: AiNode): boolean => n.id === sourceNodeId);
    if (!sourceNode) {
      toast("Source node not found.", { variant: "error" });
      return;
    }

    // Find the connected AI Model node
    // For database nodes, prefer aiPrompt port; for prompt nodes, prefer prompt port; but accept any connection to a model
    const preferredPort = sourceNode.type === "database" ? "aiPrompt" : "prompt";

    // First try to find edge with preferred port
    let aiEdge = edges.find(
      (edge: Edge): boolean => edge.from === sourceNodeId && edge.fromPort === preferredPort
    );

    // If not found, find any edge that connects to a model node
    if (!aiEdge) {
      aiEdge = edges.find((edge: Edge): boolean => {
        if (edge.from !== sourceNodeId) return false;
        const targetNode = nodes.find((n: AiNode): boolean => n.id === edge.to);
        return targetNode?.type === "model";
      });
    }

    if (!aiEdge) {
      toast("No AI Model connected.", { variant: "error" });
      return;
    }
    const aiNode = nodes.find((n: AiNode): boolean => n.id === aiEdge.to && n.type === "model");
    if (!aiNode) {
      toast("Connected node is not an AI Model.", { variant: "error" });
      return;
    }
    const modelConfig = aiNode.config?.model ?? {
      modelId: "gpt-4o",
      temperature: 0.7,
      maxTokens: 800,
      vision: false,
    };
    setSendingToAi(true);
    try {
      const payload = {
        prompt: prompt.trim(),
        imageUrls: [],
        modelId: modelConfig.modelId,
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
        vision: modelConfig.vision,
        source: "ai_paths_direct",
        graph: {
          pathId: activePathId ?? undefined,
          nodeId: aiNode.id,
          nodeTitle: aiNode.title,
        },
      };
      const enqueueData = (await enqueueAiJobMutation.mutateAsync({
        productId: activePathId ?? "direct",
        type: "graph_model",
        payload,
      })) as { jobId: string };
      toast("AI job queued. Waiting for result...", { variant: "success" });
      const result = await pollGraphJob(enqueueData.jobId);
      // Update runtime state with the result
      setRuntimeState((prev: RuntimeState): RuntimeState => {
        const sourceInputs = prev.inputs[sourceNodeId] ?? {};
        const sourceOutputs = prev.outputs[sourceNodeId] ?? {};
        const aiOutputs = prev.outputs[aiNode.id] ?? {};

        // For database nodes, store result in queryCallback (both input and output)
        // For prompt nodes, store result in the result input (so it shows in the Result Input field)
        const updatedSourceOutputs =
          sourceNode.type === "database" ? { ...sourceOutputs, queryCallback: result } : sourceOutputs;

        const updatedSourceInputs =
          sourceNode.type === "database"
            ? { ...sourceInputs, queryCallback: result }
            : sourceNode.type === "prompt"
              ? { ...sourceInputs, result }
              : sourceInputs;

        return {
          ...prev,
          inputs: {
            ...prev.inputs,
            [sourceNodeId]: updatedSourceInputs,
          },
          outputs: {
            ...prev.outputs,
            [sourceNodeId]: updatedSourceOutputs,
            [aiNode.id]: {
              ...aiOutputs,
              result,
              jobId: enqueueData.jobId,
              status: "completed",
            },
          },
        };
      });
      toast("AI response received.", { variant: "success" });
    } catch (error) {
      reportAiPathsError(
        error,
        { action: "sendToAi", nodeId: sourceNodeId },
        "Send to AI failed:"
      );
      toast("Send to AI failed.", { variant: "error" });
    } finally {
      setSendingToAi(false);
    }
  };

  return {
    handleRunSimulation,
    handleFireTrigger,
    handleFireTriggerPersistent,
    handleSendToAi,
    sendingToAi,
  };
}
