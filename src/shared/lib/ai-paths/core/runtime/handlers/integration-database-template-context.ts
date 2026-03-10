import type { DatabaseConfig, RuntimePortValues } from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';
import type { CollectionSchema } from '@/shared/contracts/database';
import type { SchemaResponse } from '@/shared/lib/ai-paths/api/client';

import {
  normalizeNonEmptyString,
  normalizeParameterEntries,
  resolveExistingParameterValueFromInputs,
  toRecord,
} from './database-parameter-inference';
import { DB_PROVIDER_PLACEHOLDERS } from '../../constants';
import { coerceInput, renderTemplate } from '../../utils';


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

const normalizeSchemaType = (value: string): string => {
  const normalized = value.trim();
  const lower = normalized.toLowerCase();
  if (lower === 'string') return 'string';
  if (lower === 'int' || lower === 'float' || lower === 'decimal' || lower === 'number')
    return 'number';
  if (lower === 'boolean' || lower === 'bool') return 'boolean';
  if (lower === 'datetime' || lower === 'date') return 'string';
  if (lower === 'json') return 'Record<string, unknown>';
  return normalized || 'unknown';
};

const formatCollectionSchema = (
  collectionName: string,
  fields: Array<{ name: string; type: string }> = []
): string => {
  const interfaceName = toTitleCase(singularize(collectionName));
  if (!fields.length) {
    return `interface ${interfaceName} {}`;
  }
  const lines = fields.map(
    (field: { name: string; type: string }) =>
      `  ${field.name}: ${normalizeSchemaType(field.type)};`
  );
  return `interface ${interfaceName} {\n${lines.join('\n')}\n}`;
};

const isCollectionSchema = (value: unknown): value is CollectionSchema => {
  const record = toRecord(value);
  return Boolean(record && typeof record['name'] === 'string' && Array.isArray(record['fields']));
};

const resolveCollectionList = (value: unknown): CollectionSchema[] => {
  if (Array.isArray(value)) {
    return value.filter((entry: unknown): entry is CollectionSchema => isCollectionSchema(entry));
  }
  const record = toRecord(value);
  if (!record) return [];
  return Object.values(record).filter((entry: unknown): entry is CollectionSchema =>
    isCollectionSchema(entry)
  );
};

const normalizeRuntimeEntityType = (value: string | null | undefined): string => {
  const normalized = normalizeNonEmptyString(value)?.toLowerCase() ?? '';
  if (normalized === 'products') return 'product';
  if (normalized === 'notes') return 'note';
  return normalized;
};

export type PrepareDatabaseTemplateContextInput = {
  resolvedInputs: Record<string, unknown>;
  dbConfig: DatabaseConfig;
  aiPromptTemplate: string;
  simulationEntityType: string | null;
  fallbackEntityId: string | null;
  fetchEntityCached: NodeHandlerContext['fetchEntityCached'];
  schemaData: SchemaResponse | null;
  strictFlowMode?: boolean;
};

export type PrepareDatabaseTemplateContextResult = {
  templateInputValue: unknown;
  templateInputs: RuntimePortValues;
  templateContext: Record<string, unknown>;
  aiPrompt: string;
  ensureExistingParameterTemplateContext: (targetPath: string) => Promise<void>;
};

export function prepareDatabaseTemplateContext({
  resolvedInputs,
  dbConfig,
  aiPromptTemplate,
  simulationEntityType,
  fallbackEntityId,
  fetchEntityCached,
  schemaData,
  strictFlowMode = true,
}: PrepareDatabaseTemplateContextInput): PrepareDatabaseTemplateContextResult {
  const templateInputValue: unknown =
    resolvedInputs['value'] ?? coerceInput(resolvedInputs['jobId']);

  const placeholderContext: Record<string, unknown> = {
    'Date: Current': new Date().toISOString(),
  };
  DB_PROVIDER_PLACEHOLDERS.forEach((provider: string) => {
    placeholderContext[`DB Provider: ${provider}`] = provider;
  });
  const collections = resolveCollectionList(schemaData?.collections);
  if (collections.length) {
    collections.forEach((collection: CollectionSchema) => {
      const schemaText = formatCollectionSchema(collection.name, collection.fields ?? []);
      const displayName = toTitleCase(singularize(collection.name));
      const nameSet = new Set<string>([collection.name, displayName]);
      nameSet.forEach((name: string) => {
        placeholderContext[`Collection: ${name}`] = schemaText;
      });
    });
  }
  const templateInputs: RuntimePortValues = {
    ...resolvedInputs,
  };
  const templateContext: Record<string, unknown> = {
    ...templateInputs,
    ...placeholderContext,
  };

  const ensureExistingParameterTemplateContext = async (targetPath: string): Promise<void> => {
    if (!targetPath) return;
    const existingFromInputs = normalizeParameterEntries(
      resolveExistingParameterValueFromInputs(templateInputs, targetPath, {
        includeDerivedPorts: false,
      }),
      { allowEmptyValue: true }
    );
    if (existingFromInputs.length > 0) {
      return;
    }

    const entityId =
      normalizeNonEmptyString(templateInputs['entityId']) ??
      normalizeNonEmptyString(templateInputs['productId']) ??
      normalizeNonEmptyString(resolvedInputs['entityId']) ??
      normalizeNonEmptyString(resolvedInputs['productId']) ??
      (!strictFlowMode ? normalizeNonEmptyString(fallbackEntityId) : null) ??
      null;
    if (!entityId) {
      return;
    }

    const entityType = normalizeRuntimeEntityType(
      normalizeNonEmptyString(templateInputs['entityType']) ??
        normalizeNonEmptyString(resolvedInputs['entityType']) ??
        normalizeNonEmptyString(dbConfig.entityType) ??
        simulationEntityType ??
        'product'
    );
    if (!entityType) {
      return;
    }

    const fetchedEntity = await fetchEntityCached(entityType, entityId);
    const fetchedRecord = toRecord(fetchedEntity);
    if (!fetchedRecord) {
      return;
    }

    const contextRecord = toRecord(templateInputs['context']) ?? {};
    templateInputs['context'] = {
      ...contextRecord,
      entity: fetchedRecord,
      entityJson: fetchedRecord,
      ...(entityType === 'product' ? { product: fetchedRecord } : {}),
      entityId: normalizeNonEmptyString(contextRecord['entityId']) ?? entityId,
      productId:
        normalizeNonEmptyString(contextRecord['productId']) ??
        (entityType === 'product' ? entityId : undefined),
      entityType: normalizeNonEmptyString(contextRecord['entityType']) ?? entityType,
    };
    if (templateInputs['entityId'] === undefined) {
      templateInputs['entityId'] = entityId;
    }
    if (templateInputs['productId'] === undefined && entityType === 'product') {
      templateInputs['productId'] = entityId;
    }
    if (templateInputs['entityType'] === undefined) {
      templateInputs['entityType'] = entityType;
    }
    templateContext['context'] = templateInputs['context'];
    templateContext['entityId'] = templateInputs['entityId'];
    templateContext['productId'] = templateInputs['productId'];
    templateContext['entityType'] = templateInputs['entityType'];
  };

  const aiPrompt: string = aiPromptTemplate.trim()
    ? renderTemplate(aiPromptTemplate, templateContext, templateInputValue ?? '')
    : '';

  return {
    templateInputValue,
    templateInputs,
    templateContext,
    aiPrompt,
    ensureExistingParameterTemplateContext,
  };
}
