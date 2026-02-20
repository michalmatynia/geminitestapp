import type { CollectionSchemaDto } from '@/shared/contracts/database';
import type { DbSchemaConfig } from '@/shared/contracts/ai-paths';
import type { NodeHandler, NodeHandlerContext, RuntimePortValues } from '@/shared/contracts/ai-paths-runtime';

import { dbApi, type ApiResponse } from '../../../api';

import type { SchemaResponse } from '../../../api/client';

// Module-scoped schema cache to avoid redundant API calls across database nodes
// within the same run. TTL ensures freshness across separate runs.
let schemaCacheResult: ApiResponse<unknown> | null = null;
let schemaCacheTs = 0;
const SCHEMA_CACHE_TTL_MS = 30_000;

export const getCachedSchema = async (): Promise<ApiResponse<unknown>> => {
  const now = Date.now();
  if (schemaCacheResult && schemaCacheResult.ok && now - schemaCacheTs < SCHEMA_CACHE_TTL_MS) {
    return schemaCacheResult;
  }
  const result = await dbApi.schema();
  if (result.ok) {
    schemaCacheResult = result;
    schemaCacheTs = now;
  }
  return result;
};

const formatSchemaAsText = (schema: SchemaResponse): string => {
  const lines: string[] = [
    'DATABASE SCHEMA',
    '===============',
    `Provider: ${schema.provider}`,
    '',
  ];

  for (const collection of schema.collections) {
    lines.push(`Collection: ${collection.name}`);
    lines.push('Fields:');
    for (const field of collection.fields ?? []) {
      const markers: string[] = [];
      if (field.isId) markers.push('ID');
      if (field.isRequired) markers.push('required');
      if (field.isUnique) markers.push('unique');
      if (field.hasDefault) markers.push('has default');
      const markerStr = markers.length > 0 ? ` [${markers.join(', ')}]` : '';
      lines.push(`  - ${field.name} (${field.type})${markerStr}`);
    }
    if (collection.relations && collection.relations.length > 0) {
      lines.push(`Relations: ${collection.relations.join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
};

const filterCollections = (
  schema: SchemaResponse,
  selectedCollections: string[],
): SchemaResponse => {
  if (!selectedCollections || selectedCollections.length === 0) {
    return schema;
  }
  const selectedSet = new Set(selectedCollections.map((c: string): string => c.toLowerCase()));
  if (schema.provider === 'multi') {
    const collections = schema.collections.filter((c): boolean =>
      selectedSet.has(c.name.toLowerCase()),
    );
    return {
      ...schema,
      collections,
    };
  }
  const collections = schema.collections.filter((c: CollectionSchemaDto): boolean =>
    selectedSet.has(c.name.toLowerCase()),
  );
  return {
    provider: schema.provider,
    collections,
  };
};

export const handleDbSchema: NodeHandler = async ({
  node,
  prevOutputs,
  executed,
  reportAiPathsError,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  if (executed.schema?.has(node.id)) return prevOutputs;

  const defaultConfig: DbSchemaConfig = {
    mode: 'all',
    collections: [],
    includeFields: true,
    includeRelations: true,
    formatAs: 'text',
  };

  const config: DbSchemaConfig = {
    ...defaultConfig,
    ...(node.config?.db_schema ?? {}),
  };

  const schemaResult = await getCachedSchema();
  if (!schemaResult.ok) {
    reportAiPathsError(
      new Error(schemaResult.error),
      { action: 'fetchDbSchema', nodeId: node.id },
      'Database schema fetch failed:',
    );
    return {
      schema: null,
      context: null,
    };
  }

  const fullSchema = schemaResult.data as SchemaResponse;

  // Filter collections if mode is "selected"
  const schema =
    config.mode === 'selected'
      ? filterCollections(fullSchema, config.collections ?? [])
      : fullSchema;

  // Optionally filter out fields or relations
  if (!config.includeFields || !config.includeRelations) {
    schema.collections = schema.collections.map((c: CollectionSchemaDto): CollectionSchemaDto => {
      const result: CollectionSchemaDto = {
        name: c.name,
        fields: config.includeFields ? (c.fields ?? []) : [],
      };
      if (config.includeRelations && c.relations) {
        result.relations = c.relations;
      }
      return result;
    });
  }

  // Format for AI consumption
  const schemaText =
    config.formatAs === 'text'
      ? formatSchemaAsText(schema)
      : JSON.stringify(schema, null, 2);

  executed.schema?.add(node.id);

  return {
    // Keep ports strongly-typed:
    // - `schema` is the raw schema object (connect to "schema" inputs)
    // - `context` is an object containing both the raw schema + a text rendering for prompt/templates
    schema,
    context: {
      schema,
      schemaText,
      provider: schema.provider,
      collections: schema.collections,
    },
  };
};
