import {
  appendInputValue,
  cloneValue,
  coerceInput,
  hashRuntimeValue,
  sanitizeEdges,
  getPortDataTypes,
  isValueCompatibleWithTypes,
} from "../utils";
import { extractImageUrls } from "./utils";
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
  handleAgent,
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
  handleRegex,
  handleIterator,
  handleRouter,
  handleLearnerAgent,
  handleTemplate,
  handleTrigger,
  handleValidator,
  handleViewer,
} from "./handlers";

type ToastFn = (message: string, options?: Partial<{ variant: "success" | "error" | "info"; duration: number }>) => void;

export class GraphExecutionError extends Error {
  state: RuntimeState;
  nodeId?: string | null;

  constructor(message: string, state: RuntimeState, nodeId?: string | null, cause?: unknown) {
    super(message);
    this.name = "GraphExecutionError";
    this.state = state;
    this.nodeId = nodeId ?? null;
    if (cause && typeof (this as { cause?: unknown }).cause === "undefined") {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

export type EvaluateGraphOptions = {
  nodes: AiNode[];
  edges: Edge[];
  activePathId: string | null;
  activePathName?: string | null | undefined;
  triggerNodeId?: string | undefined;
  triggerEvent?: string | undefined;
  triggerContext?: Record<string, unknown> | null | undefined;
  deferPoll?: boolean | undefined;
  skipAiJobs?: boolean | undefined;
  seedOutputs?: Record<string, RuntimePortValues> | undefined;
  seedHashes?: Record<string, string> | undefined;
  seedHistory?: Record<string, RuntimeHistoryEntry[]> | undefined;
  recordHistory?: boolean | undefined;
  historyLimit?: number | undefined;
  skipNodeIds?: Set<string> | string[] | undefined;
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
    hashes?: Record<string, string> | undefined;
    history?: Record<string, RuntimeHistoryEntry[]> | undefined;
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
const DEFAULT_NODE_TIMEOUT_MS = Math.max(5_000, Number.parseInt(process.env.AI_PATHS_NODE_TIMEOUT_MS ?? "", 10) || 120_000);
const DEFAULT_RETRY_BACKOFF_MS = Math.max(250, Number.parseInt(process.env.AI_PATHS_NODE_RETRY_BACKOFF_MS ?? "", 10) || 750);

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve: (value: void | PromiseLike<void>) => void) => setTimeout(resolve, ms));

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;
  let timer: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_resolve: (value: PromiseLike<never>) => void, reject: (reason?: unknown) => void) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const withRetries = async <T>(
  task: () => Promise<T>,
  attempts: number,
  backoffMs: number,
  label: string
): Promise<T> => {
  let lastError: unknown = null;
  const maxAttempts = Math.max(1, attempts);
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts) break;
      const delay = backoffMs * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${label} failed after ${maxAttempts} attempt(s)`);
};

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
  regex: handleRegex,
  iterator: handleIterator,
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
  agent: handleAgent,
  learner_agent: handleLearnerAgent,
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
  const sanitizedEdges = sanitizeEdges(nodes, edges);
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
  sanitizedEdges.forEach((edge: Edge) => {
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
      ? (triggerContext).source
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
    sanitizedEdges.forEach((edge: Edge) => {
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

  const normalizeEntityType = (value?: string | null): string | null => {
    const normalized = value?.trim().toLowerCase();
    if (!normalized) return null;
    if (normalized === "product" || normalized === "products") return "product";
    if (normalized === "note" || normalized === "notes") return "note";
    return normalized;
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
      ? normalizeEntityType(triggerContext?.entityType)
      : null;

  if (triggerNodeId) {
    const simulationEdge = sanitizedEdges.find(
      (edge: Edge) => edge.to === triggerNodeId && edge.toPort === "context"
    );
    if (simulationEdge) {
      const simNode = nodes.find(
        (node: AiNode) => node.id === simulationEdge.from && node.type === "simulation"
      );
      simulationEntityType =
        normalizeEntityType(simNode?.config?.simulation?.entityType) ?? "product";
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

  const deriveDatabaseInputs = (
    rawInputs: RuntimePortValues
  ): RuntimePortValues => {
    const next: RuntimePortValues = { ...rawInputs };
    const pickString = (value: unknown): string | undefined => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed ? trimmed : undefined;
      }
      if (typeof value === "number") {
        return String(value);
      }
      return undefined;
    };
    const applyRecord = (value: unknown): void => {
      if (!value || typeof value !== "object") return;
      const record = value as Record<string, unknown>;
      if (!pickString(next.entityId)) {
        const resolvedEntityId =
          pickString(record.entityId) ??
          pickString(record.productId) ??
          pickString(record.id) ??
          pickString(record._id);
        if (resolvedEntityId) {
          next.entityId = resolvedEntityId;
        }
      }
      if (!pickString(next.productId)) {
        const resolvedProductId =
          pickString(record.productId) ??
          pickString(record.entityId) ??
          pickString(record.id) ??
          pickString(record._id);
        if (resolvedProductId) {
          next.productId = resolvedProductId;
        }
      }
      if (!pickString(next.entityType)) {
        const resolvedEntityType = pickString(record.entityType);
        if (resolvedEntityType) {
          next.entityType = resolvedEntityType;
        }
      }
    };

    applyRecord(coerceInput(next.context));
    applyRecord(coerceInput(next.meta));
    applyRecord(coerceInput(next.bundle));

    if (!pickString(next.entityId)) {
      next.entityId =
        pickString(triggerContext?.entityId) ??
        pickString(triggerContext?.productId) ??
        fallbackEntityId ??
        undefined;
    }
    if (!pickString(next.productId)) {
      next.productId =
        pickString(triggerContext?.productId) ??
        pickString(triggerContext?.entityId) ??
        pickString(next.entityId) ??
        undefined;
    }
    if (!pickString(next.entityType)) {
      next.entityType =
        pickString(triggerContext?.entityType) ??
        simulationEntityType ??
        undefined;
    }

    if (!pickString(next.entityId) || !pickString(next.productId) || !pickString(next.entityType)) {
      for (const [nodeId, output] of Object.entries(outputs)) {
        if (!output || typeof output !== "object") continue;
        const nodeType = nodeById.get(nodeId)?.type;
        if (nodeType !== "trigger" && nodeType !== "simulation" && nodeType !== "context") {
          continue;
        }
        applyRecord(output as Record<string, unknown>);
        if (pickString(next.entityId) && pickString(next.productId) && pickString(next.entityType)) {
          break;
        }
      }
    }

    const resolvedEntityId = pickString(next.entityId);
    const resolvedEntityType = pickString(next.entityType);

    if (!resolvedEntityId && resolvedEntity && typeof resolvedEntity === "object") {
      const fallbackId =
        pickString(resolvedEntity.id) ??
        pickString(resolvedEntity._id);
      if (fallbackId) {
        next.entityId = fallbackId;
      }
    }
    if (!pickString(next.productId) && pickString(next.entityId)) {
      next.productId = pickString(next.entityId);
    }
    if (!resolvedEntityType && simulationEntityType) {
      next.entityType = simulationEntityType;
    }
    return next;
  };

  // Pre-calculate simulation nodes
  for (const node of nodes) {
    if (node.type !== "simulation" && !isActiveNode(node)) {
      continue;
    }
    if (node.type === "simulation") {
      const entityType =
        normalizeEntityType(node.config?.simulation?.entityType) || "product";
      const entityId =
        node.config?.simulation?.entityId?.trim() ||
        node.config?.simulation?.productId?.trim() ||
        null;
      const entity =
        entityId && entityType ? await fetchEntityCached(entityType, entityId) : null;
      const contextPayload: Record<string, unknown> = {
        entityType,
        entityId,
        source: node.title,
        timestamp: now,
      };
      if (entityId && !entity) {
        const maybeUuid = entityId.includes("-");
        const hint =
          maybeUuid && entityId.length !== 36
            ? ` (id looks like a UUID but length is ${entityId.length}; expected 36)`
            : "";
        contextPayload.error = `Entity not found: ${entityType} ${entityId}${hint}`;
      }
      if (entity) {
        const imageUrls = extractImageUrls(entity);
        if (imageUrls.length) {
          contextPayload.images = imageUrls;
          contextPayload.imageUrls = imageUrls;
        }
        contextPayload.entity = entity;
        contextPayload.entityJson = entity;
        if (entityType === "product") {
          contextPayload.product = entity;
        }
      }
      outputs[node.id] = {
        context: contextPayload,
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
    sanitizedEdges.forEach((edge: Edge) => {
      const fromOutput = outputs[edge.from];
      if (!fromOutput || !edge.fromPort || !edge.toPort) return;
      const value = fromOutput[edge.fromPort];
      if (value === undefined) return;
      const expectedTypes = getPortDataTypes(edge.toPort);
      if (!isValueCompatibleWithTypes(value, expectedTypes)) return;
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

      let nodeInputs = nextInputs[node.id] ?? {};
      if (node.type === "database") {
        nodeInputs = deriveDatabaseInputs(nodeInputs);
        nextInputs[node.id] = nodeInputs;
      }
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
          const timeoutMs = node.config?.runtime?.timeoutMs ?? DEFAULT_NODE_TIMEOUT_MS;
          const retryAttempts = node.config?.runtime?.retry?.attempts ?? 1;
          const retryBackoffMs = node.config?.runtime?.retry?.backoffMs ?? DEFAULT_RETRY_BACKOFF_MS;
          const result = await withRetries(
            () =>
              withTimeout(
                Promise.resolve(
                  handler({
                    node,
                    nodeInputs,
                    prevOutputs,
                    edges: sanitizedEdges,
                    nodes,
                    nodeById,
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
                  })
                ),
                timeoutMs,
                `${node.type}:${node.id}`
              ),
            retryAttempts,
            retryBackoffMs,
            `${node.type}:${node.id}`
          );
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
          const historySnapshot =
            recordHistory && history.size
              ? (cloneValue(Object.fromEntries(history)) as Record<string, RuntimeHistoryEntry[]>)
              : undefined;
          const errorState: RuntimeState = {
            inputs: cloneValue(nextInputs) as Record<string, RuntimePortValues>,
            outputs: cloneValue(outputs) as Record<string, RuntimePortValues>,
            hashes: inputHashes.size ? Object.fromEntries(inputHashes) : undefined,
            history: historySnapshot,
          };
          const message = error instanceof Error ? error.message : String(error);
          throw new GraphExecutionError(message, errorState, node.id, error);
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

const getIteratorMaxSteps = (nodes: AiNode[]): number => {
  const candidates = nodes
    .filter((node: AiNode): boolean => node.type === "iterator")
    .map((node: AiNode) => node.config?.iterator?.maxSteps)
    .filter((value: number | undefined): value is number => typeof value === "number" && Number.isFinite(value) && value > 0);
  return candidates.length > 0 ? Math.min(...candidates) : 50;
};

const hasPendingIteratorAdvance = (nodes: AiNode[], state: RuntimeState): boolean =>
  nodes.some((node: AiNode): boolean => {
    if (node.type !== "iterator") return false;
    if (node.config?.iterator?.autoContinue === false) return false;
    const status = state.outputs[node.id]?.status;
    return status === "advance_pending";
  });

/**
 * Iterator nodes are intentionally non-cacheable and "step" only once per evaluateGraph call,
 * because downstream side-effect nodes (AI/jobs/http/etc) are guarded by `executed.*` sets.
 *
 * This helper re-runs evaluateGraph (seeding the previous outputs/hashes/history) until all
 * iterator nodes have either completed or are waiting for a callback.
 */
export async function evaluateGraphWithIteratorAutoContinue(options: EvaluateGraphOptions): Promise<RuntimeState> {
  let current = await evaluateGraph(options);
  if (!options.nodes.some((node: AiNode): boolean => node.type === "iterator")) {
    return current;
  }

  const maxSteps = getIteratorMaxSteps(options.nodes);
  for (let step = 0; step < maxSteps; step += 1) {
    if (!hasPendingIteratorAdvance(options.nodes, current)) break;
    current = await evaluateGraph({
      ...options,
      seedOutputs: current.outputs,
      seedHashes: current.hashes ?? undefined,
      seedHistory: current.history ?? undefined,
    });
  }
  return current;
}
