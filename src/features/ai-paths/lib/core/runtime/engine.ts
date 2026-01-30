import { appendInputValue, cloneValue, hashRuntimeValue } from "../utils";
import { CACHEABLE_NODE_TYPE_SET } from "../constants";
import type {
  AiNode,
  Edge,
  RuntimeHistoryEntry,
  RuntimeHistoryLink,
  RuntimePortValues,
  RuntimeState,
} from "@/shared/types/ai-paths";
import {
  NodeHandler,
  handleAiDescription,
  handleBundle,
  handleCompare,
  handleConstant,
  handleContext,
  handleDatabase,
  handleDbSchema,
  handleDelay,
  handleDescriptionUpdater,
  handleGate,
  handleHttp,
  handleMapper,
  handleMath,
  handleModel,
  handleMutator,
  handleNotification,
  handleParser,
  handlePoll,
  handlePrompt,
  handleRouter,
  handleTemplate,
  handleTrigger,
  handleValidator,
  handleViewer,
} from "./handlers";

type ToastFn = (message: string, options?: { variant?: "success" | "error" }) => void;

export type EvaluateGraphOptions = {
  nodes: AiNode[];
  edges: Edge[];
  activePathId: string | null;
  activePathName?: string | null;
  triggerNodeId?: string;
  triggerEvent?: string;
  triggerContext?: Record<string, unknown> | null;
  deferPoll?: boolean;
  skipAiJobs?: boolean;
  seedOutputs?: Record<string, RuntimePortValues>;
  seedHashes?: Record<string, string>;
  seedHistory?: Record<string, RuntimeHistoryEntry[]>;
  recordHistory?: boolean;
  historyLimit?: number;
  skipNodeIds?: Set<string> | string[];
  onNodeStart?: (payload: {
    node: AiNode;
    nodeInputs: RuntimePortValues;
    prevOutputs: RuntimePortValues;
    iteration: number;
  }) => void | Promise<void>;
  onNodeFinish?: (payload: {
    node: AiNode;
    nodeInputs: RuntimePortValues;
    prevOutputs: RuntimePortValues;
    nextOutputs: RuntimePortValues;
    changed: boolean;
    iteration: number;
    cached?: boolean;
  }) => void | Promise<void>;
  onNodeError?: (payload: {
    node: AiNode;
    nodeInputs: RuntimePortValues;
    prevOutputs: RuntimePortValues;
    error: unknown;
    iteration: number;
  }) => void | Promise<void>;
  onIterationEnd?: (payload: {
    iteration: number;
    inputs: Record<string, RuntimePortValues>;
    outputs: Record<string, RuntimePortValues>;
    hashes?: Record<string, string>;
    history?: Record<string, RuntimeHistoryEntry[]>;
  }) => void | Promise<void>;
  fetchEntityByType: (
    entityType: string,
    entityId: string
  ) => Promise<Record<string, unknown> | null>;
  reportAiPathsError: (
    error: unknown,
    meta: Record<string, unknown>,
    summary?: string
  ) => void;
  toast: ToastFn;
};

const CACHE_VERSION = 1;

const buildNodeInputHash = (
  node: AiNode,
  nodeInputs: RuntimePortValues
): string =>
  hashRuntimeValue({
    v: CACHE_VERSION,
    id: node.id,
    type: node.type,
    title: node.title ?? null,
    config: node.config ?? null,
    inputs: nodeInputs,
    inputPorts: node.inputs ?? [],
    outputPorts: node.outputs ?? [],
  });

