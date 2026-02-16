// Re-export DTOs as local type aliases for repository contracts
export type {
  AiPathDto,
  AiNodeDto,
  AiEdgeDto,
  AiPathRunDto,
  CreateAiPathDto,
  UpdateAiPathDto,
  ExecuteAiPathDto
} from '@/shared/contracts/ai-paths';

import type {
  AiNode,
  AiPathNodeStatus,
  AiPathRunEventLevel,
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
  AiPathRunStatus,
  Edge,
} from '@/shared/types/domain/ai-paths';

export type AiPathRunCreateInput = {
  userId?: string | null;
  pathId: string;
  pathName?: string | null;
  triggerEvent?: string | null;
  triggerNodeId?: string | null;
  triggerContext?: Record<string, unknown> | null;
  graph?: { nodes: AiNode[]; edges: Edge[] | unknown[] } | null;
  runtimeState?: Record<string, unknown> | null;
  meta?: Record<string, unknown> | null;
  entityId?: string | null;
  entityType?: string | null;
  maxAttempts?: number | null;
  retryCount?: number | null;
  nextRetryAt?: Date | string | null;
};

export type AiPathRunUpdate = Partial<
  Omit<
    AiPathRunRecord,
    'id' | 'userId' | 'pathId' | 'createdAt' | 'graph' | 'triggerContext'
  >
> & {
  status?: AiPathRunStatus;
  triggerContext?: Record<string, unknown> | null;
  graph?: { nodes: AiNode[]; edges: Edge[] | unknown[] } | null;
};

export type AiPathRunNodeUpdate = Partial<
  Omit<AiPathRunNodeRecord, 'id' | 'runId' | 'nodeId' | 'createdAt'>
> & {
  status?: AiPathNodeStatus;
};

export type AiPathRunEventCreateInput = {
  runId: string;
  level: AiPathRunEventLevel;
  message: string;
  metadata?: Record<string, unknown> | null;
};

export type AiPathRunEventListOptions = {
  since?: Date | string | null;
  after?: {
    createdAt: Date | string;
    id: string;
  } | null;
  limit?: number;
};

export type AiPathRunListOptions = {
  userId?: string | null;
  pathId?: string;
  requestId?: string;
  source?: string;
  sourceMode?: 'include' | 'exclude';
  status?: AiPathRunStatus;
  statuses?: AiPathRunStatus[];
  query?: string;
  createdAfter?: Date | string | null;
  createdBefore?: Date | string | null;
  limit?: number;
  offset?: number;
};

export type AiPathRunListResult = {
  runs: AiPathRunRecord[];
  total: number;
};

export type AiPathRunRepository = {
  createRun(input: AiPathRunCreateInput): Promise<AiPathRunRecord>;
  updateRun(runId: string, data: AiPathRunUpdate): Promise<AiPathRunRecord>;
  updateRunIfStatus(
    runId: string,
    expectedStatuses: AiPathRunStatus[],
    data: AiPathRunUpdate
  ): Promise<AiPathRunRecord | null>;
  claimRunForProcessing(runId: string): Promise<AiPathRunRecord | null>;
  findRunById(runId: string): Promise<AiPathRunRecord | null>;
  deleteRun(runId: string): Promise<boolean>;
  listRuns(options?: AiPathRunListOptions): Promise<AiPathRunListResult>;
  deleteRuns(options?: AiPathRunListOptions): Promise<{ count: number }>;
  claimNextQueuedRun(): Promise<AiPathRunRecord | null>;
  getQueueStats(): Promise<{ queuedCount: number; oldestQueuedAt: Date | null }>;
  createRunNodes(runId: string, nodes: AiNode[]): Promise<void>;
  upsertRunNode(
    runId: string,
    nodeId: string,
    data: AiPathRunNodeUpdate & { nodeType: string; nodeTitle?: string | null }
  ): Promise<AiPathRunNodeRecord>;
  listRunNodes(runId: string): Promise<AiPathRunNodeRecord[]>;
  listRunNodesSince(
    runId: string,
    cursor: { updatedAt: Date | string; nodeId: string },
    options?: { limit?: number }
  ): Promise<AiPathRunNodeRecord[]>;
  createRunEvent(input: AiPathRunEventCreateInput): Promise<AiPathRunEventRecord>;
  listRunEvents(runId: string, options?: AiPathRunEventListOptions): Promise<AiPathRunEventRecord[]>;
  markStaleRunningRuns(maxAgeMs: number): Promise<{ count: number }>;
};
