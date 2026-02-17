import type {
  DatabaseConfig,
  DbQueryConfig,
  RuntimePortValues,
} from '@/shared/types/domain/ai-paths';
import type { NodeHandlerContext } from '@/shared/types/domain/ai-paths-runtime';

import { dbApi, entityApi, ApiResponse } from '../../../api';
import {
  coerceInput,
  getValueAtMappingPath,
  parseJsonSafe,
  renderJsonTemplate,
} from '../../utils';
import {
  buildDbQueryPayload,
  buildFormData,
} from '../utils';

export type HandleDatabaseInsertOperationInput = {
  node: NodeHandlerContext['node'];
  nodeInputs: RuntimePortValues;
  executed: NodeHandlerContext['executed'];
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  toast: NodeHandlerContext['toast'];
  dbConfig: DatabaseConfig;
  queryConfig: DbQueryConfig;
  dryRun: boolean;
  writeSourcePath: string;
  templateInputValue: unknown;
  templateContext: Record<string, unknown>;
  aiPrompt: string;
};

export async function handleDatabaseInsertOperation({
  node,
  nodeInputs,
  executed,
  reportAiPathsError,
  toast,
  dbConfig,
  queryConfig,
  dryRun,
  writeSourcePath,
  templateInputValue,
  templateContext,
  aiPrompt,
}: HandleDatabaseInsertOperationInput): Promise<RuntimePortValues> {
  const entityType = (dbConfig.entityType ?? 'product').trim().toLowerCase();
  const configuredCollection = queryConfig.collection?.trim() ?? '';
  const configuredCollectionKey = configuredCollection.toLowerCase();
  const forceCollectionInsert =
  configuredCollection.length > 0 &&
  !['product', 'products', 'note', 'notes'].includes(configuredCollectionKey);
  const writeSource = dbConfig.writeSource ?? 'bundle';

  // Resolve queryTemplate first (config-based payload with {{placeholder}} support),
  // falling back to the writeSource port value.
  const insertTemplate: string = queryConfig.queryTemplate?.trim() ?? '';
  const parsedTemplatePayload: unknown = insertTemplate
    ? parseJsonSafe(
      renderJsonTemplate(insertTemplate, templateContext, templateInputValue ?? ''),
    )
    : null;
  const templatePayload: unknown =
  parsedTemplatePayload && typeof parsedTemplatePayload === 'object' && !Array.isArray(parsedTemplatePayload)
    ? parsedTemplatePayload
    : null;
  const rawPayload = templatePayload ?? coerceInput(nodeInputs[writeSource]);
  const callbackInput = coerceInput(nodeInputs['queryCallback']);

  const coercePayloadObject = (value: unknown): Record<string, unknown> | null => {
    if (!value) return null;
    if (typeof value === 'string') {
      const parsed: unknown = parseJsonSafe(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return null;
  };

  let payload = coercePayloadObject(rawPayload);
  if (payload && writeSourcePath) {
    const resolved = getValueAtMappingPath(payload, writeSourcePath);
    payload = coercePayloadObject(resolved);
  }

  // Callback injection for insert: if callback is an object, merge it or use it as payload
  if (
    callbackInput &&
  typeof callbackInput === 'object' &&
  !Array.isArray(callbackInput)
  ) {
    payload = {
      ...(payload ?? {}),
      ...(callbackInput as Record<string, unknown>),
    };
  }

  let insertResult: unknown = payload;

  if (!payload) {
    const nodeTitle = node.title?.trim();
    const nodeLabel = nodeTitle ? `"${nodeTitle}"` : `node ${node.id}`;
    const writeSourceLabel = writeSourcePath
      ? `${writeSource}.${writeSourcePath}`
      : writeSource;
    reportAiPathsError(
      new Error('Database insert missing payload'),
      {
        action: 'insertEntity',
        nodeId: node.id,
        nodeTitle: nodeTitle ?? null,
        writeSource,
        writeSourcePath,
      },
      'Database insert missing payload:',
    );
    toast(
      `Database insert payload missing for ${nodeLabel} (write source: ${writeSourceLabel}).`,
      { variant: 'error' },
    );
    return {
      result: null,
      bundle: { error: 'Missing payload' },
      aiPrompt,
    };
  }

  if (!executed.updater.has(node.id)) {
    if (dryRun) {
      insertResult = {
        dryRun: true,
        entityType,
        ...(configuredCollection ? { collection: configuredCollection } : {}),
        payload,
      };
      executed.updater.add(node.id);
    } else {
      if (forceCollectionInsert) {
        const queryPayload = buildDbQueryPayload(
        templateContext as RuntimePortValues,
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
        templateContext as RuntimePortValues,
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
  }

  return {
    result: insertResult,
    bundle: insertResult as Record<string, unknown>,
    content_en:
    typeof (insertResult as Record<string, unknown>)?.['content_en'] ===
    'string'
      ? ((insertResult as Record<string, unknown>)['content_en'] as string)
      : undefined,
    aiPrompt,
  };
}