const HANDLERS: Record<string, NodeHandler> = {
  trigger: handleTrigger,
  notification: handleNotification,
  context: handleContext,
  parser: handleParser,
  mapper: handleMapper,
  mutator: handleMutator,
  validator: handleValidator,
  constant: handleConstant,
  math: handleMath,
  compare: handleCompare,
  router: handleRouter,
  delay: handleDelay,
  poll: handlePoll,
  http: handleHttp,
  database: handleDatabase,
  db_schema: handleDbSchema,
  gate: handleGate,
  bundle: handleBundle,
  template: handleTemplate,
  prompt: handlePrompt,
  model: handleModel,
  ai_description: handleAiDescription,
  description_updater: handleDescriptionUpdater,
  viewer: handleViewer,
  // simulation handled separately or via no-op if loop reaches it
};

export async function evaluateGraph({
  nodes,
  edges,
  activePathId,
  activePathName,
  triggerNodeId,
  triggerEvent,
  triggerContext,
  deferPoll,
  skipAiJobs,
  seedOutputs,
  seedHashes,
  seedHistory,
  recordHistory,
  historyLimit,
  skipNodeIds,
  onNodeStart,
  onNodeFinish,
  onNodeError,
  onIterationEnd,
  fetchEntityByType,
  reportAiPathsError,
  toast,
}: EvaluateGraphOptions): Promise<RuntimeState> {
  const outputs: Record<string, RuntimePortValues> = seedOutputs
    ? Object.fromEntries(
        Object.entries(seedOutputs).map(([key, value]: [string, RuntimePortValues]) => [key, cloneValue(value)])
      )
    : {};
  let inputs: Record<string, RuntimePortValues> = {};
  const inputHashes = new Map<string, string>(
    seedHashes ? Object.entries(seedHashes) : []
  );
  const historyMax = Math.max(1, historyLimit ?? 50);
  const history = new Map<string, RuntimeHistoryEntry[]>(
    seedHistory
      ? Object.entries(seedHistory).map(([key, value]: [string, RuntimeHistoryEntry[]]) => [
          key,
          Array.isArray(value) ? value.slice() : [],
        ])
      : []
  );
  const now = new Date().toISOString();
  const entityCache = new Map<string, Record<string, unknown> | null>();
  const activeNodeIds = new Set<string>();
  const nodeById = new Map(nodes.map((node: AiNode): [string, AiNode] => [node.id, node]));
  const incomingEdgesByNode = new Map<string, Edge[]>();
  const outgoingEdgesByNode = new Map<string, Edge[]>();
  edges.forEach((edge: Edge) => {
    if (!edge.from || !edge.to) return;
    const incoming = incomingEdgesByNode.get(edge.to) ?? [];
    incoming.push(edge);
    incomingEdgesByNode.set(edge.to, incoming);
    const outgoing = outgoingEdgesByNode.get(edge.from) ?? [];
    outgoing.push(edge);
    outgoingEdgesByNode.set(edge.from, outgoing);
  });
  const triggerSource =
    triggerContext && typeof triggerContext === "object"
      ? (triggerContext as Record<string, unknown>).source
      : null;
  const resolvedPathId =
    activePathId ??
    (triggerSource && typeof triggerSource === "object"
      ? ((triggerSource as Record<string, unknown>).pathId as string | undefined)
      : undefined) ??
    null;
  const resolvedPathName =
    activePathName ??
    (triggerSource && typeof triggerSource === "object"
      ? ((triggerSource as Record<string, unknown>).pathName as string | undefined)
      : undefined);

  const buildInputLinks = (
    nodeId: string,
    nodeInputs: RuntimePortValues
  ): RuntimeHistoryLink[] => {
    const incoming = incomingEdgesByNode.get(nodeId) ?? [];
    const hasInputs = Object.keys(nodeInputs).length > 0;
    return incoming
      .map((edge: Edge): RuntimeHistoryLink | null => {
        const toPort = edge.toPort ?? null;
        const isPresent = toPort ? nodeInputs[toPort] !== undefined : hasInputs;
        if (!isPresent) return null;
        const fromNode = nodeById.get(edge.from);
        return {
          nodeId: edge.from,
          nodeType: fromNode?.type ?? null,
          nodeTitle: fromNode?.title ?? null,
          fromPort: edge.fromPort ?? null,
          toPort,
        };
      })
      .filter((link: RuntimeHistoryLink | null): link is RuntimeHistoryLink => Boolean(link));
  };

  const buildOutputLinks = (
    nodeId: string,
    nodeOutputs: RuntimePortValues
  ): RuntimeHistoryLink[] => {
    const outgoing = outgoingEdgesByNode.get(nodeId) ?? [];
    const hasOutputs = Object.keys(nodeOutputs).length > 0;
    return outgoing
      .map((edge: Edge): RuntimeHistoryLink | null => {
        const fromPort = edge.fromPort ?? null;
        const isPresent = fromPort ? nodeOutputs[fromPort] !== undefined : hasOutputs;
        if (!isPresent) return null;
        const toNode = nodeById.get(edge.to);
        return {
          nodeId: edge.to,
          nodeType: toNode?.type ?? null,
          nodeTitle: toNode?.title ?? null,
          fromPort,
          toPort: edge.toPort ?? null,
        };
      })
      .filter((link: RuntimeHistoryLink | null): link is RuntimeHistoryLink => Boolean(link));
  };

  const pushHistoryEntry = (nodeId: string, entry: RuntimeHistoryEntry): void => {
    if (!recordHistory) return;
    const existing = history.get(nodeId) ?? [];
    existing.push(entry);
    if (existing.length > historyMax) {
      existing.splice(0, existing.length - historyMax);
    }
    history.set(nodeId, existing);
  };

  if (triggerNodeId) {
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
    const queue = [triggerNodeId];
    activeNodeIds.add(triggerNodeId);
    while (queue.length) {
      const current = queue.shift();
      if (!current) continue;
      const neighbors = adjacency.get(current);
      if (!neighbors) continue;
      neighbors.forEach((neighbor: string) => {
        if (activeNodeIds.has(neighbor)) return;
        activeNodeIds.add(neighbor);
        queue.push(neighbor);
      });
    }
  }
  const alwaysActiveTypes = new Set(["parser", "prompt", "viewer", "database"]);
  const isActiveNode = (node: AiNode): boolean =>
    !triggerNodeId ||
    activeNodeIds.has(node.id) ||
    alwaysActiveTypes.has(node.type);
  const skipNodeSet = skipNodeIds
    ? new Set(Array.isArray(skipNodeIds) ? skipNodeIds : Array.from(skipNodeIds))
    : null;

  const fetchEntityCached = async (entityType: string, entityId: string): Promise<Record<string, unknown> | null> => {
    if (!entityType || !entityId) return null;
    const key = `${entityType}:${entityId}`;
    if (entityCache.has(key)) return entityCache.get(key) ?? null;
    const data = await fetchEntityByType(entityType, entityId);
    entityCache.set(key, data);
    return data;
  };

  let simulationEntityId: string | null = null;
  let simulationEntityType: string | null = null;
  const triggerEntityId =
    typeof triggerContext?.entityId === "string"
      ? triggerContext?.entityId
      : typeof triggerContext?.productId === "string"
        ? triggerContext?.productId
        : null;
  const triggerEntityType =
    typeof triggerContext?.entityType === "string"
      ? triggerContext?.entityType
      : null;

  if (triggerNodeId) {
    const simulationEdge = edges.find(
      (edge: Edge) => edge.to === triggerNodeId && edge.toPort === "simulation"
    );
    if (simulationEdge) {
      const simNode = nodes.find(
        (node: AiNode) => node.id === simulationEdge.from && node.type === "simulation"
      );
      simulationEntityType =
        simNode?.config?.simulation?.entityType?.trim() ?? "product";
      simulationEntityId =
        simNode?.config?.simulation?.entityId?.trim() ||
        simNode?.config?.simulation?.productId?.trim() ||
        null;
    }
  }

  const resolvedEntity =
    simulationEntityId && simulationEntityType
      ? await fetchEntityCached(simulationEntityType, simulationEntityId)
      : triggerEntityId && triggerEntityType
        ? await fetchEntityCached(triggerEntityType, triggerEntityId)
        : null;
  const fallbackEntityId = simulationEntityId ?? triggerEntityId ?? null;

  // Pre-calculate simulation nodes
  for (const node of nodes) {
    if (!isActiveNode(node)) {
      continue;
    }
    if (node.type === "simulation") {
      const entityType =
        node.config?.simulation?.entityType?.trim() || "product";
      const entityId =
        node.config?.simulation?.entityId?.trim() ||
        node.config?.simulation?.productId?.trim() ||
        null;
      const entity =
        entityId && entityType ? await fetchEntityCached(entityType, entityId) : null;
      outputs[node.id] = {
        simulation: {
          entityType,
          entityId,
          source: node.title,
          timestamp: now,
          entity,
        },
        entityId,
        entityType,
        productId: entityType === "product" ? entityId : undefined,
      };
    }
  }

  const maxIterations = Math.max(2, nodes.length + 2);
  const executed = {
    notification: new Set<string>(),
    updater: new Set<string>(),
    http: new Set<string>(),
    delay: new Set<string>(),
    poll: new Set<string>(),
    ai: new Set<string>(),
    schema: new Set<string>(),
  };

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const nextInputs: Record<string, RuntimePortValues> = {};
    edges.forEach((edge: Edge) => {
      const fromOutput = outputs[edge.from];
      if (!fromOutput || !edge.fromPort || !edge.toPort) return;
      const value = fromOutput[edge.fromPort];
      if (value === undefined) return;
      const existing = nextInputs[edge.to]?.[edge.toPort];
      const mergedValue = appendInputValue(existing, value);
      nextInputs[edge.to] = {
        ...(nextInputs[edge.to] ?? {}),
        [edge.toPort]: mergedValue,
      };
    });

    let changed = false;
    for (const node of nodes) {
      if (!isActiveNode(node)) {
        continue;
      }
      if (node.type === "simulation") continue; // Already handled

      const nodeInputs = nextInputs[node.id] ?? {};
      const prevOutputs = outputs[node.id] ?? {};
      let nextOutputs: RuntimePortValues = prevOutputs;

      if (skipNodeSet?.has(node.id)) {
        if (!outputs[node.id]) {
          outputs[node.id] = prevOutputs;
        }
        continue;
      }

      const cacheMode = node.config?.runtime?.cache?.mode ?? "auto";
      const isCacheable =
        cacheMode === "force"
          ? true
          : cacheMode === "disabled"
            ? false
            : CACHEABLE_NODE_TYPE_SET.has(node.type);
      if (!isCacheable && inputHashes.has(node.id)) {
        inputHashes.delete(node.id);
      }
      const inputHash = isCacheable ? buildNodeInputHash(node, nodeInputs) : null;
      const hasCachedOutput =
        isCacheable &&
        inputHash !== null &&
        inputHashes.get(node.id) === inputHash &&
        outputs[node.id] !== undefined;

      if (hasCachedOutput) {
        if (recordHistory) {
          const entry: RuntimeHistoryEntry = {
            timestamp: new Date().toISOString(),
            pathId: resolvedPathId ?? null,
            pathName: resolvedPathName ?? null,
            nodeId: node.id,
            nodeType: node.type,
            nodeTitle: node.title ?? null,
            status: "cached",
            iteration,
            inputs: cloneValue(nodeInputs),
            outputs: cloneValue(prevOutputs),
            inputsFrom: buildInputLinks(node.id, nodeInputs),
            outputsTo: buildOutputLinks(node.id, prevOutputs),
            delayMs: node.type === "delay" ? (node.config?.delay?.ms ?? 300) : null,
          };
          pushHistoryEntry(node.id, entry);
        }
        if (onNodeFinish) {
          await onNodeFinish({
            node,
            nodeInputs,
            prevOutputs,
            nextOutputs: prevOutputs,
            changed: false,
            iteration,
            cached: true,
          });
        }
        continue;
      }

      const handler = HANDLERS[node.type];
      if (handler) {
        if (onNodeStart) {
          await onNodeStart({ node, nodeInputs, prevOutputs, iteration });
        }
        try {
          const result = await handler({
            node,
            nodeInputs,
            prevOutputs,
            edges,
            nodes,
            activePathId,
            triggerNodeId,
            triggerEvent,
            triggerContext,
            deferPoll,
            skipAiJobs,
            now,
            allOutputs: outputs,
            allInputs: nextInputs,
            fetchEntityCached,
            reportAiPathsError,
            toast,
            simulationEntityType,
            simulationEntityId,
            resolvedEntity,
            fallbackEntityId,
            executed,
          });
          nextOutputs = result;
        } catch (error) {
          if (recordHistory) {
            const entry: RuntimeHistoryEntry = {
              timestamp: new Date().toISOString(),
              pathId: resolvedPathId ?? null,
              pathName: resolvedPathName ?? null,
              nodeId: node.id,
              nodeType: node.type,
              nodeTitle: node.title ?? null,
              status: "failed",
              iteration,
              inputs: cloneValue(nodeInputs),
              outputs: cloneValue(prevOutputs),
              error: error instanceof Error ? error.message : String(error),
              inputsFrom: buildInputLinks(node.id, nodeInputs),
              outputsTo: buildOutputLinks(node.id, prevOutputs),
              delayMs: node.type === "delay" ? (node.config?.delay?.ms ?? 300) : null,
            };
            pushHistoryEntry(node.id, entry);
          }
          if (onNodeError) {
            await onNodeError({ node, nodeInputs, prevOutputs, error, iteration });
          }
          throw error;
        }
      } else {
        // Default behavior for unknown nodes or if no outputs changed
        if (!outputs[node.id]) {
          nextOutputs = prevOutputs;
        }
      }

      if (recordHistory) {
        const entry: RuntimeHistoryEntry = {
          timestamp: new Date().toISOString(),
          pathId: resolvedPathId ?? null,
          pathName: resolvedPathName ?? null,
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle: node.title ?? null,
          status: node.type === "delay" ? "delayed" : "completed",
          iteration,
          inputs: cloneValue(nodeInputs),
          outputs: cloneValue(nextOutputs),
          inputsFrom: buildInputLinks(node.id, nodeInputs),
          outputsTo: buildOutputLinks(node.id, nextOutputs),
          delayMs: node.type === "delay" ? (node.config?.delay?.ms ?? 300) : null,
        };
        pushHistoryEntry(node.id, entry);
      }
      if (isCacheable && inputHash) {
        inputHashes.set(node.id, inputHash);
      }
      const didChange = JSON.stringify(prevOutputs) !== JSON.stringify(nextOutputs);
      if (didChange) {
        outputs[node.id] = nextOutputs;
        changed = true;
      }
      if (handler && onNodeFinish) {
        await onNodeFinish({
          node,
          nodeInputs,
          prevOutputs,
          nextOutputs,
          changed: didChange,
          iteration,
        });
      }
    }

    inputs = nextInputs;
    if (onIterationEnd) {
      await onIterationEnd({
        iteration,
        inputs,
        outputs,
        hashes: inputHashes.size ? Object.fromEntries(inputHashes) : undefined,
        history:
          recordHistory && history.size ? Object.fromEntries(history) : undefined,
      });
    }
    if (!changed) break;
  }

  return {
    inputs,
    outputs,
    hashes: inputHashes.size ? Object.fromEntries(inputHashes) : undefined,
    history: recordHistory && history.size ? Object.fromEntries(history) : undefined,
  };
}
