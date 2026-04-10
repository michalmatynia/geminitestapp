import type { DbSchemaConfig } from '@/shared/contracts/ai-paths';
import type {
  NodeHandler,
  NodeHandlerContext,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths-runtime';
import type { CollectionSchema } from '@/shared/contracts/database';
import type { HttpResult } from '@/shared/contracts/http';
import { dbApi } from '@/shared/lib/ai-paths/api';
import type { SchemaResponse } from '@/shared/lib/ai-paths/api/client';
import { isObjectRecord } from '@/shared/utils/object-utils';
import { extractMissingTemplatePorts } from './integration-database-mongo-update-plan-helpers';
import { coerceInput, renderJsonTemplate } from '../../utils';


// Module-scoped schema cache to avoid redundant API calls across database nodes
// within the same run. TTL ensures freshness across separate runs.
let schemaCacheResult: HttpResult<unknown> | null = null;
let schemaCacheTs = 0;
const SCHEMA_CACHE_TTL_MS = 30_000;
const DEFAULT_LIVE_CONTEXT_LIMIT = 20;
const PRODUCT_CATEGORIES_COLLECTION = 'product_categories';

type LiveContextCollection = {
  name: string;
  provider: 'mongodb';
  documents: Record<string, unknown>[];
  total: number;
  limit: number;
  skip: number;
  query: string | null;
  error?: string;
};

type LiveContextPayload = {
  fetchedAt: string;
  selectedCollections: string[];
  limitPerCollection: number;
  query: string | null;
  collections: LiveContextCollection[];
  collectionMap: Record<string, LiveContextCollection>;
  errors: Array<{ collection: string; error: string }>;
};

const isCollectionSchema = (value: unknown): value is CollectionSchema =>
  isObjectRecord(value) && typeof value['name'] === 'string' && Array.isArray(value['fields']);

const resolveCollectionList = (value: unknown): CollectionSchema[] => {
  if (Array.isArray(value)) {
    return value.filter((entry: unknown): entry is CollectionSchema => isCollectionSchema(entry));
  }
  if (isObjectRecord(value)) {
    return Object.values(value).filter((entry: unknown): entry is CollectionSchema =>
      isCollectionSchema(entry)
    );
  }
  return [];
};

const cloneSchemaResponse = (schema: SchemaResponse): SchemaResponse => {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(schema);
  }
  return JSON.parse(JSON.stringify(schema)) as SchemaResponse;
};

const normalizeSelectedCollectionKey = (value: string): string => value.trim().toLowerCase();

const matchesSelectedCollection = (
  collection: CollectionSchema,
  selectedSet: Set<string>
): boolean => {
  const nameKey = normalizeSelectedCollectionKey(collection.name);
  if (selectedSet.has(nameKey)) return true;
  if (collection.provider) {
    const providerKey = normalizeSelectedCollectionKey(`${collection.provider}:${collection.name}`);
    if (selectedSet.has(providerKey)) return true;
  }
  return false;
};

const toFetchCollectionName = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed.includes(':')) return trimmed;
  return trimmed.split(':').slice(1).join(':').trim();
};

const dedupeCollectionNames = (values: string[]): string[] => {
  const seen = new Set<string>();
  const deduped: string[] = [];
  values.forEach((value: string) => {
    const normalized = normalizeSelectedCollectionKey(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    deduped.push(value.trim());
  });
  return deduped;
};

const resolveRecordString = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (value && typeof value === 'object' && typeof value.toString === 'function') {
    const resolved = value.toString();
    return typeof resolved === 'string' ? resolved.trim() : '';
  }
  return '';
};

