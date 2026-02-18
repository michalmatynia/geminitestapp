import type {
  DatabaseConfig,
  DbQueryConfig,
} from '@/shared/types/domain/ai-paths';
import type { NodeHandlerContext } from '@/shared/types/domain/ai-paths-runtime';

import { dbApi, entityApi, ApiResponse } from '../../../api';
import { buildDbQueryPayload } from '../utils';

interface DbActionResult {
  items?: unknown[];
  item?: unknown;
  values?: unknown[];
  count?: number;
  modifiedCount?: number;
  matchedCount?: number;
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
};

export type ExecuteDatabaseUpdateResult =
  | { skipped: true }
  | { skipped: false; updateResult: unknown };

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
}: ExecuteDatabaseUpdateInput): Promise<ExecuteDatabaseUpdateResult> {
  let updateResult: unknown = updates;

  if (updateStrategy === 'many') {
    const queryPayload = buildDbQueryPayload(
      resolvedInputs,
      queryConfig,
    );
    const query = queryPayload['query'] ?? {};
    const hasQuery =
      query && typeof query === 'object' && Object.keys(query).length > 0;

    if (
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
          updates,
          mode: dbConfig.mode ?? 'replace',
        };
        executed.updater.add(nodeId);
      } else {
        const dbUpdateResult: ApiResponse<DbActionResult> = await dbApi.update<DbActionResult>({
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
      if (shouldUseEntityUpdate) {
        updateResult = {
          dryRun: true,
          entityType,
          entityId: entityId || undefined,
          updates,
          mode: dbConfig.mode ?? 'replace',
        };
      } else {
        const {
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
        updateResult = {
          dryRun: true,
          updateMany: false,
          collection,
          query,
          updates,
          mode: dbConfig.mode ?? 'replace',
        };
      }
      executed.updater.add(nodeId);
    } else if (shouldUseEntityUpdate) {
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

      if (Object.keys(query).length === 0) {
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
        updateResult = { error: 'missing_query', collection, updates };
        executed.updater.add(nodeId);
      } else {
        const dbUpdateResult: ApiResponse<DbActionResult> = await dbApi.update<DbActionResult>({
          provider: queryPayload.provider,
          collection,
          query,
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
  };
}
