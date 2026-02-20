import type {
  DatabaseConfig,
  DbQueryConfig,
} from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

import { dbApi, entityApi, ApiResponse } from '../../../api';
import { buildDbQueryPayload } from '../utils';

interface DbActionResult {
  items?: unknown[];
  item?: unknown;
  values?: unknown[];
  count?: number;
  modifiedCount?: number;
  matchedCount?: number;
  provider?: 'mongodb' | 'prisma';
  requestedProvider?: 'auto' | 'mongodb' | 'prisma';
  resolvedProvider?: 'mongodb' | 'prisma';
  fallback?: Record<string, unknown>;
}

type ResolveCollectionUpdateContextInput = {
  resolvedInputs: Record<string, unknown>;
  queryConfig: DbQueryConfig;
  entityId: string | null;
  idField: string;
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
  entityId,
  idField,
  configuredCollection,
  entityType,
}: ResolveCollectionUpdateContextInput): ResolveCollectionUpdateContextResult => {
  const queryPayload = buildDbQueryPayload(
    resolvedInputs,
    queryConfig,
  );
  const queryFromPayload =
    queryPayload['query'] &&
    typeof queryPayload['query'] === 'object' &&
    !Array.isArray(queryPayload['query'])
      ? queryPayload['query']
      : {};
  const query =
    Object.keys(queryFromPayload).length > 0
      ? queryFromPayload
      : entityId && idField.trim().length > 0
        ? { [idField]: entityId }
        : {};
  const collection =
    (queryPayload['collection'] as string | undefined)?.trim() || configuredCollection || entityType;
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
  idField: string;
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
  };

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const resolveProviderMeta = (
  responseData: unknown
): Record<string, unknown> => {
  if (!isPlainRecord(responseData)) return {};
  const requestedProvider =
    responseData['requestedProvider'] === 'auto' ||
    responseData['requestedProvider'] === 'mongodb' ||
    responseData['requestedProvider'] === 'prisma'
      ? responseData['requestedProvider']
      : undefined;
  const resolvedProvider =
    responseData['resolvedProvider'] === 'mongodb' ||
    responseData['resolvedProvider'] === 'prisma'
      ? responseData['resolvedProvider']
      : responseData['provider'] === 'mongodb' || responseData['provider'] === 'prisma'
        ? responseData['provider']
        : undefined;
  const fallback = isPlainRecord(responseData['fallback'])
    ? responseData['fallback']
    : undefined;
  return {
    ...(requestedProvider ? { requestedProvider } : {}),
    ...(resolvedProvider ? { resolvedProvider } : {}),
    ...(fallback ? { providerFallback: fallback } : {}),
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
  idField,
  entityId,
  configuredCollection,
  updatePayloadMode = 'mapping',
  customFilter,
  customUpdateDoc,
}: ExecuteDatabaseUpdateInput): Promise<ExecuteDatabaseUpdateResult> {
  const isCustomPayloadMode = updatePayloadMode === 'custom';
  let updateResult: unknown = updates;
  let executionMeta: Record<string, unknown> = {
    mode: updatePayloadMode,
    strategy: updateStrategy,
  };

  if (updateStrategy === 'many') {
    const queryPayload = buildDbQueryPayload(
      resolvedInputs,
      queryConfig,
    );
    const queryFromPayload =
      queryPayload['query'] &&
      typeof queryPayload['query'] === 'object' &&
      !Array.isArray(queryPayload['query'])
        ? queryPayload['query']
        : {};
    const query =
      isCustomPayloadMode && customFilter
        ? customFilter
        : queryFromPayload;
    const hasQuery =
      query && typeof query === 'object' && Object.keys(query).length > 0;

    executionMeta = {
      ...executionMeta,
      action: isCustomPayloadMode ? 'updateMany' : 'dbUpdateMany',
      collection: queryPayload['collection'],
      filter: query,
      update: isCustomPayloadMode ? customUpdateDoc : updates,
      requestedProvider: queryPayload.provider,
      ...(queryPayload.idType !== undefined ? { idType: queryPayload.idType } : {}),
    };

    if (
      !isCustomPayloadMode &&
      dbConfig.mode === 'append' &&
      !executed.updater.has(nodeId)
    ) {
      reportAiPathsError(
        new Error('Append mode is not supported for update many'),
        { action: 'updateMany', nodeId },
        'Database update many failed:',
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
      return { skipped: true };
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
            filter: query,
            update: customUpdateDoc,
            ...(queryPayload.idType !== undefined ? { idType: queryPayload.idType } : {}),
          })
          : await dbApi.update<DbActionResult>({
            provider: queryPayload.provider,
            collection: queryPayload.collection,
            query,
            updates,
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
            'Database update many failed:',
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
          const modified: number =
            (dbUpdateResult.data as Record<string, unknown>)?.['modifiedCount'] as number ?? 0;
          const matched: number =
            (dbUpdateResult.data as Record<string, unknown>)?.['matchedCount'] as number ?? 0;
          const countLabel = modified || matched;
          toast(
            `Updated ${countLabel} document${countLabel === 1 ? '' : 's'} in ${queryPayload['collection']}.`,
            { variant: 'success' },
          );
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
        const {
          query,
          collection,
          queryPayload,
        } = resolveCollectionUpdateContext({
          resolvedInputs,
          queryConfig,
          entityId,
          idField,
          configuredCollection,
          entityType,
        });
        const resolvedFilter =
          isCustomPayloadMode && customFilter
            ? customFilter
            : query;
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
        return { skipped: true };
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
        executed.updater.add(nodeId);
        const suffix = entityId ? ` ${entityId}` : '';
        toast(`Updated ${entityType}${suffix}`, { variant: 'success' });
      } catch (error: unknown) {
        reportAiPathsError(
          error,
          { action: 'updateEntity', entityType, entityId, nodeId },
          'Database update failed:',
        );
        toast(`Failed to update ${entityType}.`, { variant: 'error' });
        executed.updater.add(nodeId);
      }
    } else {
      const {
        queryPayload,
        query,
        collection,
      } = resolveCollectionUpdateContext({
        resolvedInputs,
        queryConfig,
        entityId,
        idField,
        configuredCollection,
        entityType,
      });
      const resolvedFilter =
        isCustomPayloadMode && customFilter
          ? customFilter
          : query;
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
          'Database update failed:',
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
            filter: resolvedFilter,
            update: customUpdateDoc,
            ...(queryPayload.idType !== undefined ? { idType: queryPayload.idType } : {}),
          })
          : await dbApi.update<DbActionResult>({
            provider: queryPayload.provider,
            collection,
            query: resolvedFilter,
            updates,
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
            'Database update failed:',
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
          const modified: number = dbUpdateResult.data?.modifiedCount ?? 0;
          const matched: number = dbUpdateResult.data?.matchedCount ?? 0;
          const countLabel = modified || matched;
          toast(
            `Updated ${countLabel} document${countLabel === 1 ? '' : 's'} in ${collection}.`,
            { variant: 'success' },
          );
        }
      }
    }
  }

  return {
    skipped: false,
    updateResult,
    executionMeta,
  };
}