const resolveProductCategoryLeafDocuments = (
  documents: Record<string, unknown>[]
): Record<string, unknown>[] => {
  const categories = documents
    .map((document) => {
      if (!isObjectRecord(document)) return null;
      const id = resolveRecordString(document['id']) || resolveRecordString(document['_id']);
      if (!id) return null;
      const label =
        resolveRecordString(document['name_en']) ||
        resolveRecordString(document['name']) ||
        resolveRecordString(document['name_pl']) ||
        resolveRecordString(document['name_de']) ||
        id;
      return {
        id,
        label,
        parentId: resolveRecordString(document['parentId']) || null,
        raw: document,
      };
    })
    .filter(
      (
        category
      ): category is {
        id: string;
        label: string;
        parentId: string | null;
        raw: Record<string, unknown>;
      } => category !== null
    );

  const byId = new Map(categories.map((category) => [category.id, category]));
  const parentIds = new Set(
    categories
      .map((category) => category.parentId)
      .filter((parentId): parentId is string => typeof parentId === 'string' && parentId.length > 0)
  );

  const buildFullPath = (categoryId: string, seen: Set<string> = new Set()): string => {
    const category = byId.get(categoryId);
    if (!category) return '';
    if (seen.has(categoryId)) return category.label;
    const nextSeen = new Set(seen);
    nextSeen.add(categoryId);
    if (!category.parentId || !byId.has(category.parentId)) return category.label;
    const parentPath = buildFullPath(category.parentId, nextSeen);
    return parentPath ? `${parentPath} > ${category.label}` : category.label;
  };

  return categories
    .filter((category) => !parentIds.has(category.id))
    .map((category) => ({
      ...category.raw,
      id: resolveRecordString(category.raw['id']) || category.id,
      parentId: category.parentId,
      fullPath: buildFullPath(category.id),
      leafLabel: category.label,
      isLeaf: true,
    }))
    .sort((left, right) =>
      resolveRecordString(left['fullPath']).localeCompare(resolveRecordString(right['fullPath']))
    );
};

const transformLiveContextDocuments = ({
  collectionName,
  documents,
  config,
}: {
  collectionName: string;
  documents: Record<string, unknown>[];
  config: DbSchemaConfig;
}): Record<string, unknown>[] => {
  if (
    config.contextTransform === 'product_categories_leaf_only' &&
    collectionName === PRODUCT_CATEGORIES_COLLECTION
  ) {
    return resolveProductCategoryLeafDocuments(documents);
  }
  return documents;
};

