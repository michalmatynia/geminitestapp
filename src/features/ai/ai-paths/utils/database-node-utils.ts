'use client';

import type { DbSchemaSnapshot } from '@/shared/types/domain/ai-paths';

import type { 
  CollectionSchema, 
  SchemaData 
} from '../components/node-config/database/types';

export const toTitleCase = (value: string): string =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const singularize = (value: string): string => {
  if (value.endsWith('ies') && value.length > 3) {
    return `${value.slice(0, -3)}y`;
  }
  if (value.endsWith('ses') && value.length > 3) {
    return value.slice(0, -2);
  }
  if (value.endsWith('s') && !value.endsWith('ss') && value.length > 1) {
    return value.slice(0, -1);
  }
  return value;
};

export const normalizeSchemaType = (value: string): string => {
  const normalized = value.trim();
  const lower = normalized.toLowerCase();
  if (lower === 'string') return 'string';
  if (lower === 'int' || lower === 'float' || lower === 'decimal' || lower === 'number') return 'number';
  if (lower === 'boolean' || lower === 'bool') return 'boolean';
  if (lower === 'datetime' || lower === 'date') return 'string';
  if (lower === 'json') return 'Record<string, unknown>';
  return normalized || 'unknown';
};

export const formatCollectionSchema = (collectionName: string, fields: Array<{ name: string; type: string }> = []): string => {
  const interfaceName = toTitleCase(singularize(collectionName));
  if (!fields.length) {
    return `interface ${interfaceName} {}`;
  }
  const lines = fields.map((field: { name: string; type: string }) => `  ${field.name}: ${normalizeSchemaType(field.type)};`);
  return `interface ${interfaceName} {\n${lines.join('\n')}\n}`;
};

export const formatCollectionLabel = (collection: CollectionSchema, includeProvider: boolean): string => {
  const baseLabel = toTitleCase(collection.name);
  if (includeProvider && collection.provider) {
    return `${baseLabel} (${collection.provider})`;
  }
  return baseLabel;
};

export const normalizeSchemaCollections = (schema: SchemaData | null): Array<CollectionSchema> => {
  if (!schema?.collections?.length) return [];
  if (schema.provider === 'multi') return schema.collections;
  return schema.collections.map((collection: CollectionSchema) => ({
    ...collection,
    provider: schema.provider,
  }));
};

export const matchesCollectionSelection = (
  collection: CollectionSchema,
  selectedSet: Set<string>
): boolean => {
  const nameKey = collection.name.toLowerCase();
  if (selectedSet.has(nameKey)) return true;
  if (collection.provider) {
    const providerKey = `${collection.provider}:${collection.name}`.toLowerCase();
    if (selectedSet.has(providerKey)) return true;
  }
  return false;
};

export const applySchemaSelection = (
  schema: SchemaData,
  schemaConfig?: { mode?: 'all' | 'selected'; collections?: string[]; includeFields?: boolean } | null
): SchemaData => {
  let collections = normalizeSchemaCollections(schema);
  if (schemaConfig?.mode === 'selected' && schemaConfig.collections?.length) {
    const selectedCollections = new Set(
      schemaConfig.collections.map((name: string) => name.toLowerCase())
    );
    collections = collections.filter((collection: CollectionSchema) =>
      matchesCollectionSelection(collection, selectedCollections)
    );
  }
  if (schemaConfig?.includeFields === false) {
    collections = collections.map((collection: CollectionSchema) => ({
      ...collection,
      fields: [],
    }));
  }
  return { ...schema, collections };
};

export const toDbSchemaSnapshotCollection = (
  collection: CollectionSchema
): DbSchemaSnapshot['collections'][number] => ({
  name: collection.name,
  fields: (collection.fields ?? []).map((field: { name: string; type: string }) => ({
    name: field.name,
    type: field.type,
  })),
  ...(collection.relations ? { relations: collection.relations } : {}),
  ...(collection.provider ? { provider: collection.provider } : {}),
});

export const toDbSchemaSnapshotSourceCollection = (
  collection: CollectionSchema
): {
  name: string;
  fields: Array<{ name: string; type: string }>;
  relations?: string[];
} => ({
  name: collection.name,
  fields: (collection.fields ?? []).map((field: { name: string; type: string }) => ({
    name: field.name,
    type: field.type,
  })),
  ...(collection.relations ? { relations: collection.relations } : {}),
});

