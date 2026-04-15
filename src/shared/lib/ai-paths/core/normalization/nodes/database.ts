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
  const mappings = databaseConfig.mappings ?? [];
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
        updatePayloadMode: databaseConfig.updatePayloadMode ?? 'custom',
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
