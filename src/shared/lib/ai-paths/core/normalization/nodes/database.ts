import {
  type AiNode,
  type DatabaseConfig,
  type DbQueryConfig,
  type DbSchemaConfig,
} from '@/shared/contracts/ai-paths';

import { DATABASE_INPUT_PORTS, DB_SCHEMA_INPUT_PORTS, DB_SCHEMA_OUTPUT_PORTS } from '../../constants';
import { ensureUniquePorts } from '../../utils/graph.ports';
import { normalizeTemplateText } from '../normalization.helpers';

const DEFAULT_DB_SCHEMA_CONFIG: DbSchemaConfig = {
  provider: 'auto',
  mode: 'all',
  collections: [],
  sourceMode: 'schema',
  contextCollections: [],
  contextQuery: '',
  contextLimit: 20,
  contextTransform: 'none',
  contextReuseMode: 'never',
  includeFields: true,
  includeRelations: true,
  formatAs: 'text',
};

const CANONICAL_LOCALIZED_PARAMETER_TARGET_PATH = 'parameters';

/**
 * Tries to automatically migrate a "custom" update template to "mapping" mode
 * if it follows a simple "$set": { "field": "{{token}}" } pattern.
 */
const tryAutoMigrateDatabaseMappings = (
  template: string
): { updatePayloadMode: 'mapping'; mappings: any[] } | null => {
  const trimmed = template.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;

  // Basic check for simple $set templates
  if (!trimmed.includes('$set')) return null;

  try {
    // Replace tokens with strings so it's valid JSON
    // Handle both quoted and unquoted tokens in the template
    const placeholderTemplate = trimmed
      .replace(/"{{\s*([^}]+)\s*}}"/g, '"__TOKEN__$1__"')
      .replace(/{{\s*([^}]+)\s*}}/g, '"__TOKEN__$1__"');

    const json = JSON.parse(placeholderTemplate);
    if (!json.$set || typeof json.$set !== 'object') return null;

    // Check if it has ANY other keys besides $set
    const keys = Object.keys(json);
    if (keys.length > 1) return null;

    const mappings: any[] = [];
    for (const [key, value] of Object.entries(json.$set)) {
      if (
        typeof value !== 'string' ||
        !value.startsWith('__TOKEN__') ||
        !value.endsWith('__')
      ) {
        return null;
      }
      const fullPath = value.substring(9, value.length - 2).trim();
      const [sourcePort, ...pathParts] = fullPath.split('.');
      const sourcePath = pathParts.join('.');

      mappings.push({
        targetPath: key,
        sourcePort,
        ...(sourcePath ? { sourcePath } : {}),
      });
    }

    return {
      updatePayloadMode: 'mapping',
      mappings,
    };
  } catch (e) {
    return null;
  }
};

