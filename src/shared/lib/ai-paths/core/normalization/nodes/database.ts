import { type AiNode, type DatabaseConfig, type DbQueryConfig } from '@/shared/contracts/ai-paths';

import { DATABASE_INPUT_PORTS } from '../../constants';
import { ensureUniquePorts } from '../../utils/graph.ports';
import { normalizeTemplateText } from '../normalization.helpers';

type DerivedUpdateMapping = {
  targetPath: string;
  sourcePort: string;
  sourcePath?: string;
};

const DIRECT_SET_TEMPLATE_REGEX = /^\{\s*"\$set"\s*:\s*\{([\s\S]*)\}\s*\}\s*$/;
const DIRECT_SET_ASSIGNMENT_REGEX =
  /"([^"]+)"\s*:\s*(?:"{{\s*([^}]+)\s*}}"|{{\s*([^}]+)\s*}})\s*(?=,|$)/g;

const deriveMappingsFromSimpleUpdateTemplate = (
  template: string
): DerivedUpdateMapping[] | null => {
  const normalizedTemplate = normalizeTemplateText(template);
  if (!normalizedTemplate) return null;

  const match = DIRECT_SET_TEMPLATE_REGEX.exec(normalizedTemplate);
  if (!match) return null;

  const body = match[1] ?? '';
  const mappings: DerivedUpdateMapping[] = [];
  let assignmentMatch: RegExpExecArray | null = null;
  DIRECT_SET_ASSIGNMENT_REGEX.lastIndex = 0;

  while ((assignmentMatch = DIRECT_SET_ASSIGNMENT_REGEX.exec(body)) !== null) {
    const targetPath = assignmentMatch[1]?.trim() ?? '';
    const token = (assignmentMatch[2] ?? assignmentMatch[3] ?? '').trim();
    if (!targetPath || !token) return null;
    const sourcePort = token.split('.')[0]?.trim() ?? '';
    if (!sourcePort) return null;
    const sourcePath = token.startsWith(`${sourcePort}.`)
      ? token.slice(sourcePort.length + 1).trim()
      : '';
    mappings.push({
      targetPath,
      sourcePort,
      ...(sourcePath ? { sourcePath } : {}),
    });
  }

  if (mappings.length === 0) return null;

  const leftover = body.replace(DIRECT_SET_ASSIGNMENT_REGEX, '').replace(/[,\s]/g, '');
  if (leftover.length > 0) return null;

  return mappings;
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
  const rawMappings = databaseConfig.mappings ?? [];
  const derivedMappings =
    databaseConfig.operation === 'update' &&
    databaseConfig.updatePayloadMode === 'custom' &&
    rawMappings.length > 0
      ? deriveMappingsFromSimpleUpdateTemplate(updateTemplate)
      : null;
  const mappings = derivedMappings ?? rawMappings;
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
        updatePayloadMode:
          (derivedMappings ? 'mapping' : databaseConfig.updatePayloadMode) ?? 'custom',
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
