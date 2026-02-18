import type {
  DbQueryConfig,
} from '@/shared/types/domain/ai-paths';
import type { NodeHandlerContext } from '@/shared/types/domain/ai-paths-runtime';

import { dbApi, entityApi, ApiResponse } from '../../../api';
import {
  buildDbQueryPayload,
  buildFormData,
} from '../utils';

export type ExecuteDatabaseInsertInput = {
  node: NodeHandlerContext['node'];
  executed: NodeHandlerContext['executed'];
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  toast: NodeHandlerContext['toast'];
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
  queryConfig,
  templateContext,
  dryRun,
  payload,
  entityType,
  configuredCollection,
  forceCollectionInsert,
}: ExecuteDatabaseInsertInput): Promise<unknown> {
  let insertResult: unknown = payload;

  if (!executed.updater.has(node.id)) {
    if (dryRun) {
      insertResult = {
        dryRun: true,
        entityType,
        ...(configuredCollection ? { collection: configuredCollection } : {}),
        payload,
      };
      executed.updater.add(node.id);
    } else if (forceCollectionInsert) {
      const queryPayload = buildDbQueryPayload(
        templateContext,
        queryConfig,
      );
      const collection =
        queryPayload.collection?.trim() || configuredCollection || entityType;
      const customInsertPayload = {
        ...(queryPayload.provider
          ? {
            provider: queryPayload.provider,
          }
          : {}),
        action: 'insertOne' as const,
        collection,
        document: payload,
      };
      const customInsertResult: ApiResponse<unknown> = await dbApi.action(
        customInsertPayload,
      );
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
          'Database insert failed:',
        );
        toast(customInsertResult.error || `Failed to insert ${collection}.`, {
          variant: 'error',
        });
      } else {
        insertResult = customInsertResult.data;
        toast(`Inserted ${collection}`, { variant: 'success' });
      }
    } else if (entityType === 'product') {
      const productResult: ApiResponse<unknown> = await entityApi.createProduct(
        buildFormData(payload),
      );
      executed.updater.add(node.id);
      if (!productResult.ok) {
        reportAiPathsError(
          new Error(productResult.error),
          { action: 'insertEntity', entityType, nodeId: node.id },
          'Database insert failed:',
        );
        toast(`Failed to insert ${entityType}.`, { variant: 'error' });
      } else {
        insertResult = productResult.data;
        toast(`Inserted ${entityType}`, { variant: 'success' });
      }
    } else if (entityType === 'note') {
      const noteResult: ApiResponse<unknown> = await entityApi.createNote(payload);
      executed.updater.add(node.id);
      if (!noteResult.ok) {
        reportAiPathsError(
          new Error(noteResult.error),
          { action: 'insertEntity', entityType, nodeId: node.id },
          'Database insert failed:',
        );
        toast(`Failed to insert ${entityType}.`, { variant: 'error' });
      } else {
        insertResult = noteResult.data;
        toast(`Inserted ${entityType}`, { variant: 'success' });
      }
    } else {
      const queryPayload = buildDbQueryPayload(
        templateContext,
        queryConfig,
      );
      const collection =
        queryPayload.collection?.trim() ||
        queryConfig.collection?.trim() ||
        entityType;
      const customInsertPayload = {
        ...(queryPayload.provider
          ? {
            provider: queryPayload.provider,
          }
          : {}),
        action: 'insertOne' as const,
        collection,
        document: payload,
      };
      const customInsertResult: ApiResponse<unknown> = await dbApi.action(
        customInsertPayload,
      );
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
          'Database insert failed:',
        );
        toast(customInsertResult.error || `Failed to insert ${collection}.`, {
          variant: 'error',
        });
      } else {
        insertResult = customInsertResult.data;
        toast(`Inserted ${collection}`, { variant: 'success' });
      }
    }
  }

  return insertResult;
}
