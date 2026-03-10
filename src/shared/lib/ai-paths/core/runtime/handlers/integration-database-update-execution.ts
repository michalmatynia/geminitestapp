import type {
  DatabaseConfig,
  DbQueryConfig,
  DatabaseWriteOutcome,
} from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';
import { dbApi, entityApi, ApiResponse } from '@/shared/lib/ai-paths/api';
import { isObjectRecord } from '@/shared/utils/object-utils';

import { buildDbQueryPayload } from '../utils';
import {
  evaluateWriteOutcome,
  resolveWriteOutcomePolicy,
} from './integration-database-write-guardrails';

interface DbActionResult {
  items?: unknown[];
  item?: unknown;
  values?: unknown[];
  count?: number;
  modifiedCount?: number;
  matchedCount?: number;
  requestedProvider?: 'auto' | 'mongodb' | 'prisma';
  resolvedProvider?: 'mongodb' | 'prisma';
}

type ResolveCollectionUpdateContextInput = {
  resolvedInputs: Record<string, unknown>;
  queryConfig: DbQueryConfig;
  configuredCollection: string;
  entityType: string;
};

type ResolveCollectionUpdateContextResult = {
  queryPayload: ReturnType<typeof buildDbQueryPayload>;
  query: Record<string, unknown>;
  collection: string;
};

const resolveCollectionUpdateContext = ({
  resolvedInputs,
  queryConfig,
  configuredCollection,
  entityType,
}: ResolveCollectionUpdateContextInput): ResolveCollectionUpdateContextResult => {
  const queryPayload = buildDbQueryPayload(resolvedInputs, queryConfig);
  const queryFromPayload = isObjectRecord(queryPayload['filter']) ? queryPayload['filter'] : {};
  const query = queryFromPayload;
  const collection =
    (queryPayload['collection'] as string | undefined)?.trim() ||
    configuredCollection ||
    entityType;
  return {
    queryPayload,
    query,
    collection,
  };
};

export type ExecuteDatabaseUpdateInput = {
  nodeId: string;
  executed: NodeHandlerContext['executed'];
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  toast: NodeHandlerContext['toast'];
  dryRun: boolean;
  resolvedInputs: Record<string, unknown>;
  dbConfig: DatabaseConfig;
  queryConfig: DbQueryConfig;
  updates: Record<string, unknown>;
  updateStrategy: 'one' | 'many';
  entityType: string;
  shouldUseEntityUpdate: boolean;
  entityId: string | null;
  configuredCollection: string;
  updatePayloadMode?: 'mapping' | 'custom';
  customFilter?: Record<string, unknown>;
  customUpdateDoc?: unknown;
};

export type ExecuteDatabaseUpdateResult =
  | { skipped: true }
  | {
      skipped: false;
      updateResult: unknown;
      executionMeta: Record<string, unknown>;
      writeOutcome: DatabaseWriteOutcome;
    };

const resolveProviderMeta = (responseData: unknown): Record<string, unknown> => {
  if (!isObjectRecord(responseData)) return {};
  const requestedProvider =
    responseData['requestedProvider'] === 'auto' ||
    responseData['requestedProvider'] === 'mongodb' ||
    responseData['requestedProvider'] === 'prisma'
      ? responseData['requestedProvider']
      : undefined;
  const resolvedProvider =
    responseData['resolvedProvider'] === 'mongodb' || responseData['resolvedProvider'] === 'prisma'
      ? responseData['resolvedProvider']
      : undefined;
  return {
    ...(requestedProvider ? { requestedProvider } : {}),
    ...(resolvedProvider ? { resolvedProvider } : {}),
  };
};

