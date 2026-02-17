import type {
  DatabaseConfig,
  DbQueryConfig,
  RuntimePortValues,
  DatabaseOperation,
} from '@/shared/types/domain/ai-paths';
import type { NodeHandler, NodeHandlerContext } from '@/shared/types/domain/ai-paths-runtime';

import {
  ParameterInferenceGateError,
  normalizeNonEmptyString,
  normalizeParameterEntries,
  resolveExistingParameterValueFromInputs,
  toRecord,
} from './database-parameter-inference';
import { handleDatabaseMongoAction } from './integration-database-mongo-actions';
import { handleDatabaseStandardOperation } from './integration-database-operations';
import { getCachedSchema } from './integration-schema-handler';
import { DEFAULT_DB_QUERY, DB_PROVIDER_PLACEHOLDERS } from '../../constants';
import {
  coerceInput,
  renderTemplate,
} from '../../utils';

import type { SchemaResponse } from '../../../api/client';

export const handleDatabase: NodeHandler = async ({
  node,
  nodeInputs,
  prevOutputs,
  executed,
  reportAiPathsError,
  toast,
  fetchEntityCached,
  simulationEntityType,
  simulationEntityId,
  triggerContext,
  fallbackEntityId,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  try {
    const resolveDatabaseInputs = (inputs: Record<string, unknown>): Record<string, unknown> => {
      const next: Record<string, unknown> = { ...inputs };
      const pickString = (value: unknown): string | undefined =>
        typeof value === 'string' && (value).trim().length > 0
          ? (value).trim()
          : undefined;
      const pickFromContext = (
        ctx: Record<string, unknown> | null | undefined,
      ): void => {
        if (!ctx || typeof ctx !== 'object') return;
        const entityId: string | undefined =
        pickString(ctx['entityId']) ??
        pickString(ctx['productId']) ??
        pickString(ctx['id']) ??
        pickString(ctx['_id']);
        const productId: string | undefined =
        pickString(ctx['productId']) ??
        pickString(ctx['entityId']) ??
        pickString(ctx['id']) ??
        pickString(ctx['_id']);
        const entityType: string | undefined = pickString(ctx['entityType']);
        if (next['entityId'] === undefined && entityId) next['entityId'] = entityId;
        if (next['productId'] === undefined && productId) next['productId'] = productId;
        if (next['entityType'] === undefined && entityType)
          next['entityType'] = entityType;
      };
      const applyFromObject = (record: Record<string, unknown>): void => {
        const entityId: string | undefined =
        pickString(record['entityId']) ??
        pickString(record['productId']) ??
        pickString(record['id']) ??
        pickString(record['_id']);
        const productId: string | undefined =
        pickString(record['productId']) ??
        pickString(record['entityId']) ??
        pickString(record['id']) ??
        pickString(record['_id']);
        const entityType: string | undefined = pickString(record['entityType']);
        if (next['entityId'] === undefined && entityId) next['entityId'] = entityId;
        if (next['productId'] === undefined && productId) next['productId'] = productId;
        if (next['entityType'] === undefined && entityType)
          next['entityType'] = entityType;
      };
      const contextValue: unknown = coerceInput(inputs['context']);
      if (contextValue && typeof contextValue === 'object') {
        applyFromObject(contextValue as Record<string, unknown>);
      }
      const metaValue: unknown = coerceInput(inputs['meta']);
      if (metaValue && typeof metaValue === 'object') {
        applyFromObject(metaValue as Record<string, unknown>);
      }
      const bundleValue: unknown = coerceInput(inputs['bundle']);
      if (bundleValue && typeof bundleValue === 'object') {
        applyFromObject(bundleValue as Record<string, unknown>);
      }
      pickFromContext(triggerContext as Record<string, unknown>);
      if (next['entityId'] === undefined && fallbackEntityId) {
        next['entityId'] = fallbackEntityId;
      }
      if (next['productId'] === undefined && next['entityId']) {
        next['productId'] = next['entityId'];
      }
      if (next['entityType'] === undefined && simulationEntityType) {
        next['entityType'] = simulationEntityType;
      }
      if (next['value'] === undefined) {
        const fallbackValue =
        (typeof next['entityId'] === 'string' && (next['entityId']).trim() ? next['entityId'] : undefined) ??
        (typeof next['productId'] === 'string' && (next['productId']).trim() ? next['productId'] : undefined);
        if (fallbackValue) {
          next['value'] = fallbackValue;
        }
      }
      return next;
    };
    const resolvedInputs: Record<string, unknown> = resolveDatabaseInputs(
    nodeInputs as Record<string, unknown>,
    );
    const nodeInputPorts: string[] = Array.isArray(node.inputs) ? node.inputs : [];
    const defaultQuery: DbQueryConfig = DEFAULT_DB_QUERY;
    const dbConfig: DatabaseConfig = (node.config?.database as DatabaseConfig) ?? {
      operation: 'query',
      entityType: 'product',
      idField: 'entityId',
      mode: 'replace',
      mappings: [],
      query: defaultQuery,
      writeSource: 'bundle',
      writeSourcePath: '',
      dryRun: false,
    };
    const operation: DatabaseOperation = dbConfig.operation ?? 'query';
    const queryConfig: DbQueryConfig = { ...defaultQuery, ...(dbConfig.query ?? {}) };
    const dryRun: boolean = dbConfig.dryRun ?? false;
    const writeSourcePath: string = dbConfig.writeSourcePath?.trim() ?? '';
    const aiPromptTemplate: string = dbConfig.aiPrompt ?? '';
    const useMongoActions: boolean = Boolean(
      dbConfig.useMongoActions && dbConfig.actionCategory && dbConfig.action,
    );

    const templateInputValue: unknown =
    coerceInput(resolvedInputs['value']) ?? coerceInput(resolvedInputs['jobId']);
    const templateSources: string[] = [
      aiPromptTemplate,
      queryConfig.queryTemplate ?? '',
      dbConfig.updateTemplate ?? '',
    ].filter((value: string): boolean => value.trim().length > 0);
    const wantsSchemaPlaceholders = templateSources.some((value: string) =>
      value.includes('{{Collection:')
    );
    const schemaInput = resolvedInputs['schema'];
    let schemaData: SchemaResponse | null = null;
    if (wantsSchemaPlaceholders) {
      if (
        schemaInput &&
      typeof schemaInput === 'object' &&
      'collections' in (schemaInput as Record<string, unknown>)
      ) {
        schemaData = schemaInput as SchemaResponse;
      } else {
        const schemaResult = await getCachedSchema();
        if (schemaResult.ok) {
          schemaData = schemaResult.data as SchemaResponse;
        }
      }
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
    const normalizeRuntimeEntityType = (value: string | null | undefined): string => {
      const normalized = normalizeNonEmptyString(value)?.toLowerCase() ?? '';
      if (normalized === 'products') return 'product';
      if (normalized === 'notes') return 'note';
      return normalized;
    };
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
    };
    const aiPrompt: string = aiPromptTemplate.trim()
      ? renderTemplate(aiPromptTemplate, templateContext, templateInputValue ?? '')
      : '';

    if (useMongoActions) {
      const mongoActionResult = await handleDatabaseMongoAction({
        node,
        nodeInputs,
        prevOutputs,
        executed,
        reportAiPathsError,
        toast,
        simulationEntityType,
        simulationEntityId,
        resolvedInputs,
        nodeInputPorts,
        dbConfig,
        queryConfig,
        dryRun,
        templateInputValue,
        templateInputs,
        templateContext,
        aiPrompt,
        ensureExistingParameterTemplateContext,
      });
      if (mongoActionResult) {
        return mongoActionResult;
      }
    }

    return await handleDatabaseStandardOperation({
      operation,
      node,
      nodeInputs,
      prevOutputs,
      executed,
      reportAiPathsError,
      toast,
      simulationEntityType,
      simulationEntityId,
      resolvedInputs,
      nodeInputPorts,
      dbConfig,
      queryConfig,
      dryRun,
      writeSourcePath,
      templateInputValue,
      templateInputs,
      templateContext,
      aiPrompt,
      ensureExistingParameterTemplateContext,
    });
  } catch (error) {
    if (error instanceof ParameterInferenceGateError) {
      throw error;
    }
    reportAiPathsError(
      error,
      { action: 'handleDatabase', nodeId: node.id },
      'Unexpected database node failure:',
    );
    return {
      result: null,
      bundle: { error: error instanceof Error ? error.message : 'Unknown database error' },
    };
  }
};
