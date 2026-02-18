import type {
  DatabaseConfig,
  DbQueryConfig,
  RuntimePortValues,
} from '@/shared/types/domain/ai-paths';
import type { NodeHandlerContext } from '@/shared/types/domain/ai-paths-runtime';

import {
  coerceInput,
  getValueAtMappingPath,
  parseJsonSafe,
  renderJsonTemplate,
} from '../../utils';

export type ResolveDatabaseInsertPayloadInput = {
  node: NodeHandlerContext['node'];
  nodeInputs: RuntimePortValues;
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  toast: NodeHandlerContext['toast'];
  dbConfig: DatabaseConfig;
  queryConfig: DbQueryConfig;
  writeSourcePath: string;
  templateInputValue: unknown;
  templateContext: Record<string, unknown>;
  aiPrompt: string;
};

export type ResolveDatabaseInsertPayloadResult =
  | { output: RuntimePortValues }
  | {
    payload: Record<string, unknown>;
    entityType: string;
    configuredCollection: string;
    forceCollectionInsert: boolean;
  };

export function resolveDatabaseInsertPayload({
  node,
  nodeInputs,
  reportAiPathsError,
  toast,
  dbConfig,
  queryConfig,
  writeSourcePath,
  templateInputValue,
  templateContext,
  aiPrompt,
}: ResolveDatabaseInsertPayloadInput): ResolveDatabaseInsertPayloadResult {
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

  // Callback injection for insert: if callback is an object, merge it or use it as payload.
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
      output: {
        result: null,
        bundle: { error: 'Missing payload' },
        aiPrompt,
      },
    };
  }

  return {
    payload,
    entityType,
    configuredCollection,
    forceCollectionInsert,
  };
}
