import type { AiNode } from '@/shared/contracts/ai-paths';
import type { RuntimePortValues } from '@/shared/contracts/ai-paths-runtime';

import { DEFAULT_DB_QUERY } from '../../constants';
import { coerceInput, hashRuntimeValue } from '../../utils';
import { buildDbQueryPayload } from '../utils';

export const CACHE_VERSION = 2;

export const buildNodeInputHash = (
  node: AiNode,
  nodeInputs: RuntimePortValues,
  cacheScopeFingerprint?: Record<string, unknown>
): string =>
  hashRuntimeValue({
    v: CACHE_VERSION,
    id: node.id,
    type: node.type,
    title: node.title ?? null,
    config: node.config ?? null,
    inputs: nodeInputs,
    inputPorts: node.inputs ?? [],
    outputPorts: node.outputs ?? [],
    ...(cacheScopeFingerprint ? { cacheScope: cacheScopeFingerprint } : {}),
  });

export const buildDatabaseInputHash = (
  node: AiNode,
  nodeInputs: RuntimePortValues,
  cacheScopeFingerprint?: Record<string, unknown>
): string => {
  const dbConfig = node.config?.database ?? { operation: 'query' };
  const operation = dbConfig.operation ?? 'query';
  const queryConfig = {
    ...DEFAULT_DB_QUERY,
    ...(dbConfig.query ?? {}),
  };
  const mappings = Array.isArray(dbConfig.mappings)
    ? dbConfig.mappings.map((mapping) => ({
        sourcePort: mapping?.sourcePort ?? null,
        sourcePath: mapping?.sourcePath ?? null,
        targetPath: mapping?.targetPath ?? null,
      }))
    : [];
  const baseConfig = {
    operation,
    entityType: dbConfig.entityType ?? 'product',
    idField: dbConfig.idField ?? 'entityId',
    mode: dbConfig.mode ?? 'replace',
    updateStrategy: dbConfig.updateStrategy ?? 'one',
    useMongoActions: dbConfig.useMongoActions ?? false,
    actionCategory: dbConfig.actionCategory ?? null,
    action: dbConfig.action ?? null,
    distinctField: dbConfig.distinctField ?? '',
    updateTemplate: dbConfig.updateTemplate ?? '',
    writeSource: dbConfig.writeSource ?? 'bundle',
    writeSourcePath: dbConfig.writeSourcePath ?? '',
    dryRun: dbConfig.dryRun ?? false,
    query: {
      provider: queryConfig.provider,
      collection: queryConfig.collection,
      mode: queryConfig.mode,
      preset: queryConfig.preset,
      field: queryConfig.field,
      idType: queryConfig.idType,
      queryTemplate: queryConfig.queryTemplate,
      limit: queryConfig.limit,
      sort: queryConfig.sort,
      projection: queryConfig.projection,
      single: queryConfig.single,
    },
    ...(mappings.length ? { mappings } : {}),
  };
  const inputs: Record<string, unknown> = {};
  const includeInput = (key: string): void => {
    if (nodeInputs[key] === undefined) return;
    inputs[key] = coerceInput(nodeInputs[key]);
  };
  if (operation === 'query') {
    const payload = buildDbQueryPayload(nodeInputs, queryConfig);
    return hashRuntimeValue({
      v: CACHE_VERSION,
      id: node.id,
      type: node.type,
      config: baseConfig,
      query: payload,
      ...(cacheScopeFingerprint ? { cacheScope: cacheScopeFingerprint } : {}),
    });
  }
  if (operation === 'update') {
    const sourcePorts = mappings.length
      ? mappings
          .map((mapping) => mapping.sourcePort)
          .filter((port): port is string => typeof port === 'string' && port.trim().length > 0)
      : [];
    sourcePorts.forEach(includeInput);
    includeInput('entityId');
    includeInput('productId');
    includeInput('entityType');
    includeInput('value');
    includeInput('query');
    includeInput('queryCallback');
    includeInput('aiQuery');
    includeInput('jobId');
    if ((dbConfig.updateStrategy ?? 'one') === 'many') {
      const payload = buildDbQueryPayload(nodeInputs, queryConfig);
      inputs['queryPayload'] = payload;
    }
    return hashRuntimeValue({
      v: CACHE_VERSION,
      id: node.id,
      type: node.type,
      config: baseConfig,
      inputs,
      ...(cacheScopeFingerprint ? { cacheScope: cacheScopeFingerprint } : {}),
    });
  }
  if (operation === 'action') {
    includeInput('entityId');
    includeInput('productId');
    includeInput('entityType');
    includeInput('value');
    includeInput('payload');
    includeInput('params');
    return hashRuntimeValue({
      v: CACHE_VERSION,
      id: node.id,
      type: node.type,
      config: baseConfig,
      inputs,
      ...(cacheScopeFingerprint ? { cacheScope: cacheScopeFingerprint } : {}),
    });
  }
  if (operation === 'distinct') {
    const payload = buildDbQueryPayload(nodeInputs, queryConfig);
    return hashRuntimeValue({
      v: CACHE_VERSION,
      id: node.id,
      type: node.type,
      config: baseConfig,
      query: payload,
      ...(cacheScopeFingerprint ? { cacheScope: cacheScopeFingerprint } : {}),
    });
  }
  return hashRuntimeValue({
    v: CACHE_VERSION,
    id: node.id,
    type: node.type,
    config: baseConfig,
    inputs: nodeInputs,
    ...(cacheScopeFingerprint ? { cacheScope: cacheScopeFingerprint } : {}),
  });
};

export const buildModelInputHash = (
  node: AiNode,
  nodeInputs: RuntimePortValues,
  cacheScopeFingerprint?: Record<string, unknown>
): string =>
  hashRuntimeValue({
    v: CACHE_VERSION,
    id: node.id,
    type: node.type,
    title: node.title ?? null,
    config: node.config ?? null,
    inputs: nodeInputs,
    inputPorts: node.inputs ?? [],
    outputPorts: node.outputs ?? [],
    ...(cacheScopeFingerprint ? { cacheScope: cacheScopeFingerprint } : {}),
  });

export const buildPromptInputHash = (
  node: AiNode,
  nodeInputs: RuntimePortValues,
  cacheScopeFingerprint?: Record<string, unknown>
): string =>
  hashRuntimeValue({
    v: CACHE_VERSION,
    id: node.id,
    type: node.type,
    title: node.title ?? null,
    config: node.config ?? null,
    inputs: nodeInputs,
    inputPorts: node.inputs ?? [],
    outputPorts: node.outputs ?? [],
    ...(cacheScopeFingerprint ? { cacheScope: cacheScopeFingerprint } : {}),
  });