export const normalizeDatabaseNode = (node: AiNode): AiNode => {
  const defaultQuery = {
    provider: 'auto' as const,
    collection: 'products',
    mode: 'custom' as const,
    preset: 'by_id' as const,
    field: '_id',
    idType: 'string' as const,
    queryTemplate: '',
    limit: 20,
    sort: '',
    projection: '',
    single: false,
  };
  const queryConfig = {
    ...defaultQuery,
    ...(node.config?.database?.query ?? {}),
  };
  const normalizedQueryConfig: DbQueryConfig = {
    ...(queryConfig as DbQueryConfig),
    queryTemplate: normalizeTemplateText(queryConfig.queryTemplate ?? ''),
  };
  const databaseConfig: DatabaseConfig = node.config?.database ?? { operation: 'query' };
  const updateTemplate = normalizeTemplateText(databaseConfig.updateTemplate ?? '');

  let mappings = databaseConfig.mappings ?? [];
  let updatePayloadMode = databaseConfig.updatePayloadMode ?? 'custom';

  if (databaseConfig.operation === 'update' && updatePayloadMode === 'custom' && updateTemplate) {
    const migration = tryAutoMigrateDatabaseMappings(updateTemplate);
    if (migration) {
      updatePayloadMode = migration.updatePayloadMode;
      mappings = migration.mappings;
    }
  }

  const inferredUseMongoActions =
    databaseConfig.useMongoActions ??
    Boolean(databaseConfig.actionCategory || databaseConfig.action);

  const forcedInputs = ['result', 'content_en', 'productId', 'entityId'];
  const parameterInferenceGuard = databaseConfig.parameterInferenceGuard
    ? {
      enabled: databaseConfig.parameterInferenceGuard.enabled ?? false,
      targetPath: databaseConfig.parameterInferenceGuard.targetPath ?? 'parameters',
      definitionsPort: databaseConfig.parameterInferenceGuard.definitionsPort ?? 'result',
      definitionsPath: databaseConfig.parameterInferenceGuard.definitionsPath ?? '',
      languageCode: databaseConfig.parameterInferenceGuard.languageCode ?? 'en',
      enforceOptionLabels: databaseConfig.parameterInferenceGuard.enforceOptionLabels ?? true,
      allowUnknownParameterIds:
          databaseConfig.parameterInferenceGuard.allowUnknownParameterIds ?? false,
    }
    : undefined;
  const localizedParameterMerge = databaseConfig.localizedParameterMerge
    ? {
      enabled: databaseConfig.localizedParameterMerge.enabled ?? false,
      targetPath:
          databaseConfig.localizedParameterMerge.targetPath ??
          CANONICAL_LOCALIZED_PARAMETER_TARGET_PATH,
      languageCode: databaseConfig.localizedParameterMerge.languageCode ?? '',
      requireFullCoverage: databaseConfig.localizedParameterMerge.requireFullCoverage ?? false,
    }
    : undefined;
  const runtimeConfig = node.config?.runtime
    ? {
      ...node.config.runtime,
      ...(node.config.runtime.waitForInputs === undefined ? { waitForInputs: true } : {}),
    }
    : { waitForInputs: true };
  return {
    ...node,
    inputs: ensureUniquePorts(node.inputs ?? [], [...DATABASE_INPUT_PORTS, ...forcedInputs]),
    outputs: ensureUniquePorts(node.outputs ?? [], ['result', 'bundle', 'content_en', 'aiPrompt']),
    config: {
      ...node.config,
      ...(runtimeConfig ? { runtime: runtimeConfig } : {}),
      database: {
        ...databaseConfig,
        operation: databaseConfig.operation ?? 'query',
        entityType: databaseConfig.entityType ?? 'product',
        idField: databaseConfig.idField ?? 'entityId',
        mode: databaseConfig.mode ?? 'replace',
        updateStrategy: databaseConfig.updateStrategy ?? 'one',
        updatePayloadMode,
        useMongoActions: inferredUseMongoActions,
        ...(databaseConfig.actionCategory ? { actionCategory: databaseConfig.actionCategory } : {}),
        ...(databaseConfig.action ? { action: databaseConfig.action } : {}),
        distinctField: databaseConfig.distinctField ?? '',
        updateTemplate,
        mappings,
        query: normalizedQueryConfig,
        writeSource: databaseConfig.writeSource ?? 'bundle',
        writeSourcePath: databaseConfig.writeSourcePath ?? '',
        dryRun: databaseConfig.dryRun ?? false,
        writeOutcomePolicy: {
          onZeroAffected: databaseConfig.writeOutcomePolicy?.onZeroAffected ?? 'fail',
        },
        ...(databaseConfig.presetId ? { presetId: databaseConfig.presetId } : {}),
        skipEmpty: databaseConfig.skipEmpty ?? false,
        trimStrings: databaseConfig.trimStrings ?? false,
        aiPrompt: databaseConfig.aiPrompt ?? '',
        validationRuleIds: databaseConfig.validationRuleIds ?? [],
        ...(parameterInferenceGuard ? { parameterInferenceGuard } : {}),
        ...(localizedParameterMerge ? { localizedParameterMerge } : {}),
      },
    },
  };
};

export const normalizeDbSchemaNode = (node: AiNode): AiNode => {
  const schemaConfig = node.config?.db_schema;
  const runtimeConfig = node.config?.runtime
    ? {
      ...node.config.runtime,
      ...(node.config.runtime.waitForInputs === undefined ? { waitForInputs: false } : {}),
    }
    : { waitForInputs: false };
  return {
    ...node,
    inputs: ensureUniquePorts(node.inputs ?? [], DB_SCHEMA_INPUT_PORTS),
    outputs: ensureUniquePorts(node.outputs ?? [], DB_SCHEMA_OUTPUT_PORTS),
    config: {
      ...node.config,
      ...(runtimeConfig ? { runtime: runtimeConfig } : {}),
      db_schema: {
        ...DEFAULT_DB_SCHEMA_CONFIG,
        ...schemaConfig,
        provider: schemaConfig?.provider === 'mongodb' ? 'mongodb' : 'auto',
      },
    },
  };
};