export async function executeDatabaseUpdate({
  nodeId,
  executed,
  reportAiPathsError,
  toast,
  dryRun,
  resolvedInputs,
  dbConfig,
  queryConfig,
  updates,
  updateStrategy,
  entityType,
  shouldUseEntityUpdate,
  entityId,
  configuredCollection,
  updatePayloadMode = 'mapping',
  customFilter,
  customUpdateDoc,
}: ExecuteDatabaseUpdateInput): Promise<ExecuteDatabaseUpdateResult> {
  const isCustomPayloadMode = updatePayloadMode === 'custom';
  const zeroAffectedPolicy = resolveWriteOutcomePolicy(dbConfig);
  let updateResult: unknown = updates;
  let executionMeta: Record<string, unknown> = {
    mode: updatePayloadMode,
    strategy: updateStrategy,
  };
  let writeOutcome: DatabaseWriteOutcome = {
    status: 'success',
    operation: 'update',
  };

  const applyWriteOutcome = (
    action: string,
    resultPayload: unknown,
    context: Record<string, unknown>
  ): void => {
    const outcome = evaluateWriteOutcome({
      operation: 'update',
      action,
      result: resultPayload,
      policy: zeroAffectedPolicy,
    });
    writeOutcome = outcome.writeOutcome;
    if (!outcome.isZeroAffected) return;
    const outcomeMessage =
      outcome.writeOutcome.message ?? `Database write affected 0 records for update (${action}).`;
    if (outcome.writeOutcome.status === 'failed') {
      reportAiPathsError(
        new Error(outcomeMessage),
        {
          action: 'dbWriteOutcome',
          nodeId,
          policy: zeroAffectedPolicy,
          ...context,
          writeOutcome: outcome.writeOutcome,
        },
        'Database update failed:'
      );
      toast(outcomeMessage, { variant: 'error' });
      throw new Error(outcomeMessage);
    }
    toast(outcomeMessage, { variant: 'warning' });
  };

  if (updateStrategy === 'many') {
    const queryPayload = buildDbQueryPayload(resolvedInputs, queryConfig);
    const queryFromPayload = isObjectRecord(queryPayload['filter']) ? queryPayload['filter'] : {};
    const query = isCustomPayloadMode && customFilter ? customFilter : queryFromPayload;
    const hasQuery = query && typeof query === 'object' && Object.keys(query).length > 0;

    executionMeta = {
      ...executionMeta,
      action: isCustomPayloadMode ? 'updateMany' : 'dbUpdateMany',
      collection: queryPayload['collection'],
      filter: query,
      update: isCustomPayloadMode ? customUpdateDoc : updates,
      requestedProvider: queryPayload.provider,
      ...(queryPayload.idType !== undefined ? { idType: queryPayload.idType } : {}),
    };

    if (!isCustomPayloadMode && dbConfig.mode === 'append' && !executed.updater.has(nodeId)) {
      reportAiPathsError(
        new Error('Append mode is not supported for update many'),
        { action: 'updateMany', nodeId },
        'Database update many failed:'
      );
      toast('Update many does not support append mode.', {
        variant: 'error',
      });
      updateResult = {
        error: 'append_not_supported',
        updates,
        query,
        collection: queryPayload['collection'],
      };
      executed.updater.add(nodeId);
    } else if (!hasQuery && !executed.updater.has(nodeId)) {
      reportAiPathsError(
        new Error('Database update missing explicit query filter'),
        {
          action: 'updateMany',
          collection: queryPayload['collection'],
          nodeId,
        },
        'Database update many failed:'
      );
      toast('Database update requires an explicit query filter.', {
        variant: 'error',
      });
      updateResult = {
        error: 'missing_query',
        collection: queryPayload['collection'],
        ...(isCustomPayloadMode ? { update: customUpdateDoc } : { updates }),
      };
      executed.updater.add(nodeId);
    } else if (hasQuery && !executed.updater.has(nodeId)) {
      if (dryRun) {
        updateResult = {
          dryRun: true,
          updateMany: true,
          collection: queryPayload['collection'],
          query,
          update: isCustomPayloadMode ? customUpdateDoc : updates,
          mode: dbConfig.mode ?? 'replace',
          ...executionMeta,
        };
        executed.updater.add(nodeId);
      } else {
        const dbUpdateResult: ApiResponse<DbActionResult> = isCustomPayloadMode
          ? await dbApi.action<DbActionResult>({
            provider: queryPayload.provider,
            action: 'updateMany',
            collection: queryPayload.collection,
            ...(queryPayload.collectionMap ? { collectionMap: queryPayload.collectionMap } : {}),
            filter: query,
            update: customUpdateDoc,
            ...(queryPayload.idType !== undefined ? { idType: queryPayload.idType } : {}),
          })
          : await dbApi.update<DbActionResult>({
            provider: queryPayload.provider,
            collection: queryPayload.collection,
            ...(queryPayload.collectionMap ? { collectionMap: queryPayload.collectionMap } : {}),
            filter: query,
            update: updates,
            single: false,
            ...(queryPayload.idType !== undefined ? { idType: queryPayload.idType } : {}),
          });
        executed.updater.add(nodeId);
        if (!dbUpdateResult.ok) {
          reportAiPathsError(
            new Error(dbUpdateResult.error),
            {
              action: 'updateMany',
              collection: queryPayload['collection'],
              nodeId,
            },
            'Database update many failed:'
          );
          toast(`Failed to update ${queryPayload['collection']}.`, {
            variant: 'error',
          });
        } else {
          updateResult = dbUpdateResult.data;
          executionMeta = {
            ...executionMeta,
            ...resolveProviderMeta(dbUpdateResult.data),
          };
          applyWriteOutcome('updateMany', dbUpdateResult.data, {
            collection: queryPayload['collection'],
            strategy: updateStrategy,
          });
          const modified: number =
            ((dbUpdateResult.data as Record<string, unknown>)?.['modifiedCount'] as number) ?? 0;
          const matched: number =
            ((dbUpdateResult.data as Record<string, unknown>)?.['matchedCount'] as number) ?? 0;
          const countLabel = modified || matched;
          if (writeOutcome.status !== 'warning') {
            toast(
              `Updated ${countLabel} document${countLabel === 1 ? '' : 's'} in ${queryPayload['collection']}.`,
              { variant: 'success' }
            );
          }
        }
      }
    }
  } else if (!executed.updater.has(nodeId)) {
    if (dryRun) {
      if (shouldUseEntityUpdate && !isCustomPayloadMode) {
        executionMeta = {
          ...executionMeta,
          action: 'entityUpdate',
          entityType,
          entityId: entityId || undefined,
          requestedProvider: 'entityApi',
          resolvedProvider: 'entityApi',
        };
        updateResult = {
          dryRun: true,
          entityType,
          entityId: entityId || undefined,
          updates,
          mode: dbConfig.mode ?? 'replace',
          ...executionMeta,
        };
      } else {
        const { query, collection, queryPayload } = resolveCollectionUpdateContext({
          resolvedInputs,
          queryConfig,
          configuredCollection,
          entityType,
        });
        const resolvedFilter = isCustomPayloadMode && customFilter ? customFilter : query;
        executionMeta = {
          ...executionMeta,
          action: isCustomPayloadMode ? 'updateOne' : 'dbUpdateOne',
          collection,
          filter: resolvedFilter,
          update: isCustomPayloadMode ? customUpdateDoc : updates,
          requestedProvider: queryPayload.provider,
          ...(queryPayload.idType !== undefined ? { idType: queryPayload.idType } : {}),
        };
        updateResult = {
          dryRun: true,
          updateMany: false,
          collection,
          query: resolvedFilter,
          update: isCustomPayloadMode ? customUpdateDoc : updates,
          mode: dbConfig.mode ?? 'replace',
          ...executionMeta,
        };
      }
      executed.updater.add(nodeId);
    } else if (shouldUseEntityUpdate && !isCustomPayloadMode) {
      if (!entityId) {
        reportAiPathsError(
          new Error('Database update missing explicit entityId'),
          { action: 'updateEntity', entityType, nodeId },
          'Database update failed:'
        );
        toast(`Database update for ${entityType} requires explicit entityId.`, {
          variant: 'error',
        });
        updateResult = {
          error: 'missing_entity_id',
          entityType,
          updates,
        };
        executed.updater.add(nodeId);
        return {
          skipped: false,
          updateResult,
          executionMeta,
          writeOutcome,
        };
      }
      try {
        const entityUpdateResult = await entityApi.update({
          entityType,
          entityId,
          updates,
          mode: dbConfig.mode ?? 'replace',
        });
        if (!entityUpdateResult.ok) {
          throw new Error(entityUpdateResult.error);
        }
        updateResult = entityUpdateResult.data ?? updates;
        executionMeta = {
          ...executionMeta,
          action: 'entityUpdate',
          entityType,
          entityId,
          requestedProvider: 'entityApi',
          resolvedProvider: 'entityApi',
        };
        applyWriteOutcome('entityUpdate', entityUpdateResult.data ?? {}, {
          entityType,
          entityId,
          strategy: updateStrategy,
        });
        executed.updater.add(nodeId);
        const suffix = entityId ? ` ${entityId}` : '';
        if (writeOutcome.status !== 'warning') {
          toast(`Updated ${entityType}${suffix}`, { variant: 'success' });
        }
      } catch (error: unknown) {
        reportAiPathsError(
          error,
          { action: 'updateEntity', entityType, entityId, nodeId },
          'Database update failed:'
        );
        toast(`Failed to update ${entityType}.`, { variant: 'error' });
        executed.updater.add(nodeId);
      }
    } else {
      const { queryPayload, query, collection } = resolveCollectionUpdateContext({
        resolvedInputs,
        queryConfig,
        configuredCollection,
        entityType,
      });
      const resolvedFilter = isCustomPayloadMode && customFilter ? customFilter : query;
      executionMeta = {
        ...executionMeta,
        action: isCustomPayloadMode ? 'updateOne' : 'dbUpdateOne',
        collection,
        filter: resolvedFilter,
        update: isCustomPayloadMode ? customUpdateDoc : updates,
        requestedProvider: queryPayload.provider,
        ...(queryPayload.idType !== undefined ? { idType: queryPayload.idType } : {}),
      };

      if (Object.keys(resolvedFilter).length === 0) {
        reportAiPathsError(
          new Error('Database update missing query filter'),
          {
            action: 'dbUpdateOne',
            collection,
            entityType,
            entityId,
            nodeId,
          },
          'Database update failed:'
        );
        toast('Database update requires a query filter.', { variant: 'error' });
        updateResult = {
          error: 'missing_query',
          collection,
          ...(isCustomPayloadMode ? { update: customUpdateDoc } : { updates }),
        };
        executed.updater.add(nodeId);
      } else {
        const dbUpdateResult: ApiResponse<DbActionResult> = isCustomPayloadMode
          ? await dbApi.action<DbActionResult>({
            provider: queryPayload.provider,
            action: 'updateOne',
            collection,
            ...(queryPayload.collectionMap ? { collectionMap: queryPayload.collectionMap } : {}),
            filter: resolvedFilter,
            update: customUpdateDoc,
            ...(queryPayload.idType !== undefined ? { idType: queryPayload.idType } : {}),
          })
          : await dbApi.update<DbActionResult>({
            provider: queryPayload.provider,
            collection,
            ...(queryPayload.collectionMap ? { collectionMap: queryPayload.collectionMap } : {}),
            filter: resolvedFilter,
            update: updates,
            single: true,
            ...(queryPayload.idType !== undefined ? { idType: queryPayload.idType } : {}),
          });
        executed.updater.add(nodeId);
        if (!dbUpdateResult.ok) {
          reportAiPathsError(
            new Error(dbUpdateResult.error),
            {
              action: 'dbUpdateOne',
              collection,
              entityType,
              nodeId,
            },
            'Database update failed:'
          );
          toast(dbUpdateResult.error || `Failed to update ${collection}.`, {
            variant: 'error',
          });
        } else {
          updateResult = dbUpdateResult.data;
          executionMeta = {
            ...executionMeta,
            ...resolveProviderMeta(dbUpdateResult.data),
          };
          applyWriteOutcome('updateOne', dbUpdateResult.data, {
            collection,
            strategy: updateStrategy,
          });
          const modified: number = dbUpdateResult.data?.modifiedCount ?? 0;
          const matched: number = dbUpdateResult.data?.matchedCount ?? 0;
          const countLabel = modified || matched;
          if (writeOutcome.status !== 'warning') {
            toast(
              `Updated ${countLabel} document${countLabel === 1 ? '' : 's'} in ${collection}.`,
              { variant: 'success' }
            );
          }
        }
      }
    }
  }

  return {
    skipped: false,
    updateResult,
    executionMeta,
    writeOutcome,
  };
}
