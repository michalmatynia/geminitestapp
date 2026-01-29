import "server-only";

import type {
  AiNode,
  AiPathRunRecord,
  Edge,
  RuntimePortValues,
  RuntimeState,
} from "@/shared/types/ai-paths";
import { evaluateGraph, normalizeNodes, sanitizeEdges } from "@/features/ai-paths/lib";
import { getPathRunRepository } from "@/features/ai-paths/services/path-run-repository";
import { ErrorSystem } from "@/features/observability/services/error-system";
import { getProductRepository } from "@/features/products/services/product-repository";
import { noteService } from "@/features/notesapp/server";

const parseRuntimeState = (value: unknown): RuntimeState => {
  if (!value) return { inputs: {}, outputs: {} };
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as RuntimeState;
      return parsed && typeof parsed === "object" ? parsed : { inputs: {}, outputs: {} };
    } catch {
      return { inputs: {}, outputs: {} };
    }
  }
  if (typeof value === "object") {
    return value as RuntimeState;
  }
  return { inputs: {}, outputs: {} };
};

const toJsonSafe = (value: unknown): unknown => {
  const seen = new WeakSet();
  const replacer = (_key: string, val: unknown) => {
    if (typeof val === "bigint") return val.toString();
    if (val instanceof Date) return val.toISOString();
    if (val instanceof Set) return Array.from(val.values()) as unknown[];
    if (val instanceof Map) return Object.fromEntries(val.entries()) as Record<string, unknown>;
    if (typeof val === "function" || typeof val === "symbol") return undefined;
          if (val && typeof val === "object") {
            if (seen.has(val)) return undefined;
            seen.add(val);
          }
    
    return val;
  };
  try {
    return JSON.parse(JSON.stringify(value, replacer)) as unknown;
  } catch {
    return null;
  }
};

const sanitizeRuntimeState = (state: RuntimeState): RuntimeState => {
  const safe = toJsonSafe(state);
  if (safe && typeof safe === "object") {
    return safe as RuntimeState;
  }
  return { inputs: {}, outputs: {} };
};

const computeDownstreamNodes = (
  edges: Edge[],
  startNodes: Set<string>
): Set<string> => {
  const adjacency = new Map<string, Set<string>>();
  edges.forEach((edge: Edge) => {
    if (!edge.from || !edge.to) return;
    const set = adjacency.get(edge.from) ?? new Set<string>();
    set.add(edge.to);
    adjacency.set(edge.from, set);
  });
  const queue = Array.from(startNodes);
  const visited = new Set<string>(startNodes);
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const next = adjacency.get(current);
    if (!next) continue;
    next.forEach((nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      queue.push(nodeId);
    });
  }
  return visited;
};

const resolveTriggerNodeId = (
  nodes: AiNode[],
  edges: Edge[],
  triggerEvent?: string | null,
  explicit?: string | null
): string | undefined => {
  if (explicit && nodes.some((node: AiNode) => node.id === explicit)) return explicit;
  const triggerNodes = nodes.filter((node: AiNode) => node.type === "trigger");
  if (triggerNodes.length === 0) return undefined;
  const matching = triggerEvent
    ? triggerNodes.filter(
        (node: AiNode) => (node.config?.trigger?.event ?? "").trim() === triggerEvent
      )
    : triggerNodes;
  const candidates = matching.length > 0 ? matching : triggerNodes;
  const connected = candidates.find((node: AiNode) =>
    edges.some((edge: Edge) => edge.from === node.id || edge.to === node.id)
  );
  return connected?.id ?? candidates[0]?.id;
};

const buildSkipSet = (
  run: AiPathRunRecord,
  edges: Edge[],
  nodeStatusMap: Map<string, string>
): Set<string> => {
  const meta = (run.meta ?? {}) as {
    resumeMode?: string;
    retryNodeIds?: string[];
  };
  const mode = meta.resumeMode ?? "replay";
  if (mode === "replay") return new Set<string>();

  const completed = new Set(
    Array.from(nodeStatusMap.entries())
      .filter(([, status]: [string, string]) => status === "completed")
      .map(([nodeId]: [string, string]) => nodeId)
  );
  if (mode === "resume") {
    const failedNodes = new Set(
      Array.from(nodeStatusMap.entries())
        .filter(([, status]: [string, string]) => status === "failed")
        .map(([nodeId]: [string, string]) => nodeId)
    );
    if (failedNodes.size === 0) {
      return completed;
    }
    const affected = computeDownstreamNodes(edges, failedNodes);
    return new Set(Array.from(completed).filter((nodeId: string) => !affected.has(nodeId)));
  }
  if (mode === "retry") {
    const retryNodes = new Set(meta.retryNodeIds ?? []);
    const affected = computeDownstreamNodes(edges, retryNodes);
    return new Set(Array.from(completed).filter((nodeId: string) => !affected.has(nodeId)));
  }
  return new Set<string>();
};

const fetchEntityByType = async (entityType: string, entityId: string): Promise<Record<string, unknown> | null> => {
  if (!entityType || !entityId) return null;
  const normalized = entityType.toLowerCase();
  if (normalized === "product") {
    const repo = await getProductRepository();
    return (await repo.getProductById(entityId)) as Record<string, unknown> | null;
  }
  if (normalized === "note") {
    return (await noteService.getById(entityId)) as Record<string, unknown> | null;
  }
  return null;
};

