import type {
  DatabaseConfig,
  DatabaseWriteOutcome,
  DbQueryConfig,
} from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

import { dbApi, entityApi, ApiResponse } from '@/shared/lib/ai-paths/api';
import { buildDbQueryPayload, buildFormData } from '../utils';
import {
  evaluateWriteOutcome,
  resolveWriteOutcomePolicy,
} from './integration-database-write-guardrails';

export type ExecuteDatabaseInsertInput = {
  node: NodeHandlerContext['node'];
  executed: NodeHandlerContext['executed'];
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  toast: NodeHandlerContext['toast'];
  dbConfig: DatabaseConfig;
  queryConfig: DbQueryConfig;
  templateContext: Record<string, unknown>;
  dryRun: boolean;
  payload: Record<string, unknown>;
  entityType: string;
  configuredCollection: string;
  forceCollectionInsert: boolean;
};

export async function executeDatabaseInsert({
  node,
  executed,
  reportAiPathsError,
  toast,
  dbConfig,
  queryConfig,
  templateContext,
  dryRun,
  payload,
  entityType,
  configuredCollection,
  forceCollectionInsert,
}: ExecuteDatabaseInsertInput): Promise<unknown> {
  let insertResult: unknown = payload;
  let writeOutcome: DatabaseWriteOutcome = {
    status: 'success',
    operation: 'insert',
  };

  const applyInsertWriteOutcome = (
    action: string,
    resultPayload: unknown,
    context: Record<string, unknown>
  ): void => {
    const outcome = evaluateWriteOutcome({
      operation: 'insert',
      action,
      result: resultPayload,
      policy: resolveWriteOutcomePolicy(dbConfig),
    });
    writeOutcome = outcome.writeOutcome;
    if (!outcome.isZeroAffected) return;
    const message =
      outcome.writeOutcome.message ?? `Database write affected 0 records for insert (${action}).`;
    if (outcome.writeOutcome.status === 'failed') {
      reportAiPathsError(
        new Error(message),
        {
          action: 'dbWriteOutcome',
          nodeId: node.id,
          ...context,
          writeOutcome: outcome.writeOutcome,
        },
        'Database insert failed:'
      );
      toast(message, { variant: 'error' });
      throw new Error(message);
    }
    toast(message, { variant: 'warning' });
  };

  if (!executed.updater.has(node.id)) {
    if (dryRun) {
      insertResult = {
        dryRun: true,
        entityType,
        ...(configuredCollection ? { collection: configuredCollection } : {}),
        payload,
      };
      writeOutcome = {
        status: 'success',
        operation: 'insert',
      };
      executed.updater.add(node.id);
    } else if (forceCollectionInsert) {
      const queryPayload = buildDbQueryPayload(templateContext, queryConfig);
      const collection = queryPayload.collection?.trim() || configuredCollection || entityType;
      const customInsertPayload = {
        ...(queryPayload.provider
          ? {
              provider: queryPayload.provider,
            }
          : {}),
        ...(queryPayload.collectionMap
          ? {
              collectionMap: queryPayload.collectionMap,
            }
          : {}),
        action: 'insertOne' as const,
        collection,
        document: payload,
      };
      const customInsertResult: ApiResponse<unknown> = await dbApi.action(customInsertPayload);
      executed.updater.add(node.id);
      if (!customInsertResult.ok) {
        reportAiPathsError(
          new Error(customInsertResult.error),
          {
            action: 'insertEntity',
            entityType,
            collection,
            nodeId: node.id,
          },
          'Database insert failed:'
        );
        toast(customInsertResult.error || `Failed to insert ${collection}.`, {
          variant: 'error',
        });
      } else {
        insertResult = customInsertResult.data;
        applyInsertWriteOutcome('insertOne', customInsertResult.data, {
          collection,
        });
        if (writeOutcome.status !== 'warning') {
          toast(`Inserted ${collection}`, { variant: 'success' });
        }
      }
    } else if (entityType === 'product') {
      const productResult: ApiResponse<unknown> = await entityApi.createProduct(
        buildFormData(payload)
      );
      executed.updater.add(node.id);
      if (!productResult.ok) {
        reportAiPathsError(
          new Error(productResult.error),
          { action: 'insertEntity', entityType, nodeId: node.id },
          'Database insert failed:'
        );
        toast(`Failed to insert ${entityType}.`, { variant: 'error' });
      } else {
        insertResult = productResult.data;
        applyInsertWriteOutcome('entityCreate', productResult.data, {
          entityType,
        });
        if (writeOutcome.status !== 'warning') {
          toast(`Inserted ${entityType}`, { variant: 'success' });
        }
      }
    } else if (entityType === 'note') {
      const noteResult: ApiResponse<unknown> = await entityApi.createNote(payload);
      executed.updater.add(node.id);
      if (!noteResult.ok) {
        reportAiPathsError(
          new Error(noteResult.error),
          { action: 'insertEntity', entityType, nodeId: node.id },
          'Database insert failed:'
        );
        toast(`Failed to insert ${entityType}.`, { variant: 'error' });
      } else {
        insertResult = noteResult.data;
        applyInsertWriteOutcome('entityCreate', noteResult.data, {
          entityType,
        });
        if (writeOutcome.status !== 'warning') {
          toast(`Inserted ${entityType}`, { variant: 'success' });
        }
      }
    } else {
      const queryPayload = buildDbQueryPayload(templateContext, queryConfig);
      const collection =
        queryPayload.collection?.trim() || queryConfig.collection?.trim() || entityType;
      const customInsertPayload = {
        ...(queryPayload.provider
          ? {
              provider: queryPayload.provider,
            }
          : {}),
        ...(queryPayload.collectionMap
          ? {
              collectionMap: queryPayload.collectionMap,
            }
          : {}),
        action: 'insertOne' as const,
        collection,
        document: payload,
      };
      const customInsertResult: ApiResponse<unknown> = await dbApi.action(customInsertPayload);
      executed.updater.add(node.id);
      if (!customInsertResult.ok) {
        reportAiPathsError(
          new Error(customInsertResult.error),
          {
            action: 'insertEntity',
            entityType,
            collection,
            nodeId: node.id,
          },
          'Database insert failed:'
        );
        toast(customInsertResult.error || `Failed to insert ${collection}.`, {
          variant: 'error',
        });
      } else {
        insertResult = customInsertResult.data;
        applyInsertWriteOutcome('insertOne', customInsertResult.data, {
          collection,
        });
        if (writeOutcome.status !== 'warning') {
          toast(`Inserted ${collection}`, { variant: 'success' });
        }
      }
    }
  }

  if (insertResult && typeof insertResult === 'object' && !Array.isArray(insertResult)) {
    return {
      ...(insertResult as Record<string, unknown>),
      writeOutcome,
    };
  }
  return insertResult;
}
