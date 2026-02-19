import type {
  DatabaseConfig,
  RuntimePortValues,
} from '@/shared/types/domain/ai-paths';
import type { NodeHandlerContext } from '@/shared/types/domain/ai-paths-runtime';

import {
  normalizeNonEmptyString,
  normalizeParameterEntries,
  resolveExistingParameterValueFromInputs,
  toRecord,
} from './database-parameter-inference';
import { DB_PROVIDER_PLACEHOLDERS } from '../../constants';
import {
  coerceInput,
  renderTemplate,
} from '../../utils';

import type { SchemaResponse } from '../../../api/client';

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
  if (lower === 'int' || lower === 'float' || lower === 'decimal' || lower === 'number') return 'number';
  if (lower === 'boolean' || lower === 'bool') return 'boolean';
  if (lower === 'datetime' || lower === 'date') return 'string';
  if (lower === 'json') return 'Record<string, unknown>';
  return normalized || 'unknown';
};

const formatCollectionSchema = (collectionName: string, fields: Array<{ name: string; type: string }> = []): string => {
  const interfaceName = toTitleCase(singularize(collectionName));
  if (!fields.length) {
    return `interface ${interfaceName} {}`;
  }
  const lines = fields.map((field: { name: string; type: string }) => `  ${field.name}: ${normalizeSchemaType(field.type)};`);
  return `interface ${interfaceName} {\n${lines.join('\n')}\n}`;
};

const normalizeRuntimeEntityType = (value: string | null | undefined): string => {
  const normalized = normalizeNonEmptyString(value)?.toLowerCase() ?? '';
  if (normalized === 'products') return 'product';
  if (normalized === 'notes') return 'note';
  return normalized;
};

const resolveCatalogIdFromCatalogs = (value: unknown): string | null => {
  if (!Array.isArray(value)) return null;
  for (const entry of value) {
    const fromString = normalizeNonEmptyString(entry);
    if (fromString) return fromString;
    const record = toRecord(entry);
    if (!record) continue;
    const nested =
      normalizeNonEmptyString(record['catalogId']) ??
      normalizeNonEmptyString(record['id']) ??
      normalizeNonEmptyString(record['_id']) ??
      (record['catalog'] && typeof record['catalog'] === 'object'
        ? normalizeNonEmptyString(
          (record['catalog'] as Record<string, unknown>)['catalogId']
        ) ??
          normalizeNonEmptyString(
            (record['catalog'] as Record<string, unknown>)['id']
          ) ??
          normalizeNonEmptyString(
            (record['catalog'] as Record<string, unknown>)['_id']
          )
        : null);
    if (nested) return nested;
  }
  return null;
};

const resolveCatalogIdFromRecord = (
  record: Record<string, unknown> | null
): string | null => {
  if (!record) return null;
  return (
    normalizeNonEmptyString(record['catalogId']) ??
    resolveCatalogIdFromCatalogs(record['catalogs']) ??
    (record['entity'] && typeof record['entity'] === 'object'
      ? resolveCatalogIdFromRecord(record['entity'] as Record<string, unknown>)
      : null) ??
    (record['entityJson'] && typeof record['entityJson'] === 'object'
      ? resolveCatalogIdFromRecord(record['entityJson'] as Record<string, unknown>)
      : null) ??
    (record['product'] && typeof record['product'] === 'object'
      ? resolveCatalogIdFromRecord(record['product'] as Record<string, unknown>)
      : null) ??
    (record['bundle'] && typeof record['bundle'] === 'object'
      ? resolveCatalogIdFromRecord(record['bundle'] as Record<string, unknown>)
      : null)
  );
};

const resolveCatalogIdFromTemplateInputs = (
  templateInputs: RuntimePortValues
): string | null => {
  const direct =
    normalizeNonEmptyString(templateInputs['catalogId']) ??
    resolveCatalogIdFromRecord(toRecord(templateInputs));
  if (direct) return direct;

  const nestedKeys = ['context', 'bundle', 'value', 'result'];
  for (const key of nestedKeys) {
    const nested = resolveCatalogIdFromRecord(toRecord(coerceInput(templateInputs[key])));
    if (nested) return nested;
  }
  return null;
};

