import type {
  AiNode,
  AiPathsValidationStage,
  Edge,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths';
import type { ToastOptions } from '@/shared/contracts/ui';
import type {
  AiPathRuntimeProfileEvent,
  NodeRuntimeResolutionSource,
  NodeRuntimeResolutionStrategy,
  RuntimeProfileNodeStats,
  RuntimeProfileSummary,
  RuntimeSideEffectDecision,
  RuntimeSideEffectPolicy,
  RuntimeTraceResume,
  RuntimeState,
  RuntimeHistoryEntry,
  RuntimeTraceCacheDecision,
  NodeHandler,
} from '@/shared/contracts/ai-paths-runtime';
import type { Toast } from '@/shared/contracts/ui';

export type RuntimeProfileEvent = AiPathRuntimeProfileEvent;
export type { RuntimeProfileNodeStats, RuntimeProfileSummary };

export type RuntimeProfileOptions = {
  onEvent?: (event: RuntimeProfileEvent) => void;
  onSummary?: (summary: RuntimeProfileSummary) => void;
};

export type RuntimeNodeResolutionTelemetry = {
  runtimeStrategy: NodeRuntimeResolutionStrategy;
  runtimeResolutionSource: NodeRuntimeResolutionSource;
  runtimeCodeObjectId?: string | null | undefined;
};

export type RuntimeValidationStage = AiPathsValidationStage;
export type RuntimeValidationDecision = 'pass' | 'warn' | 'block';

export type RuntimeValidationIssue = {
  stage: RuntimeValidationStage;
  ruleId?: string | undefined;
  severity?: 'error' | 'warning' | 'info' | undefined;
  message: string;
  nodeId?: string | null | undefined;
  nodeTitle?: string | null | undefined;
  docsBindings?: string[] | undefined;
  metadata?: Record<string, unknown> | undefined;
};

export type RuntimeValidationContext = {
  stage: RuntimeValidationStage;
  runId: string;
  runStartedAt: string;
  iteration: number;
  nodes: AiNode[];
  edges: Edge[];
  node?: AiNode | null | undefined;
  nodeInputs?: RuntimePortValues | undefined;
  nodeOutputs?: RuntimePortValues | undefined;
};

export type RuntimeValidationResult = {
  decision: RuntimeValidationDecision;
  message?: string | undefined;
  issues?: RuntimeValidationIssue[] | undefined;
};

export type RuntimeValidationMiddleware = (
  context: RuntimeValidationContext
) =>
  | RuntimeValidationResult
  | null
  | undefined
  | Promise<RuntimeValidationResult | null | undefined>;

export type RuntimeNodeLifecycleBaseEvent = {
  runId: string;
  traceId: string;
  spanId: string;
  runStartedAt: string;
  node: AiNode;
  iteration: number;
  attempt: number;
  runtimeStrategy?: NodeRuntimeResolutionStrategy;
  runtimeResolutionSource?: NodeRuntimeResolutionSource;
  runtimeCodeObjectId?: string | null;
};

export type RuntimeNodeExecutionEvent = RuntimeNodeLifecycleBaseEvent & {
  nodeInputs: RuntimePortValues;
  prevOutputs: RuntimePortValues | null;
};

export type RuntimeNodeStartEvent = RuntimeNodeExecutionEvent;

export type RuntimeNodeFinishEvent = RuntimeNodeExecutionEvent & {
  nextOutputs: RuntimePortValues;
  changed: boolean;
  cached?: boolean;
  error?: string;
  cacheDecision?: RuntimeTraceCacheDecision;
  sideEffectDecision?: RuntimeSideEffectDecision;
  sideEffectPolicy?: RuntimeSideEffectPolicy;
  activationHash?: string | null;
  idempotencyKey?: string | null;
  effectSourceSpanId?: string | null;
};

export type RuntimeNodeErrorEvent = RuntimeNodeExecutionEvent & {
  error: unknown;
};

export type RuntimeNodeBlockedReason =
  | 'missing_inputs'
  | 'flow_control'
  | 'validation'
  | 'error'
  | 'waiting_callback';

export type RuntimeNodeBlockedStatus = 'blocked' | 'waiting_callback';

export type RuntimeNodeBlockedEvent = {
  runId: string;
  traceId: string;
  spanId: string;
  node: AiNode;
  iteration: number;
  attempt: number;
  reason: RuntimeNodeBlockedReason;
  status?: RuntimeNodeBlockedStatus;
  waitingOnPorts?: string[];
  waitingOnDetails?: Array<Record<string, unknown>>;
  message?: string;
  runtimeStrategy?: NodeRuntimeResolutionStrategy;
  runtimeResolutionSource?: NodeRuntimeResolutionSource;
  runtimeCodeObjectId?: string | null;
};

export type RuntimeNodeStatusEvent = {
  runId: string;
  traceId: string;
  spanId: string;
  node: AiNode;
  iteration: number;
  attempt: number;
  status: RuntimeNodeBlockedStatus;
  message?: string;
  waitingOnPorts?: string[];
  runtimeStrategy?: NodeRuntimeResolutionStrategy;
  runtimeResolutionSource?: NodeRuntimeResolutionSource;
  runtimeCodeObjectId?: string | null;
};

export type RuntimeNodeSuccessEvent = RuntimeNodeExecutionEvent & {
  outputs: RuntimePortValues;
  durationMs: number;
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
  seedHashTimestamps?: Record<string, number> | undefined;
  seedHistory?: Record<string, RuntimeHistoryEntry[]> | undefined;
  seedRunId?: string | undefined;
  seedRunStartedAt?: string | undefined;
  resumeByNodeId?: Record<string, RuntimeTraceResume> | undefined;
  cache?: Map<string, RuntimePortValues> | undefined;
  maxIterations?: number | undefined;
  onNodeStart?: (event: RuntimeNodeStartEvent) => Promise<void> | void;
  onNodeFinish?: (event: RuntimeNodeFinishEvent) => Promise<void> | void;
  onNodeError?: (event: RuntimeNodeErrorEvent) => Promise<void> | void;
  onNodeBlocked?: (event: RuntimeNodeBlockedEvent) => Promise<void> | void;
  onNodeStatus?: (event: RuntimeNodeStatusEvent) => Promise<void> | void;
  onNodeSuccess?: (event: RuntimeNodeSuccessEvent) => Promise<void> | void;
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
  validationMiddleware?: RuntimeValidationMiddleware;
  onRuntimeValidation?: (event: {
    runId: string;
    runStartedAt: string;
    iteration: number;
    stage: RuntimeValidationStage;
    decision: Exclude<RuntimeValidationDecision, 'pass'>;
    node: AiNode | null;
    nodeInputs?: RuntimePortValues;
    nodeOutputs?: RuntimePortValues;
    message: string;
    issues: RuntimeValidationIssue[];
    runtimeStrategy?: NodeRuntimeResolutionStrategy;
    runtimeResolutionSource?: NodeRuntimeResolutionSource;
    runtimeCodeObjectId?: string | null;
  }) => Promise<void> | void;
  profile?: RuntimeProfileOptions | undefined;
  abortSignal?: AbortSignal | undefined;
  toast?: Toast | undefined;
  reportAiPathsError: (error: unknown, context: Record<string, unknown>, summary?: string) => void;
  // Handler Resolution
  resolveHandler?: (type: string) => NodeHandler | null;
  resolveCodeObjectHandler?:
    | ((args: { nodeType: string; codeObjectId: string }) => NodeHandler | null)
    | undefined;
  resolveHandlerTelemetry?: (type: string) => RuntimeNodeResolutionTelemetry | null;
  runtimeKernelNodeTypes?: string[] | undefined;
  runtimeKernelCodeObjectResolverIds?: string[] | undefined;
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