export const executePathRun = async (run: AiPathRunRecord): Promise<void> => {
  const repo = await getPathRunRepository();
  const graph = run.graph;
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    await repo.updateRun(run.id, {
      status: "failed",
      errorMessage: "Run graph is missing or invalid.",
      finishedAt: new Date(),
    });
    await repo.createRunEvent({
      runId: run.id,
      level: "error",
      message: "Run graph is missing or invalid.",
    });
    return;
  }

  const nodes = normalizeNodes(graph.nodes as AiNode[]);
  const edges = sanitizeEdges(nodes, graph.edges as Edge[]);
  const triggerNodeId = resolveTriggerNodeId(
    nodes,
    edges,
    run.triggerEvent ?? undefined,
    run.triggerNodeId ?? undefined
  );

  const runtimeState = parseRuntimeState(run.runtimeState);
  const nodeRecords = await repo.listRunNodes(run.id);
  const nodeStatusMap = new Map(
    nodeRecords.map((record: any) => [record.nodeId, record.status])
  );
  const nodeAttemptMap = new Map(
    nodeRecords.map((record: any) => [record.nodeId, record.attempt ?? 0])
  );
  const skipNodes = buildSkipSet(run, edges, nodeStatusMap);
  const reportAiPathsError = async (error: unknown, meta: Record<string, unknown>, summary?: string): Promise<void> => {
    await ErrorSystem.captureException(error, {
      service: "ai-paths-runtime",
      pathRunId: run.id,
      summary,
      ...meta,
    });
    await repo.createRunEvent({
      runId: run.id,
      level: "error",
      message: summary ?? "AI Paths runtime error",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        ...meta,
      },
    });
  };
  const toast = (): void => {};

  try {
    const resultState = await evaluateGraph({
      nodes,
      edges,
      activePathId: run.pathId,
      ...(triggerNodeId ? { triggerNodeId } : {}),
      ...(run.triggerEvent ? { triggerEvent: run.triggerEvent } : {}),
      ...(run.triggerContext ? { triggerContext: run.triggerContext as Record<string, unknown> } : {}),
      seedOutputs: runtimeState.outputs,
      skipNodeIds: skipNodes,
      fetchEntityByType,
      reportAiPathsError: (error: unknown, meta: Record<string, unknown>, summary?: string) => {
        void reportAiPathsError(error, meta, summary);
      },
      toast,
      onNodeStart: async ({ node, nodeInputs, prevOutputs }: { node: AiNode; nodeInputs: RuntimePortValues; prevOutputs: RuntimePortValues }) => {
        const nextAttempt = (nodeAttemptMap.get(node.id) ?? 0) + 1;
        nodeAttemptMap.set(node.id, nextAttempt);
        await repo.upsertRunNode(run.id, node.id, {
          nodeType: node.type,
          nodeTitle: node.title ?? null,
          status: "running",
          attempt: nextAttempt,
          inputs: toJsonSafe(nodeInputs) as RuntimePortValues,
          outputs: toJsonSafe(prevOutputs) as RuntimePortValues,
          startedAt: new Date(),
          errorMessage: null,
        });
      },
      onNodeFinish: async ({ node, nodeInputs, nextOutputs }: { node: AiNode; nodeInputs: RuntimePortValues; nextOutputs: RuntimePortValues }) => {
        await repo.upsertRunNode(run.id, node.id, {
          nodeType: node.type,
          nodeTitle: node.title ?? null,
          status: "completed",
          attempt: nodeAttemptMap.get(node.id) ?? 0,
          inputs: toJsonSafe(nodeInputs) as RuntimePortValues,
          outputs: toJsonSafe(nextOutputs) as RuntimePortValues,
          finishedAt: new Date(),
          errorMessage: null,
        });
      },
      onNodeError: async ({ node, nodeInputs, prevOutputs, error }: { node: AiNode; nodeInputs: RuntimePortValues; prevOutputs: RuntimePortValues; error: unknown }) => {
        await repo.upsertRunNode(run.id, node.id, {
          nodeType: node.type,
          nodeTitle: node.title ?? null,
          status: "failed",
          attempt: nodeAttemptMap.get(node.id) ?? 0,
          inputs: toJsonSafe(nodeInputs) as RuntimePortValues,
          outputs: toJsonSafe(prevOutputs) as RuntimePortValues,
          finishedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      },
      onIterationEnd: async ({ inputs, outputs }: { inputs: Record<string, RuntimePortValues>; outputs: Record<string, RuntimePortValues> }) => {
        await repo.updateRun(run.id, {
          runtimeState: sanitizeRuntimeState({ inputs, outputs }),
        });
      },
    });

    await repo.updateRun(run.id, {
      status: "completed",
      runtimeState: sanitizeRuntimeState(resultState),
      finishedAt: new Date(),
      errorMessage: null,
      meta: {
        ...(run.meta ?? {}),
        resumeMode: "replay",
        retryNodeIds: [],
      },
    });
    await repo.createRunEvent({
      runId: run.id,
      level: "info",
      message: "Run completed successfully.",
    });
  } catch (error) {
    await repo.updateRun(run.id, {
      status: "failed",
      finishedAt: new Date(),
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    await repo.createRunEvent({
      runId: run.id,
      level: "error",
      message: "Run failed.",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
};
