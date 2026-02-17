import type { CollectionSchema, FieldSchema, SchemaData } from './types';

export function extractCodeSnippets(text: string): string[] {
  const regex = /```[\w]*\n?([\s\S]*?)```/g;
  const snippets: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const code = match[1]?.trim();
    if (code) snippets.push(code);
  }
  return snippets;
}

const toTitleCase = (value: string): string =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const singularize = (value: string): string => {
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

export const formatCollectionDisplayName = (collectionName: string): string =>
  toTitleCase(singularize(collectionName));

const normalizeSchemaType = (value: string): string => {
  const normalized = value.trim();
  const lower = normalized.toLowerCase();
  if (lower === 'string') return 'string';
  if (lower === 'int' || lower === 'float' || lower === 'decimal' || lower === 'number') return 'number';
  if (lower === 'boolean' || lower === 'bool') return 'boolean';
  if (lower === 'datetime' || lower === 'date') return 'string';
  if (lower === 'json') return 'Record<string, unknown>';
  return normalized || 'unknown';
};

export const formatCollectionSchema = (collectionName: string, fields: FieldSchema[]): string => {
  const interfaceName = toTitleCase(singularize(collectionName));
  if (!fields || fields.length === 0) {
    return `interface ${interfaceName} {}`;
  }
  const lines = fields.map((field: FieldSchema) => `  ${field.name}: ${normalizeSchemaType(field.type)};`);
  return `interface ${interfaceName} {\n${lines.join('\n')}\n}`;
};

export const normalizeSchemaCollections = (schema: SchemaData | null): CollectionSchema[] => {
  if (!schema?.collections?.length) return [];
  if (schema.provider === 'multi') return schema.collections;
  return schema.collections.map((collection: CollectionSchema) => ({
    ...collection,
    provider: schema.provider,
  }));
};

export const formatCollectionLabel = (
  collection: CollectionSchema,
  isMulti: boolean
): string =>
  isMulti && collection.provider ? `${collection.name} (${collection.provider})` : collection.name;
