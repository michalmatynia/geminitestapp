import { type AiNode, type Edge } from '@/shared/contracts/ai-paths';

export type EnqueueRunInput = {
  userId?: string | null;
  pathId: string;
  pathName?: string | null;
  nodes: AiNode[];
  edges: Edge[];
  triggerEvent?: string | null;
  triggerNodeId?: string | null;
  triggerContext?: Record<string, unknown> | null;
  entityId?: string | null;
  entityType?: string | null;
  maxAttempts?: number | null;
  backoffMs?: number | null;
  backoffMaxMs?: number | null;
  requestId?: string | null;
  meta?: Record<string, unknown> | null;
};

export const ACTIVE_RUN_STATUSES = new Set(['queued', 'running']);
export const ACTIVE_RUN_STATUS_FILTER = ['queued', 'running'] as const;
