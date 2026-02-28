import { type AiNode, type DatabaseConfig, type DbQueryConfig } from '@/shared/contracts/ai-paths';
import { DATABASE_INPUT_PORTS } from '../../constants';
import { ensureUniquePorts } from '../../utils';
import { migrateLegacyDbQueryProvider, normalizeTemplateText } from '../normalization.helpers';

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
  const legacyDbQuery = (node.config as Record<string, unknown> | undefined)?.['dbQuery'];
  const queryConfig = {
    ...defaultQuery,
    ...(node.config?.database?.query ??
      (legacyDbQuery && typeof legacyDbQuery === 'object'
        ? (legacyDbQuery as Record<string, unknown>)
        : {})),
  };
  const migratedQueryConfig = migrateLegacyDbQueryProvider(queryConfig as DbQueryConfig);
  const databaseConfig: DatabaseConfig = node.config?.database ?? { operation: 'query' };
  const mappings = databaseConfig.mappings ?? [];
  const forcedInputs = ['result', 'content_en', 'productId', 'entityId'];
  const inferredUseMongoActions =
    databaseConfig.useMongoActions ??
    Boolean(databaseConfig.actionCategory || databaseConfig.action);
  const parameterInferenceGuard = databaseConfig.parameterInferenceGuard
    ? {
        enabled: databaseConfig.parameterInferenceGuard.enabled ?? false,
        targetPath: databaseConfig.parameterInferenceGuard.targetPath ?? 'parameters',
        definitionsPort: databaseConfig.parameterInferenceGuard.definitionsPort ?? 'result',
        definitionsPath: databaseConfig.parameterInferenceGuard.definitionsPath ?? '',
        enforceOptionLabels: databaseConfig.parameterInferenceGuard.enforceOptionLabels ?? true,
        allowUnknownParameterIds:
          databaseConfig.parameterInferenceGuard.allowUnknownParameterIds ?? false,
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
        updateTemplate: normalizeTemplateText(databaseConfig.updateTemplate ?? ''),
        mappings,
        query: migratedQueryConfig,
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
      },
    },
  };
};

export const normalizeDbSchemaNode = (node: AiNode): AiNode => {
  const schemaConfig = node.config?.db_schema;
  return {
    ...node,
    config: {
      ...node.config,
      db_schema: {
        provider: schemaConfig?.provider ?? 'all',
        mode: schemaConfig?.mode ?? 'all',
        collections: schemaConfig?.collections ?? [],
        includeFields: schemaConfig?.includeFields ?? true,
        includeRelations: schemaConfig?.includeRelations ?? true,
        formatAs: schemaConfig?.formatAs ?? 'text',
      },
    },
  };
};
