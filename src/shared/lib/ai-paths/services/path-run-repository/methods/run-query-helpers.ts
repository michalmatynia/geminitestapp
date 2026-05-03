import type { AiPathRunListOptions, AiPathRunQueueStatsOptions } from '@/shared/contracts/ai-paths';
import { AI_PATHS_RUN_SOURCE_VALUES } from '@/shared/lib/ai-paths/run-sources';

import type { Db } from 'mongodb';

import {
  NODES_COLLECTION,
  type NodeDocument,
} from './shared';

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseFilterDate = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
};

export const RUN_LIST_PROJECTION = {
  _id: 1,
  id: 1,
  userId: 1,
  pathId: 1,
  pathName: 1,
  status: 1,
  triggerEvent: 1,
  triggerNodeId: 1,
  meta: 1,
  entityId: 1,
  entityType: 1,
  errorMessage: 1,
  retryCount: 1,
  maxAttempts: 1,
  nextRetryAt: 1,
  createdAt: 1,
  updatedAt: 1,
  startedAt: 1,
  finishedAt: 1,
} as const;

export const buildRunFilter = (options: AiPathRunListOptions = {}): Record<string, unknown> => {
  const andFilters: Record<string, unknown>[] = [];
  if (options.id) {
    andFilters.push({ $or: [{ id: options.id }, { _id: options.id }] });
  }
  if (options.userId) {
    andFilters.push({ userId: options.userId });
  }
  if (options.pathId) {
    andFilters.push({ pathId: options.pathId });
  }
  if (options.requestId?.trim()) {
    andFilters.push({ 'meta.requestId': options.requestId.trim() });
  }
  const statuses = Array.isArray(options.statuses) ? options.statuses.filter(Boolean) : [];
  if (statuses.length > 0) {
    andFilters.push({ status: { $in: statuses } });
  } else if (options.status) {
    andFilters.push({ status: options.status });
  }
  const source = options.source?.trim();
  const sourceMode = options.sourceMode ?? 'include';
  if (source) {
    if (sourceMode === 'exclude') {
      if (source === 'ai_paths_ui') {
        andFilters.push({ 'meta.source': { $nin: [...AI_PATHS_RUN_SOURCE_VALUES] } });
      } else {
        andFilters.push({ 'meta.source': { $ne: source } });
      }
    } else if (source === 'ai_paths_ui') {
      andFilters.push({ 'meta.source': { $in: [...AI_PATHS_RUN_SOURCE_VALUES] } });
    } else {
      andFilters.push({ 'meta.source': source });
    }
  }
  const query = options.query?.trim();
  if (query) {
    const regex = new RegExp(escapeRegex(query), 'i');
    andFilters.push({
      $or: [
        { id: { $regex: regex } },
        { _id: { $regex: regex } },
        { pathId: { $regex: regex } },
        { pathName: { $regex: regex } },
        { entityId: { $regex: regex } },
        { errorMessage: { $regex: regex } },
      ],
    });
  }
  const createdAfter = parseFilterDate(options.createdAfter);
  const createdBefore = parseFilterDate(options.createdBefore);
  if (createdAfter || createdBefore) {
    andFilters.push({
      createdAt: {
        ...(createdAfter ? { $gte: createdAfter } : {}),
        ...(createdBefore ? { $lte: createdBefore } : {}),
      },
    });
  }
  return andFilters.length > 0 ? { $and: andFilters } : {};
};

const buildRunIdConstraint = (runIds: string[]): Record<string, unknown> => ({
  $or: [{ _id: { $in: runIds } }, { id: { $in: runIds } }],
});

export const appendRunIdConstraint = (
  filter: Record<string, unknown>,
  runIds: string[]
): Record<string, unknown> => {
  const runIdConstraint = buildRunIdConstraint(runIds);
  const existingAnd = Array.isArray(filter['$and'])
    ? (filter['$and'] as Record<string, unknown>[])
    : null;
  if (existingAnd) {
    return { $and: [...existingAnd, runIdConstraint] };
  }
  if (Object.keys(filter).length === 0) return runIdConstraint;
  return { $and: [filter, runIdConstraint] };
};

export const resolveRunIdsForNodeFilter = async (db: Db, nodeId: string): Promise<string[]> => {
  const runIds = await db.collection<NodeDocument>(NODES_COLLECTION).distinct('runId', { nodeId });
  return runIds.filter(
    (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
  );
};

export const buildQueueStatsFilter = (
  options: AiPathRunQueueStatsOptions = {}
): Record<string, unknown> => {
  const now = new Date();
  const baseFilter = buildRunFilter({
    ...(options.userId ? { userId: options.userId } : {}),
    ...(options.pathId ? { pathId: options.pathId } : {}),
    ...(options.source ? { source: options.source, sourceMode: options.sourceMode } : {}),
    status: 'queued',
  });
  const retryFilter = {
    $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }],
  };

  return Object.keys(baseFilter).length > 0
    ? { $and: [baseFilter, retryFilter] }
    : { status: 'queued', ...retryFilter };
};