export const toDbSchemaSnapshot = (
  schema: SchemaData,
  syncedAt: string
): DbSchemaSnapshot => {
  if (schema.provider === 'multi') {
    const sources = schema.sources
      ? Object.entries(schema.sources).reduce((acc, [provider, source]) => {
        if (!source) return acc;
        acc[provider as 'mongodb' | 'prisma'] = {
          provider: source.provider,
          collections: source.collections.map(toDbSchemaSnapshotSourceCollection),
        };
        return acc;
      }, {} as NonNullable<DbSchemaSnapshot['sources']>)
      : undefined;

    return {
      provider: 'multi',
      collections: schema.collections.map(toDbSchemaSnapshotCollection),
      ...(sources ? { sources } : {}),
      syncedAt,
    };
  }

  return {
    provider: schema.provider,
    collections: schema.collections.map(toDbSchemaSnapshotCollection),
    syncedAt,
  };
};

export const normalizeCollectionKey = (value: string): string => value.trim().toLowerCase();

export const toSnakeCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .replace(/__+/g, '_')
    .toLowerCase();

export const pluralize = (value: string): string => {
  if (!value) return value;
  if (value.endsWith('s')) return value;
  if (value.endsWith('y') && !/[aeiou]y$/.test(value)) {
    return `${value.slice(0, -1)}ies`;
  }
  if (value.endsWith('x') || value.endsWith('ch') || value.endsWith('sh') || value.endsWith('z')) {
    return `${value}es`;
  }
  return `${value}s`;
};

const PRODUCT_COLLECTION_KEYS = new Set<string>([
  'products',
  'product_drafts',
  'product_categories',
  'product_tags',
  'catalogs',
  'image_files',
  'product_listings',
  'product_ai_jobs',
]);

export const isProductCollection = (collection: string): boolean => {
  if (!collection) return false;
  const trimmed = collection.trim();
  if (!trimmed) return false;
  const lower = normalizeCollectionKey(trimmed);
  if (PRODUCT_COLLECTION_KEYS.has(lower)) return true;
  const snake = toSnakeCase(trimmed);
  if (PRODUCT_COLLECTION_KEYS.has(snake)) return true;
  if (PRODUCT_COLLECTION_KEYS.has(pluralize(snake))) return true;
  if (PRODUCT_COLLECTION_KEYS.has(pluralize(lower))) return true;
  return false;
};

export const buildSchemaPlaceholderContext = (schema: SchemaData | null): Record<string, string> => {
  const context: Record<string, string> = {};
  const collections = normalizeSchemaCollections(schema);
  if (collections.length === 0) return context;
  const isMulti = schema?.provider === 'multi';
  collections.forEach((collection: CollectionSchema) => {
    const schemaText = formatCollectionSchema(collection.name, collection.fields ?? []);
    const displayName = toTitleCase(singularize(collection.name));
    if (isMulti && collection.provider) {
      const labeledName = `${collection.name} (${collection.provider})`;
      const labeledDisplay = `${displayName} (${collection.provider})`;
      const nameSet = new Set<string>([labeledName, labeledDisplay]);
      nameSet.forEach((name: string) => {
        context[`Collection: ${name}`] = schemaText;
      });
    } else {
      const nameSet = new Set<string>([collection.name, displayName]);
      nameSet.forEach((name: string) => {
        context[`Collection: ${name}`] = schemaText;
      });
    }
  });
  return context;
};

export const toPrismaSortPresetValue = (value: string): string => {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const next: Record<string, 'asc' | 'desc'> = {};
    Object.entries(parsed).forEach(([key, val]) => {
      if (val === -1 || val === 'desc') next[key] = 'desc';
      if (val === 1 || val === 'asc') next[key] = 'asc';
    });
    return JSON.stringify(next);
  } catch {
    return value;
  }
};

export const toPrismaProjectionPresetValue = (value: string): string => {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const next: Record<string, boolean> = {};
    Object.entries(parsed).forEach(([key, val]) => {
      if (val === 1 || val === true) next[key] = true;
    });
    return JSON.stringify(next);
  } catch {
    return value;
  }
};