const withCatalogId = (value: unknown, catalogId: string): unknown => {
  const record = toRecord(value);
  if (!record) return value;
  if (normalizeNonEmptyString(record['catalogId'])) return record;
  return { ...record, catalogId };
};

const applyCatalogIdAliases = ({
  catalogId,
  templateInputs,
  templateContext,
}: {
  catalogId: string;
  templateInputs: RuntimePortValues;
  templateContext: Record<string, unknown>;
}): void => {
  if (templateInputs['catalogId'] === undefined) {
    templateInputs['catalogId'] = catalogId;
  }
  templateContext['catalogId'] = catalogId;

  const contextRecord = toRecord(templateInputs['context']);
  if (contextRecord) {
    const nextContext: Record<string, unknown> = {
      ...contextRecord,
      catalogId:
        normalizeNonEmptyString(contextRecord['catalogId']) ??
        catalogId,
      entity: withCatalogId(contextRecord['entity'], catalogId),
      entityJson: withCatalogId(contextRecord['entityJson'], catalogId),
      product: withCatalogId(contextRecord['product'], catalogId),
    };
    templateInputs['context'] = nextContext;
    templateContext['context'] = nextContext;
  }

  const bundleRecord = toRecord(templateInputs['bundle']);
  if (bundleRecord && !normalizeNonEmptyString(bundleRecord['catalogId'])) {
    const nextBundle = { ...bundleRecord, catalogId };
    templateInputs['bundle'] = nextBundle;
    templateContext['bundle'] = nextBundle;
  }
};

export type PrepareDatabaseTemplateContextInput = {
  resolvedInputs: Record<string, unknown>;
  dbConfig: DatabaseConfig;
  aiPromptTemplate: string;
  simulationEntityType: string | null;
  fallbackEntityId: string | null;
  fetchEntityCached: NodeHandlerContext['fetchEntityCached'];
  schemaData: SchemaResponse | null;
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
}: PrepareDatabaseTemplateContextInput): PrepareDatabaseTemplateContextResult {
  const templateInputValue: unknown =
    coerceInput(resolvedInputs['value']) ?? coerceInput(resolvedInputs['jobId']);

  const placeholderContext: Record<string, unknown> = {
    'Date: Current': new Date().toISOString(),
  };
  DB_PROVIDER_PLACEHOLDERS.forEach((provider: string) => {
    placeholderContext[`DB Provider: ${provider}`] = provider;
  });
  if (schemaData?.collections?.length) {
    schemaData.collections.forEach((collection) => {
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
  if (templateInputs['result'] === undefined && templateInputs['value'] !== undefined) {
    templateInputs['result'] = templateInputs['value'];
  }
  if (templateInputs['value'] === undefined && templateInputs['result'] !== undefined) {
    templateInputs['value'] = templateInputs['result'];
  }
  const templateContext: Record<string, unknown> = {
    ...templateInputs,
    ...placeholderContext,
  };
  const syncCatalogId = (): void => {
    const catalogId = resolveCatalogIdFromTemplateInputs(templateInputs);
    if (!catalogId) return;
    applyCatalogIdAliases({
      catalogId,
      templateInputs,
      templateContext,
    });
  };
  syncCatalogId();

  const ensureExistingParameterTemplateContext = async (
    targetPath: string
  ): Promise<void> => {
    if (!targetPath) return;
    const existingFromInputs = normalizeParameterEntries(
      resolveExistingParameterValueFromInputs(templateInputs, targetPath),
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
      normalizeNonEmptyString(fallbackEntityId) ??
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
      entityId:
        normalizeNonEmptyString(contextRecord['entityId']) ??
        entityId,
      productId:
        normalizeNonEmptyString(contextRecord['productId']) ??
        (entityType === 'product' ? entityId : undefined),
      entityType:
        normalizeNonEmptyString(contextRecord['entityType']) ??
        entityType,
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
    syncCatalogId();
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
