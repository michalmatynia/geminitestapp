import type {
  AiNode,
  Edge,
  RuntimePortValues,
} from "./ai-paths";

export type ToastFn = (message: string, options?: { variant?: "success" | "error" }) => void;

export type NodeHandlerContext = {
  node: AiNode;
  nodeInputs: RuntimePortValues;
  prevOutputs: RuntimePortValues;
  edges: Edge[];
  nodes: AiNode[];
  activePathId: string | null;
  triggerNodeId: string | undefined;
  triggerEvent: string | undefined;
  triggerContext: Record<string, unknown> | null | undefined;
  deferPoll: boolean | undefined;
  skipAiJobs: boolean | undefined;
  now: string;
  
  // Global State (for accessing other nodes' data)
  allOutputs: Record<string, RuntimePortValues>;
  allInputs: Record<string, RuntimePortValues>;

  // Tools & Helpers
  fetchEntityCached: (entityType: string, entityId: string) => Promise<Record<string, unknown> | null>;
  reportAiPathsError: (error: unknown, meta: Record<string, unknown>, summary?: string) => void;
  toast: ToastFn;

  // Global Variables
  simulationEntityType: string | null;
  simulationEntityId: string | null;
  resolvedEntity: Record<string, unknown> | null;
  fallbackEntityId: string | null;

  // Execution tracking sets (mutable)
  executed: {
    notification: Set<string>;
    updater: Set<string>;
    http: Set<string>;
    delay: Set<string>;
    poll: Set<string>;
    ai: Set<string>;
  };
};

export type NodeHandlerResult = Promise<RuntimePortValues> | RuntimePortValues;

export type NodeHandler = (context: NodeHandlerContext) => NodeHandlerResult;