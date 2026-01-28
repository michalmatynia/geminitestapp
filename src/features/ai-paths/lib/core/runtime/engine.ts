import { DEFAULT_CONTEXT_ROLE } from "../constants";
import { appendInputValue, cloneValue } from "../utils";
import { buildFallbackEntity } from "./utils";
import type {
  AiNode,
  ContextConfig,
  DbQueryConfig,
  Edge,
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
  triggerNodeId?: string;
  triggerEvent?: string;
  triggerContext?: Record<string, unknown> | null;
  deferPoll?: boolean;
  skipAiJobs?: boolean;
  seedOutputs?: Record<string, RuntimePortValues>;
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
  triggerNodeId,
  triggerEvent,
  triggerContext,
  deferPoll,
  skipAiJobs,
  seedOutputs,
  fetchEntityByType,
  reportAiPathsError,
  toast,
}: EvaluateGraphOptions): Promise<RuntimeState> {
  const outputs: Record<string, RuntimePortValues> = seedOutputs
    ? Object.fromEntries(
        Object.entries(seedOutputs).map(([key, value]) => [key, cloneValue(value)])
      )
    : {};
  let inputs: Record<string, RuntimePortValues> = {};
  const now = new Date().toISOString();
  const entityCache = new Map<string, Record<string, unknown> | null>();
  const activeNodeIds = new Set<string>();

  if (triggerNodeId) {
    const adjacency = new Map<string, Set<string>>();
    edges.forEach((edge) => {
      if (!edge.from || !edge.to) return;
      if (edge.fromPort === "aiPrompt" || edge.toPort === "queryCallback") {
        return;
      }
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
      neighbors.forEach((neighbor) => {
        if (activeNodeIds.has(neighbor)) return;
        activeNodeIds.add(neighbor);
        queue.push(neighbor);
      });
    }
  }
  const alwaysActiveTypes = new Set(["parser", "prompt", "viewer", "database"]);
  const isActiveNode = (node: AiNode) =>
    !triggerNodeId ||
    activeNodeIds.has(node.id) ||
    alwaysActiveTypes.has(node.type);

  const fetchEntityCached = async (entityType: string, entityId: string) => {
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
      (edge) => edge.to === triggerNodeId && edge.toPort === "simulation"
    );
    if (simulationEdge) {
      const simNode = nodes.find(
        (node) => node.id === simulationEdge.from && node.type === "simulation"
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
    edges.forEach((edge) => {
      const fromOutput = outputs[edge.from];
      if (!fromOutput || !edge.fromPort || !edge.toPort) return;
      if (edge.fromPort === "aiPrompt" || edge.toPort === "queryCallback") {
        return; // manual-only AI helper wiring
      }
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

      const handler = HANDLERS[node.type];
      if (handler) {
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
      } else {
        // Default behavior for unknown nodes or if no outputs changed
         if (!outputs[node.id]) {
            nextOutputs = prevOutputs;
          }
      }

      if (JSON.stringify(prevOutputs) !== JSON.stringify(nextOutputs)) {
        outputs[node.id] = nextOutputs;
        changed = true;
      }
    }

    inputs = nextInputs;
    if (!changed) break;
  }

  return { inputs, outputs };
}