export const getCachedSchema = async (): Promise<HttpResult<unknown>> => {
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

  const rawCollections = schema.collections;
  const collections = resolveCollectionList(rawCollections);

  for (const collection of collections) {
    lines.push(`Collection: ${collection.name}`);
    lines.push('Fields:');
    const fields = collection.fields ?? [];
    for (const field of fields) {
      const markers: string[] = [];
      if (field.isId) markers.push('ID');
      if (field.isRequired) markers.push('required');
      if (field.isUnique) markers.push('unique');
      if (field.hasDefault) markers.push('has default');
      const markerStr = markers.length > 0 ? ` [${markers.join(', ')}]` : '';
      lines.push(`  - ${field.name} (${field.type})${markerStr}`);
    }
    const relations = collection.relations;
    if (relations && relations.length > 0) {
      lines.push(`Relations: ${relations.join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
};

const filterCollections = (
  schema: SchemaResponse,
  selectedCollections: string[]
): SchemaResponse => {
  if (!selectedCollections || selectedCollections.length === 0) {
    return cloneSchemaResponse(schema);
  }
  const selectedSet = new Set(
    selectedCollections.map((c: string): string => normalizeSelectedCollectionKey(c))
  );

  const clonedSchema = cloneSchemaResponse(schema);
  const baseCollections = resolveCollectionList(clonedSchema.collections);

  if (clonedSchema.provider === 'multi') {
    const collections = baseCollections.filter((c): boolean =>
      matchesSelectedCollection(c, selectedSet)
    );
    return {
      ...clonedSchema,
      collections,
    } as SchemaResponse;
  }
  const collections = baseCollections.filter((c: CollectionSchema): boolean =>
    matchesSelectedCollection(c, selectedSet)
  );
  return {
    provider: clonedSchema.provider,
    collections,
  } as SchemaResponse;
};

const formatLiveContextAsText = (payload: LiveContextPayload): string => {
  const lines: string[] = [
    'LIVE DATABASE CONTEXT',
    '=====================',
    `Fetched At: ${payload.fetchedAt}`,
    `Selected Collections: ${payload.selectedCollections.length}`,
    `Limit Per Collection: ${payload.limitPerCollection}`,
    `Query: ${payload.query ?? '(none)'}`,
    '',
  ];

  if (payload.collections.length === 0) {
    lines.push('No live context collections selected.');
    return lines.join('\n');
  }

  payload.collections.forEach((collection: LiveContextCollection) => {
    lines.push(`Collection: ${collection.name}`);
    if (collection.error) {
      lines.push(`Error: ${collection.error}`);
      lines.push('');
      return;
    }
    lines.push(`Total Matching Documents: ${collection.total}`);
    lines.push('Documents:');
    if (collection.documents.length === 0) {
      lines.push('  []');
    } else {
      collection.documents.forEach((document: Record<string, unknown>, index: number) => {
        lines.push(`  ${index + 1}. ${JSON.stringify(document)}`);
      });
    }
    lines.push('');
  });

  return lines.join('\n');
};

const resolveLiveContextCollectionKeys = (config: DbSchemaConfig): string[] => {
  const explicit = dedupeCollectionNames(config.contextCollections ?? []);
  if (explicit.length > 0) return explicit;
  if (config.mode === 'selected') {
    return dedupeCollectionNames(config.collections ?? []);
  }
  return [];
};

const loadLiveContext = async ({
  nodeId,
  config,
  nodeInputs,
  reportAiPathsError,
}: {
  nodeId: string;
  config: DbSchemaConfig;
  nodeInputs: RuntimePortValues;
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
}): Promise<LiveContextPayload | null> => {
  const selectedCollections = resolveLiveContextCollectionKeys(config);
  if (selectedCollections.length === 0) {
    return {
      fetchedAt: new Date().toISOString(),
      selectedCollections: [],
      limitPerCollection: config.contextLimit ?? DEFAULT_LIVE_CONTEXT_LIMIT,
      query: config.contextQuery?.trim() ? config.contextQuery.trim() : null,
      collections: [],
      collectionMap: {},
      errors: [],
    };
  }

  const limitPerCollection = config.contextLimit ?? DEFAULT_LIVE_CONTEXT_LIMIT;
  const fetchedAt = new Date().toISOString();
  const rawQuery = config.contextQuery?.trim() ? config.contextQuery.trim() : null;
  const missingQueryPorts =
    rawQuery && rawQuery.length > 0 ? extractMissingTemplatePorts(rawQuery, nodeInputs) : [];
  if (missingQueryPorts.length > 0) {
    const error = `Live context query is missing connected inputs: ${missingQueryPorts.join(', ')}.`;
    reportAiPathsError(
      new Error(error),
      { action: 'fetchDbLiveContext', nodeId, missingQueryPorts },
      'Database live context query resolution failed:'
    );
    return {
      fetchedAt,
      selectedCollections: selectedCollections.map((value: string) => toFetchCollectionName(value)),
      limitPerCollection,
      query: rawQuery,
      collections: selectedCollections.map(
        (selectedKey: string): LiveContextCollection => ({
          name: toFetchCollectionName(selectedKey),
          provider: 'mongodb',
          documents: [],
          total: 0,
          limit: limitPerCollection,
          skip: 0,
          query: rawQuery,
          error,
        })
      ),
      collectionMap: Object.fromEntries(
        selectedCollections.map((selectedKey: string) => {
          const collectionName = toFetchCollectionName(selectedKey);
          return [
            collectionName,
            {
              name: collectionName,
              provider: 'mongodb',
              documents: [],
              total: 0,
              limit: limitPerCollection,
              skip: 0,
              query: rawQuery,
              error,
            } satisfies LiveContextCollection,
          ];
        })
      ),
      errors: selectedCollections.map((selectedKey: string) => ({
        collection: toFetchCollectionName(selectedKey),
        error,
      })),
    };
  }
  const query =
    rawQuery && rawQuery.length > 0
      ? renderJsonTemplate(
        rawQuery,
        nodeInputs,
        coerceInput(nodeInputs['context']) ??
            coerceInput(nodeInputs['bundle']) ??
            coerceInput(nodeInputs['value']) ??
            ''
      ).trim()
      : null;
  const provider = config.provider === 'mongodb' ? 'mongodb' : 'auto';

  const collections = await Promise.all(
    selectedCollections.map(async (selectedKey): Promise<LiveContextCollection> => {
      const collectionName = toFetchCollectionName(selectedKey);
      const result = await dbApi.browse(collectionName, {
        provider,
        limit: limitPerCollection,
        ...(query ? { query } : {}),
      });

      if (!result.ok) {
        reportAiPathsError(
          new Error(result.error),
          { action: 'fetchDbLiveContext', nodeId, collection: collectionName },
          'Database live context fetch failed:'
        );
        return {
          name: collectionName,
          provider: 'mongodb',
          documents: [],
          total: 0,
          limit: limitPerCollection,
          skip: 0,
          query,
          error: result.error,
        };
      }

      const rawDocuments = result.data.documents ?? [];
      const documents = transformLiveContextDocuments({
        collectionName,
        documents: rawDocuments,
        config,
      });
      const transformedDocuments = documents !== rawDocuments;

      return {
        name: collectionName,
        provider: result.data.provider,
        documents,
        total: transformedDocuments ? documents.length : result.data.total ?? 0,
        limit: result.data.limit ?? limitPerCollection,
        skip: result.data.skip ?? 0,
        query,
      };
    })
  );

  const errors = collections
    .filter((collection: LiveContextCollection): boolean => typeof collection.error === 'string')
    .map((collection: LiveContextCollection) => ({
      collection: collection.name,
      error: collection.error as string,
    }));

  return {
    fetchedAt,
    selectedCollections: selectedCollections.map((value: string) => toFetchCollectionName(value)),
    limitPerCollection,
    query,
    collections,
    collectionMap: Object.fromEntries(
      collections.map((collection: LiveContextCollection) => [collection.name, collection])
    ),
    errors,
  };
};

export const handleDbSchema: NodeHandler = async ({
  node,
  nodeInputs,
  prevOutputs,
  executed,
  reportAiPathsError,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  if (executed.schema?.has(node.id)) return prevOutputs;

  const defaultConfig: DbSchemaConfig = {
    mode: 'all',
    collections: [],
    sourceMode: 'schema',
    contextCollections: [],
    contextQuery: '',
    contextLimit: DEFAULT_LIVE_CONTEXT_LIMIT,
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
      'Database schema fetch failed:'
    );
    return {
      schema: null,
      context: null,
    };
  }

  const fullSchema = cloneSchemaResponse(schemaResult.data as SchemaResponse);

  // Filter collections if mode is "selected"
  const schema =
    config.mode === 'selected'
      ? filterCollections(fullSchema, config.collections ?? [])
      : cloneSchemaResponse(fullSchema);

  // Optionally filter out fields or relations
  if (!config.includeFields || !config.includeRelations) {
    const baseCollections = resolveCollectionList(schema.collections);

    schema.collections = baseCollections.map((c): CollectionSchema => {
      const result: CollectionSchema = {
        name: c.name,
        fields: config.includeFields ? (c.fields ?? []) : [],
      };

      const relations = c.relations;
      if (config.includeRelations && relations) {
        result.relations = relations;
      }
      return result;
    });
  }

  // Format for AI consumption
  const schemaText =
    config.formatAs === 'text' ? formatSchemaAsText(schema) : JSON.stringify(schema, null, 2);
  const liveContext =
    config.sourceMode === 'live_context' || config.sourceMode === 'schema_and_live_context'
      ? await loadLiveContext({
        nodeId: node.id,
        config,
        nodeInputs,
        reportAiPathsError,
      })
      : null;
  const liveContextText =
    liveContext === null
      ? null
      : config.formatAs === 'text'
        ? formatLiveContextAsText(liveContext)
        : JSON.stringify(liveContext, null, 2);

  const contextText =
    config.sourceMode === 'live_context'
      ? liveContextText ?? ''
      : config.sourceMode === 'schema_and_live_context'
        ? config.formatAs === 'text'
          ? [schemaText, liveContextText].filter(Boolean).join('\n\n')
          : JSON.stringify(
            {
              schema,
              liveContext,
            },
            null,
            2
          )
        : schemaText;

  executed.schema?.add(node.id);

  return {
    // Keep ports strongly-typed:
    // - `schema` is the raw schema object (connect to "schema" inputs)
    // - `context` is an object containing both the raw schema + a text rendering for prompt/templates
    schema,
    context: {
      sourceMode: config.sourceMode,
      schema,
      schemaText,
      contextText,
      provider: schema.provider,
      collections: schema.collections,
      ...(liveContext ? { liveContext } : {}),
      ...(liveContextText ? { liveContextText } : {}),
    },
  };
};
