// Re-export DTOs as local type aliases for repository contracts
export type {
  AiPathDto,
  AiNodeDto,
  AiEdgeDto,
  AiPathRunDto,
  CreateAiPathDto,
  UpdateAiPathDto,
  ExecuteAiPathDto,
  AiPathRunStatusDto,
  AiPathNodeStatusDto,
  AiPathRunEventLevelDto,
  AiPathRunEventDto,
  AiPathRunEventListOptionsDto,
  AiPathRunListOptionsDto,
  AiPathRunListResultDto,
  AiPathRunUpdateDto,
  AiPathRunNodeUpdateDto,
  AiPathRunEventCreateInputDto,
} from '@/shared/contracts/ai-paths';

import type {
  AiPathRunCreateInput as AiPathRunCreateInputDto,
  AiPathRunUpdateDto,
  AiPathRunNodeUpdateDto,
  AiPathRunEventCreateInputDto,
  AiPathRunListResultDto as AiPathRunListResultDtoAlias,
  AiPathRunListOptionsDto as AiPathRunListOptionsDtoAlias,
  AiPathRunEventListOptionsDto as AiPathRunEventListOptionsDtoAlias,
} from '@/shared/contracts/ai-paths';
import type {
  AiNode,
  AiPathNodeStatus,
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
  AiPathRunStatus,
  Edge,
} from '@/shared/contracts/ai-paths';


// Extend the DTO with internal-only fields not exposed through the API contract.
// `status` is optional here because repositories default to 'queued'.
export type AiPathRunCreateInput = Omit<AiPathRunCreateInputDto, 'status'> & {
  status?: AiPathRunCreateInputDto['status'] | undefined;
  graph?: { nodes: AiNode[]; edges: Edge[] | unknown[] } | null | undefined;
  runtimeState?: Record<string, unknown> | null | undefined;
};

export type AiPathRunUpdate = AiPathRunUpdateDto & {
  status?: AiPathRunStatus;
  triggerContext?: Record<string, unknown> | null;
  graph?: { nodes: AiNode[]; edges: Edge[] | unknown[] } | null;
};

export type AiPathRunNodeUpdate = AiPathRunNodeUpdateDto & {
  status?: AiPathNodeStatus;
};

export type AiPathRunEventCreateInput = AiPathRunEventCreateInputDto;

export type AiPathRunEventListOptions = AiPathRunEventListOptionsDtoAlias;

export type AiPathRunListOptions = AiPathRunListOptionsDtoAlias;

export type AiPathRunListResult = AiPathRunListResultDtoAlias;

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
