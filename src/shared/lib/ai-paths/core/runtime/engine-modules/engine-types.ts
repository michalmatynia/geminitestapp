import type { AiNode, Edge, RuntimePortValues } from '@/shared/contracts/ai-paths';
import type { ToastOptions } from '@/shared/contracts/ui';
import type {
  AiPathRuntimeProfileEvent,
  RuntimeProfileNodeStats,
  RuntimeProfileSummary,
  RuntimeState,
  NodeHandler,
} from '@/shared/contracts/ai-paths-runtime';
import type { Toast } from '@/shared/contracts/ui';

export type RuntimeProfileEvent = AiPathRuntimeProfileEvent;
export type { RuntimeProfileNodeStats, RuntimeProfileSummary };

export type RuntimeProfileOptions = {
  onEvent?: (event: RuntimeProfileEvent) => void;
  onSummary?: (summary: RuntimeProfileSummary) => void;
};

export type EvaluateGraphOptions = {
  runId?: string | undefined;
  pathId?: string | undefined;
  pathName?: string | undefined;
  userId?: string | null | undefined;
  triggerEvent?: string | null | undefined;
  triggerNodeId?: string | null | undefined;
  triggerContext?: Record<string, unknown> | null | undefined;
  strictFlowMode?: boolean | undefined;
  deferPoll?: boolean | undefined;
  skipAiJobs?: boolean | undefined;
  isManualExecution?: boolean | undefined;
  skipNodeIds?: string[] | undefined;
  seedOutputs?: Record<string, RuntimePortValues> | undefined;
  seedHashes?: Record<string, string> | undefined;
  cache?: Map<string, RuntimePortValues> | undefined;
  maxIterations?: number | undefined;
  onNodeStart?: (event: {
    runId: string;
    runStartedAt: string;
    node: AiNode;
    nodeInputs: RuntimePortValues;
    prevOutputs: RuntimePortValues | null;
    iteration: number;
  }) => Promise<void> | void;
  onNodeFinish?: (event: {
    runId: string;
    runStartedAt: string;
    node: AiNode;
    nodeInputs: RuntimePortValues;
    prevOutputs: RuntimePortValues | null;
    nextOutputs: RuntimePortValues;
    changed: boolean;
    iteration: number;
    cached?: boolean;
    error?: string;
    sideEffectDecision?: string;
    sideEffectPolicy?: string;
    activationHash?: string | null;
  }) => Promise<void> | void;
  onNodeError?: (event: {
    runId: string;
    runStartedAt: string;
    node: AiNode;
    nodeInputs: RuntimePortValues;
    prevOutputs: RuntimePortValues | null;
    error: unknown;
    iteration: number;
  }) => Promise<void> | void;
  onNodeBlocked?: (event: {
    runId: string;
    node: AiNode;
    reason: 'missing_inputs' | 'flow_control' | 'error';
    status?: 'blocked' | 'waiting_callback';
    waitingOnPorts?: string[];
    waitingOnDetails?: Array<Record<string, unknown>>;
    message?: string;
  }) => Promise<void> | void;
  onIteration?: (event: {
    runId: string;
    iteration: number;
    activeNodes: string[];
  }) => Promise<void> | void;
  onIterationLimitWarning?: (event: {
    runId: string;
    iteration: number;
    maxIterations: number;
    remaining: number;
  }) => Promise<void> | void;
  onHalt?: (event: {
    runId: string;
    reason: 'blocked' | 'max_iterations' | 'completed' | 'failed';
    nodeStatuses: Record<string, string>;
  }) => Promise<void> | void;
  onToast?: (event: {
    runId: string;
    nodeId: string;
    message: string;
    options?: ToastOptions;
  }) => Promise<void> | void;
  profile?: RuntimeProfileOptions | undefined;
  abortSignal?: AbortSignal | undefined;
  toast?: Toast | undefined;
  reportAiPathsError: (error: unknown, context: Record<string, unknown>, summary?: string) => void;
  // Handler Resolution
  resolveHandler?: (type: string) => NodeHandler | null;
  // Services
  fetchEntityByType?: (type: string, id: string) => Promise<Record<string, unknown> | null>;
  fetchEntityCached?: (type: string, id: string) => Promise<Record<string, unknown> | null>;
  services?: {
    prisma?: unknown;
    mongo?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type EvaluateGraphArgs = EvaluateGraphOptions & {
  nodes: AiNode[];
  edges: Edge[];
};

export class GraphExecutionError extends Error {
  state: RuntimeState;
  nodeId?: string | null;

  constructor(message: string, state: RuntimeState, nodeId?: string | null, cause?: unknown) {
    super(message);
    this.name = 'GraphExecutionError';
    this.state = state;
    this.nodeId = nodeId ?? null;
    if (cause && typeof (this as { cause?: unknown }).cause === 'undefined') {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

export class GraphExecutionCancelled extends Error {
  state: RuntimeState;
  nodeId?: string | null;

  constructor(message: string, state: RuntimeState, nodeId?: string | null, cause?: unknown) {
    super(message);
    this.name = 'GraphExecutionCancelled';
    this.state = state;
    this.nodeId = nodeId ?? null;
    if (cause && typeof (this as { cause?: unknown }).cause === 'undefined') {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}
