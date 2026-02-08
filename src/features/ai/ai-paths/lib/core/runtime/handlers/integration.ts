import type {
  DbSchemaConfig,
  DatabaseConfig,
  DbQueryConfig,
  HttpConfig,
  PollConfig,
  UpdaterMapping,
  RuntimePortValues,
  DatabaseAction,
  DatabaseActionCategory,
  DatabaseOperation
} from '@/shared/types/ai-paths';
import type { AiNode, Edge } from '@/shared/types/ai-paths';
import type { NodeHandler, NodeHandlerContext } from '@/shared/types/ai-paths-runtime';

import { dbApi, entityApi, ApiResponse } from '../../../api';
import { DEFAULT_DB_QUERY, DB_PROVIDER_PLACEHOLDERS } from '../../constants';
import {
  coerceInput,
  getValueAtMappingPath,
  parseJsonSafe,
  renderJsonTemplate,
  renderTemplate,
  safeStringify,
} from '../../utils';
import {
  getUnsupportedProviderActionMessage,
} from '../../utils/provider-actions';
import {
  buildDbQueryPayload,
  buildFallbackEntity,
  buildFormData,
  buildPromptOutput,
  looksLikeObjectId,
  pollDatabaseQuery,
  pollGraphJob,
  resolveEntityIdFromInputs,
} from '../utils';

import type { SchemaResponse } from '../../../api/client';

// Module-scoped schema cache to avoid redundant API calls across database nodes
// within the same run. TTL ensures freshness across separate runs.
let _schemaCacheResult: ApiResponse<unknown> | null = null;
let _schemaCacheTs = 0;
const SCHEMA_CACHE_TTL_MS = 30_000;

const getCachedSchema = async (): Promise<ApiResponse<unknown>> => {
  const now = Date.now();
  if (_schemaCacheResult && _schemaCacheResult.ok && now - _schemaCacheTs < SCHEMA_CACHE_TTL_MS) {
    return _schemaCacheResult;
  }
  const result = await dbApi.schema();
  if (result.ok) {
    _schemaCacheResult = result;
    _schemaCacheTs = now;
  }
  return result;
};

interface PromptCandidate {
  edge: Edge;
  fromNode: AiNode | undefined;
}

interface DbQueryResult {
  items?: unknown[];
  item?: unknown;
  count?: number;
}

interface DbActionResult {
  items?: unknown[];
  item?: unknown;
  values?: unknown[];
  count?: number;
  modifiedCount?: number;
  matchedCount?: number;
}

export const handleTrigger: NodeHandler = async ({
  node,
  nodeInputs,
  triggerNodeId,
  triggerEvent,
  simulationEntityType,
  triggerContext,
  fetchEntityCached,
  reportAiPathsError,
  activePathId,
  resolvedEntity,
  fallbackEntityId,
  now,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  if (triggerNodeId && node.id !== triggerNodeId) {
    return {};
  }
  const eventName: string =
    triggerEvent ?? node.config?.trigger?.event ?? 'manual';
  const contextInput = (coerceInput(nodeInputs['context']) ??
    coerceInput(nodeInputs['simulation'])) as
    | { entityId?: string; entityType?: string; productId?: string; entity?: unknown; entityJson?: unknown; product?: unknown }
    | undefined;
  const contextEntity =
    (contextInput?.['entity'] as Record<string, unknown> | undefined) ??
    (contextInput?.['entityJson'] as Record<string, unknown> | undefined) ??
    (contextInput?.['product'] as Record<string, unknown> | undefined) ??
    null;
  const simulationInputId: string | null =
    contextInput?.['entityId'] ?? contextInput?.['productId'] ?? null;
  const simulationInputType: string | null =
    contextInput?.['entityType'] ?? (simulationEntityType) ?? null;
  const resolvedEntityId: string | null = simulationInputId ?? null;
  const resolvedEntityType: string | null = simulationInputType ?? null;
  const triggerExtras: Record<string, unknown> = (triggerContext as Record<string, unknown>) ?? {};
  const triggerEntity =
    triggerExtras['entity'] ?? triggerExtras['entityJson'] ?? triggerExtras['product'] ?? null;
  const triggerEntityId: string | null =
    typeof triggerExtras['entityId'] === 'string'
      ? (triggerExtras['entityId'])
      : typeof triggerExtras['productId'] === 'string'
        ? (triggerExtras['productId'])
        : null;
  const triggerEntityType: string | null =
    typeof triggerExtras['entityType'] === 'string'
      ? (triggerExtras['entityType'])
      : null;
  const effectiveEntityId: string | null = resolvedEntityId ?? triggerEntityId ?? null;
  const effectiveEntityType: string | null = resolvedEntityType ?? triggerEntityType ?? null;
  let hydratedEntity: Record<string, unknown> | null =
    (resolvedEntity) ??
    contextEntity ??
    (triggerEntity as Record<string, unknown> | null) ??
    null;
  if (!hydratedEntity && effectiveEntityId && effectiveEntityType) {
    try {
      hydratedEntity = await fetchEntityCached(effectiveEntityType, effectiveEntityId);
    } catch (err) {
      reportAiPathsError(err, {
        service: 'ai-paths-runtime',
        nodeId: node.id,
      }, `Trigger hydration failed for ${effectiveEntityType}:${effectiveEntityId}`);
    }
  }
  const resolvedContext: Record<string, unknown> = {
    ...(contextInput && typeof contextInput === 'object' ? (contextInput as Record<string, unknown>) : {}),
    entityType: resolvedEntityType ?? triggerEntityType ?? contextInput?.['entityType'],
    entityId: resolvedEntityId ?? triggerEntityId ?? contextInput?.['entityId'],
    source: node.title,
    timestamp: now,
    entity:
      hydratedEntity ??
      (() => {
        try {
          return buildFallbackEntity((effectiveEntityId ?? fallbackEntityId) as string);
        } catch {
          return { id: effectiveEntityId ?? fallbackEntityId };
        }
      })(),
  };
  if (hydratedEntity && typeof resolvedContext['entityJson'] === 'undefined') {
    resolvedContext['entityJson'] = hydratedEntity;
  }
  if (
    hydratedEntity &&
    effectiveEntityType === 'product' &&
    typeof resolvedContext['product'] === 'undefined'
  ) {
    resolvedContext['product'] = hydratedEntity;
  }
  return {
    trigger: true,
    triggerName: eventName,
    meta: {
      firedAt: now,
      trigger: eventName,
      pathId: activePathId,
      entityId: effectiveEntityId,
      entityType: effectiveEntityType,
      ui: triggerExtras['ui'] ?? null,
      location: triggerExtras['location'] ?? null,
      source: triggerExtras['source'] ?? null,
      user: triggerExtras['user'] ?? null,
      event: triggerExtras['event'] ?? null,
      extras: triggerExtras['extras'] ?? null,
    },
    context: {
      ...resolvedContext,
      entityId:
        effectiveEntityId ?? (resolvedContext['entityId'] as string | null),
      entityType:
        effectiveEntityType ?? (resolvedContext['entityType'] as string | null),
      ui: triggerExtras['ui'] ?? resolvedContext['ui'],
      location: triggerExtras['location'] ?? resolvedContext['location'],
      source:
        triggerExtras['source'] ??
        (resolvedContext['source'] as string | null) ??
        node.title,
      user: triggerExtras['user'] ?? resolvedContext['user'],
      event: triggerExtras['event'] ?? resolvedContext['event'],
      extras: triggerExtras['extras'] ?? resolvedContext['extras'],
      trigger: eventName,
      pathId: activePathId,
    },
    entityId: effectiveEntityId,
    entityType: effectiveEntityType,
  };
};

export const handleNotification: NodeHandler = ({ 
  node,
  nodeInputs,
  prevOutputs,
  allInputs,
  edges,
  nodes,
  executed,
  toast,
  reportAiPathsError,
}: NodeHandlerContext): RuntimePortValues => {
  if (executed.notification.has(node.id)) return prevOutputs;
  const hasMeaningfulValue = (value: unknown): boolean => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return (value).trim().length > 0;
    if (Array.isArray(value)) return (value as unknown[]).length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  };
  const promptCandidates: PromptCandidate[] = edges
    .filter((edge: Edge): boolean => edge.to === node.id && edge.toPort === 'prompt')
    .map((edge: Edge): PromptCandidate => ({
      edge,
      fromNode: nodes.find((item: AiNode): boolean => item.id === edge.from),
    }))
    .filter((entry: PromptCandidate): boolean => entry.fromNode?.type === 'prompt');
  const promptSourceNode: AiNode | null = promptCandidates[0]?.fromNode ?? null;
  let derivedPromptMessage: string | null = null;
  if (promptSourceNode) {
    const upstreamEdges: Edge[] = edges.filter(
      (edge: Edge): boolean => edge.to === promptSourceNode.id,
    );
    const promptSourceInputs: RuntimePortValues = (allInputs[promptSourceNode.id] ?? {});
    if (upstreamEdges.length > 0) {
      const hasInputValue: boolean =
        Object.values(promptSourceInputs as Record<string, unknown>).some(hasMeaningfulValue);
      if (!hasInputValue) {
        return prevOutputs;
      }
    }
    const template = promptSourceNode.config?.prompt?.template ?? '';
    const templateNeedsCurrentValue =
      /{{\s*(result|value|current)\b[^}]*}}|\[\s*(result|value|current)\b[^\]]*\]/.test(template);
    if (templateNeedsCurrentValue) {
      const currentValue =
        coerceInput(promptSourceInputs['result']) ??
        coerceInput(promptSourceInputs['value']);
      const hasCurrentValue =
        currentValue !== undefined &&
        currentValue !== null &&
        (typeof currentValue !== 'string' || currentValue.trim().length > 0);
      if (!hasCurrentValue) {
        return prevOutputs;
      }
    }
    try {
      const derivedPrompt: { promptOutput: string; imagesValue: unknown } = buildPromptOutput(
        promptSourceNode.config?.prompt,
        promptSourceInputs,
      );
      if (derivedPrompt.promptOutput?.trim()) {
        derivedPromptMessage = derivedPrompt.promptOutput;
      }
    } catch (err) {
      reportAiPathsError(err, {
        service: 'ai-paths-runtime',
      }, `Prompt building failed for notification node ${node.id}`);
    }
  }
  const messageSource: unknown =
    derivedPromptMessage ??
    coerceInput(nodeInputs['result']) ??
    coerceInput(nodeInputs['prompt']) ??
    coerceInput(nodeInputs['value']) ??
    coerceInput(nodeInputs['bundle']) ??
    coerceInput(nodeInputs['context']) ??
    coerceInput(nodeInputs['triggerName']) ??
    coerceInput(nodeInputs['trigger']) ??
    coerceInput(nodeInputs['meta']) ??
    coerceInput(nodeInputs['entityId']) ??
    coerceInput(nodeInputs['entityType']);
  if (messageSource === undefined) {
    return prevOutputs;
  }
  const message: string = safeStringify(messageSource); // Was formatRuntimeValue, but safeStringify might be better for generic
  const trimmed: string = message.trim();
  if (!trimmed) {
    return prevOutputs;
  }
  toast(trimmed, { variant: 'success' });
  executed.notification.add(node.id);
  return prevOutputs;
};

export const handlePoll: NodeHandler = async ({ 
  node,
  nodeInputs,
  prevOutputs,
  deferPoll,
  executed,
  reportAiPathsError,
  abortSignal,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  if (deferPoll) {
    const existingStatus: string | null =
      typeof prevOutputs['status'] === 'string' ? (prevOutputs['status']) : null;
    if (existingStatus === 'completed' || existingStatus === 'failed') {
      return prevOutputs;
    }
    const rawJobId: unknown = coerceInput(nodeInputs['jobId']);
    const jobId: string =
      typeof rawJobId === 'string' || typeof rawJobId === 'number'
        ? String(rawJobId).trim()
        : '';
    if (!jobId) {
      return prevOutputs;
    }
    const existingResult: unknown =
      prevOutputs['result'] !== undefined ? prevOutputs['result'] : null;
    executed.poll.add(node.id);
    return {
      result: existingResult,
      status: 'polling',
      jobId,
      bundle: {
        jobId,
        status: 'polling',
        result: existingResult,
      },
    };
  }
  const pollConfig: PollConfig = node.config?.poll ?? {
    intervalMs: 2000,
    maxAttempts: 30,
    mode: 'job',
  };
  const pollMode: 'job' | 'database' = pollConfig.mode ?? 'job';
  const rawJobId: unknown = coerceInput(nodeInputs['jobId']);
  const jobId: string =
    typeof rawJobId === 'string' || typeof rawJobId === 'number'
      ? String(rawJobId).trim()
      : '';
  if (pollMode === 'database') {
    const queryConfig: DbQueryConfig =
      { ...DEFAULT_DB_QUERY, ...(pollConfig.dbQuery ?? {}) };
    try {
      const response: { result: unknown; status: string; bundle: Record<string, unknown> } =
        await pollDatabaseQuery(
          nodeInputs,
          {
            intervalMs: pollConfig.intervalMs ?? 2000,
            maxAttempts: pollConfig.maxAttempts ?? 30,
            dbQuery: queryConfig,
            successPath: pollConfig.successPath ?? 'status',
            successOperator: pollConfig.successOperator ?? 'equals',
            successValue: pollConfig.successValue ?? 'completed',
            resultPath: pollConfig.resultPath ?? 'result',
          },
          abortSignal ? { signal: abortSignal } : {}
        );
      return {
        result: response.result,
        status: response.status,
        jobId,
        bundle: {
          ...(response.bundle ?? {}),
          jobId,
          status: response.status,
        },
      };
    } catch (error: unknown) {
      if (abortSignal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
        throw error;
      }
      reportAiPathsError(
        error,
        { action: 'pollDatabase', nodeId: node.id },
        'Database polling failed:',
      );
      return {
        result: null,
        status: 'failed',
        jobId,
        bundle: {
          jobId,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Polling failed',
        },
      };
    }
  }
  if (!jobId) {
    return prevOutputs;
  }
  try {
    const result: unknown = await pollGraphJob(jobId, {
      intervalMs: pollConfig.intervalMs,
      maxAttempts: pollConfig.maxAttempts,
      ...(abortSignal ? { signal: abortSignal } : {}),
    });
    return {
      result,
      status: 'completed',
      jobId,
      bundle: { jobId, status: 'completed', result },
    };
  } catch (error: unknown) {
    if (abortSignal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
      throw error;
    }
    reportAiPathsError(
      error,
      { action: 'pollJob', jobId, nodeId: node.id },
      'AI job polling failed:',
    );
    return {
      result: null,
      status: 'failed',
      jobId,
      bundle: {
        jobId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Polling failed',
      },
    };
  }
};

export const handleHttp: NodeHandler = async ({ 
  node,
  nodeInputs,
  prevOutputs,
  executed,
  reportAiPathsError,
  abortSignal,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  if (executed.http.has(node.id)) return prevOutputs;

  const httpConfig: HttpConfig = node.config?.http ?? {
    url: '',
    method: 'GET',
    headers: '{}',
    bodyTemplate: '',
    responseMode: 'json',
    responsePath: '',
  };
  const resolvedUrl: string = renderTemplate(
    httpConfig.url ?? '',
    nodeInputs as Record<string, unknown>,
    '',
  );
  if (!resolvedUrl) {
    return {
      value: null,
      bundle: { ok: false, status: 0, error: 'Missing URL' },
    };
  }
  let headers: Record<string, string> = {};
  try {
    headers = httpConfig.headers
      ? (JSON.parse(httpConfig.headers) as Record<string, string>)
      : {};
  } catch (error: unknown) {
    reportAiPathsError(
      error,
      { action: 'parseHeaders', nodeId: node.id },
      'Invalid HTTP headers JSON:',
    );
  }
  let body: BodyInit | undefined = undefined;
  if (httpConfig.method !== 'GET' && httpConfig.method !== 'DELETE') {
    const renderedBody: string = httpConfig.bodyTemplate
      ? renderTemplate(
        httpConfig.bodyTemplate,
          nodeInputs as Record<string, unknown>,
          '',
      )
      : '';
    if (renderedBody) {
      const trimmed: string = renderedBody.trim();
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
              (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        body = trimmed;
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      } else {
        body = renderedBody;
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'text/plain';
        }
      }
    }
  }
  const fetchInit: RequestInit = {
    method: httpConfig.method,
    headers,
  };
  if (body !== undefined) {
    fetchInit.body = body;
  }
  if (abortSignal) {
    fetchInit.signal = abortSignal;
  }
  try {
    const res: Response = await fetch(resolvedUrl, fetchInit);
    let data: unknown = null;
    if (httpConfig.responseMode === 'status') {
      data = res.status;
    } else if (httpConfig.responseMode === 'text') {
      data = await res.text();
    } else {
      try {
        data = (await res.json()) as unknown;
      } catch {
        data = await res.text();
      }
    }
    let resolvedValue: unknown = data;
    if (httpConfig.responsePath) {
      const pathValue: unknown = getValueAtMappingPath(data, httpConfig.responsePath);
      resolvedValue = pathValue === undefined ? data : pathValue;
    }
    executed.http.add(node.id);
    return {
      value: resolvedValue,
      bundle: {
        ok: res.ok,
        status: res.status,
        url: resolvedUrl,
        data: resolvedValue,
      },
    };
  } catch (error: unknown) {
    if (abortSignal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
      throw error;
    }
    reportAiPathsError(
      error,
      { action: 'httpFetch', url: resolvedUrl, nodeId: node.id },
      'HTTP fetch failed:',
    );
    return {
      value: null,
      bundle: {
        ok: false,
        status: 0,
        url: resolvedUrl,
        error: 'Fetch failed',
      },
    };
  }
};

export const handleDatabase: NodeHandler = async ({ 
  node,
  nodeInputs,
  prevOutputs,
  executed,
  reportAiPathsError,
  toast,
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

    // Backward-compat aliases: many legacy paths still map translator output to `value`
    // while update templates expect `{{result}}` (and vice-versa).
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
    const aiPrompt: string = aiPromptTemplate.trim()
      ? renderTemplate(aiPromptTemplate, templateContext, templateInputValue ?? '')
      : '';

    if (useMongoActions) {
      const actionCategory: DatabaseActionCategory = dbConfig.actionCategory ?? 'read';
      const action: DatabaseAction = dbConfig.action ?? 'find';
      const inputValue: unknown = templateInputValue;
      const queryPayload = buildDbQueryPayload(templateContext as RuntimePortValues, queryConfig);
      const actionProvider =
      queryPayload['provider'] === 'mongodb' || queryPayload['provider'] === 'prisma'
        ? queryPayload['provider']
        : null;
      const actionSupportError = actionProvider
        ? getUnsupportedProviderActionMessage(actionProvider, action)
        : null;
      if (actionSupportError) {
        toast(actionSupportError, { variant: 'error' });
        return {
          result: null,
          bundle: {
            error: 'Unsupported provider action',
            provider: actionProvider,
            action,
          },
          aiPrompt,
        };
      }
      const filter = (queryPayload['query']) ?? {};
      const projection = queryPayload['projection'];
      const sort = queryPayload['sort'];
      const limit = queryPayload['limit'];
      const idType = queryPayload['idType'];
      const collection = queryPayload['collection'];
      const distinctField: string | undefined = dbConfig.distinctField?.trim() || undefined;
      const updateTemplate: string = dbConfig.updateTemplate?.trim() ?? '';

      const parseJsonTemplate = (template: string): unknown =>
        parseJsonSafe(
          renderJsonTemplate(
            template,
            templateContext,
            inputValue ?? '',
          ),
        );

      if (actionCategory === 'read' || actionCategory === 'aggregate') {
        if (action === 'distinct' && !distinctField) {
          toast('Distinct requires a field name.', { variant: 'error' });
          return {
            result: null,
            bundle: { error: 'Missing distinct field' },
            aiPrompt,
          };
        }
        if (action === 'aggregate') {
          const parsedPipeline: unknown = parseJsonTemplate(
            queryConfig.queryTemplate ?? '[]',
          );
          if (!Array.isArray(parsedPipeline)) {
            toast('Aggregation pipeline must be a JSON array.', {
              variant: 'error',
            });
            return {
              result: null,
              bundle: { error: 'Invalid pipeline' },
              aiPrompt,
            };
          }
          if (dryRun) {
            return {
              result: parsedPipeline,
              bundle: {
                dryRun: true,
                action,
                collection,
                pipeline: parsedPipeline,
              },
              aiPrompt,
            };
          }
          const aggResult: ApiResponse<DbActionResult> = await dbApi.action<DbActionResult>({ 
            action,
            collection,
            pipeline: parsedPipeline,
          });
          if (!aggResult.ok) {
            toast('Aggregation failed.', { variant: 'error' });
            return {
              result: null,
              bundle: { error: 'Aggregation failed' },
              aiPrompt,
            };
          }
          return {
            result: (aggResult.data as Record<string, unknown>)?.['items'] ?? [],
            bundle: {
              count:
              (aggResult.data as Record<string, unknown>)?.['count'] ??
              (Array.isArray((aggResult.data as Record<string, unknown>)?.['items'])
                ? ((aggResult.data as Record<string, unknown>)?.['items'] as unknown[]).length
                : 0),
              collection,
            },
            aiPrompt,
          };
        }

        if (dryRun) {
          return {
            result: filter,
            bundle: {
              dryRun: true,
              action,
              collection,
              filter,
              projection,
              sort,
              limit,
            },
            aiPrompt,
          };
        }
        const readResult: ApiResponse<DbActionResult> = await dbApi.action<DbActionResult>({ 
          ...(queryPayload['provider'] ? { provider: queryPayload['provider'] as 'auto' | 'mongodb' | 'prisma' } : {}),
          action,
          collection,
          filter,
          ...(projection !== undefined ? { projection } : {}),
          ...(sort !== undefined ? { sort } : {}),
          ...(limit !== undefined ? { limit } : {}),
          ...(idType !== undefined ? { idType } : {}),
          ...(action === 'distinct' && distinctField ? { distinctField } : {}),
        });
        if (!readResult.ok) {
          toast(readResult.error || 'Database read failed.', { variant: 'error' });
          return { result: null, bundle: { error: 'Read failed' }, aiPrompt };
        }
        const data: DbActionResult = readResult.data;
        const result: unknown = data['item'] ?? data['items'] ?? data['values'] ?? data['count'] ?? [];
        const count: number =
        (data['count'] as number) ??
        (Array.isArray(result) ? (result as unknown[]).length : result ? 1 : 0);
        toast(
          `Database query succeeded for ${collection} (${count} result${count === 1 ? '' : 's'}).`,
          { variant: 'success' },
        );
        return {
          result,
          bundle: {
            count,
            collection,
            filter,
          },
          aiPrompt,
        };
      }

      if (actionCategory === 'create') {
        const payloadTemplate: string = queryConfig.queryTemplate?.trim() ?? '';
        const parsedPayload: unknown = payloadTemplate
          ? parseJsonTemplate(payloadTemplate)
          : null;
        if (
          payloadTemplate &&
        (!parsedPayload ||
          (typeof parsedPayload !== 'object' && !Array.isArray(parsedPayload)))
        ) {
          toast('Insert template must be valid JSON.', {
            variant: 'error',
          });
          return {
            result: null,
            bundle: { error: 'Invalid insert template' },
            aiPrompt,
          };
        }
        const payloadFromTemplate: unknown =
        parsedPayload && typeof parsedPayload === 'object'
          ? parsedPayload
          : null;
        const rawPayload: unknown =
        payloadFromTemplate ??
        coerceInput(resolvedInputs[dbConfig.writeSource ?? 'bundle']);
        const coercePayloadObject = (value: unknown): Record<string, unknown> | null => {
          if (!value) return null;
          if (typeof value === 'string') {
            const parsed: unknown = parseJsonSafe(value);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              return parsed as Record<string, unknown>;
            }
            return null;
          }
          if (typeof value === 'object' && !Array.isArray(value)) {
            return value as Record<string, unknown>;
          }
          return null;
        };
        const payloadObject: Record<string, unknown> | null = coercePayloadObject(rawPayload);
        const payloadArray: unknown[] | null = Array.isArray(rawPayload)
          ? (rawPayload as unknown[])
          : null;
        const payload: unknown[] | Record<string, unknown> | null = payloadArray ?? payloadObject;
        if (!payload) {
          toast('Insert requires a JSON payload.', { variant: 'error' });
          return { result: null, bundle: { error: 'Missing payload' }, aiPrompt };
        }
        if (action === 'insertOne' && !payloadObject) {
          toast('insertOne requires a single JSON object.', { variant: 'error' });
          return { result: null, bundle: { error: 'Invalid payload' }, aiPrompt };
        }
        if (executed.updater.has(node.id)) {
          return prevOutputs;
        }
        if (dryRun) {
          executed.updater.add(node.id);
          return {
            result: payload,
            bundle: { dryRun: true, action, collection, payload } as RuntimePortValues,
            aiPrompt,
          };
        }
        const insertActionPayload = {
          ...(queryPayload['provider'] ? { provider: queryPayload['provider'] as 'auto' | 'mongodb' | 'prisma' } : {}),
          action,
          collection,
          ...(action === 'insertOne' && payloadObject
            ? { document: payloadObject }
            : {}),
          ...(action === 'insertMany'
            ? { documents: Array.isArray(payload) ? (payload) : [payload] }
            : {}),
        };
        const insertResult: ApiResponse<unknown> = await dbApi.action(insertActionPayload);
        executed.updater.add(node.id);
        if (!insertResult.ok) {
          reportAiPathsError(
            new Error(insertResult.error),
            { action: 'dbInsert', collection, nodeId: node.id },
            'Database insert failed:',
          );
          toast(insertResult.error || 'Database insert failed.', { variant: 'error' });
          return { result: null, bundle: { error: 'Insert failed' }, aiPrompt };
        }
        const insertedCount: number =
        typeof (insertResult.data as Record<string, unknown> | null)?.['insertedCount'] === 'number'
          ? ((insertResult.data as Record<string, unknown>)['insertedCount'] as number)
          : 1;
        toast(
          `Entity created in ${collection} (${insertedCount} row${insertedCount === 1 ? '' : 's'}).`,
          { variant: 'success' },
        );
        return {
          result: insertResult.data,
          bundle: insertResult.data as Record<string, unknown>,
          aiPrompt,
        };
      }

      if (actionCategory === 'update') {
        let resolvedFilter: Record<string, unknown> = filter;
        if (queryConfig.queryTemplate?.trim()) {
          const parsedFilter: unknown = parseJsonTemplate(queryConfig.queryTemplate);
          if (
            parsedFilter &&
          typeof parsedFilter === 'object' &&
          !Array.isArray(parsedFilter)
          ) {
            resolvedFilter = parsedFilter as Record<string, unknown>;
          }
        }
        const debugPayload: Record<string, unknown> = {
          mode: 'mongo',
          actionCategory,
          action,
          collection,
          filter: resolvedFilter,
          updateTemplate: updateTemplate || undefined,
          idType,
          entityId: resolvedInputs['entityId'],
          productId: resolvedInputs['productId'],
          entityType: resolvedInputs['entityType'],
        };
        const buildUpdatesFromMappings = (): {
        updates: Record<string, unknown>;
        primaryTarget: string;
        missingSourcePorts: string[];
        unresolvedSourcePorts: string[];
      } => {
          const fallbackTarget: string =
          dbConfig.mappings?.[0]?.['targetPath'] ?? 'content_en';
          const fallbackSourcePort: string = node.inputs.includes('result')
            ? 'result'
            : 'content_en';
          const mappings: UpdaterMapping[] =
          dbConfig.mappings && dbConfig.mappings.length > 0
            ? dbConfig.mappings
            :
            [
              {
                targetPath: fallbackTarget,
                sourcePort: fallbackSourcePort,
              },
            ];
          const trimStrings: boolean = dbConfig.trimStrings ?? false;
          const skipEmpty: boolean = dbConfig.skipEmpty ?? false;
          const isEmptyValue = (value: unknown): boolean =>
            value === undefined ||
          value === null ||
          (typeof value === 'string' && (value).trim() === '') ||
          (Array.isArray(value) && (value as unknown[]).length === 0);
          const isEffectivelyMissing = (value: unknown): boolean =>
            isEmptyValue(value) ||
          (typeof value === 'object' &&
            !Array.isArray(value) &&
            value !== null &&
            Object.keys(value as Record<string, unknown>).length === 0);
          const updates: Record<string, unknown> = {};
          const requiredSourcePorts: Set<string> = new Set<string>();
          const unresolvedSourcePorts: Set<string> = new Set<string>();
          mappings.forEach((mapping: UpdaterMapping): void => {
            const sourcePort: string = mapping.sourcePort;
            if (!sourcePort) return;
            requiredSourcePorts.add(sourcePort);
            const sourceValue: unknown = templateInputs[sourcePort];
            if (sourceValue === undefined) return;
            let value: unknown = coerceInput(sourceValue);
            if (value && typeof value === 'object' && mapping.sourcePath) {
              const resolved: unknown = getValueAtMappingPath(value, mapping.sourcePath);
              if (resolved !== undefined) {
                value = resolved;
              } else if (sourcePort === 'result') {
                unresolvedSourcePorts.add(sourcePort);
                return;
              }
            }
            if (
              sourcePort === 'result' &&
            value &&
            typeof value === 'object' &&
            !mapping.sourcePath
            ) {
              const resultValue: unknown = (value as Record<string, unknown>)['result'];
              const descriptionValue: unknown = (value as Record<string, unknown>)
                ['description'];
              const contentValue: unknown = (value as Record<string, unknown>)['content_en'];
              value = resultValue ?? descriptionValue ?? contentValue ?? value;
            }
            if (sourcePort === 'result' && isEffectivelyMissing(value)) {
              unresolvedSourcePorts.add(sourcePort);
              return;
            }
            if (typeof value === 'string' && trimStrings) {
              value = (value).trim();
            }
            if (skipEmpty && isEmptyValue(value)) {
              return;
            }
            if (mapping.targetPath) {
              updates[mapping.targetPath] = value;
            }
          });
          const missingSourcePorts: string[] = Array.from(requiredSourcePorts).filter(
            (sourcePort: string): boolean => templateInputs[sourcePort] === undefined,
          );
          return {
            updates,
            primaryTarget:
            mappings.find((m: UpdaterMapping): boolean => !!m.targetPath)?.targetPath ?? fallbackTarget,
            missingSourcePorts,
            unresolvedSourcePorts: Array.from(unresolvedSourcePorts),
          };
        };

        const {
          updates,
          primaryTarget,
          missingSourcePorts,
          unresolvedSourcePorts,
        } = buildUpdatesFromMappings();
        const extractMissingTemplatePorts = (template: string): string[] => {
          const missing: Set<string> = new Set<string>();
          const tokenRegex: RegExp = /{{\s*([^}]+)\s*}}|\[\s*([^\]]+)\s*\]/g;
          let match: RegExpExecArray | null = tokenRegex.exec(template);
          while (match) {
            const token: string = (match[1] ?? match[2] ?? '').trim();
            if (token) {
              const rootPort: string = token.split('.')[0]?.trim() ?? '';
              if (
                rootPort &&
              rootPort !== 'value' &&
              rootPort !== 'current' &&
              templateInputs[rootPort] === undefined
              ) {
                missing.add(rootPort);
              }
            }
            match = tokenRegex.exec(template);
          }
          return Array.from(missing);
        };
        const missingTemplatePorts: string[] = updateTemplate
          ? extractMissingTemplatePorts(updateTemplate)
          : [];
        if (!updateTemplate) {
          if (missingSourcePorts.length > 0 || unresolvedSourcePorts.length > 0) {
            return prevOutputs;
          }
          if (Object.keys(updates).length === 0) {
            return prevOutputs;
          }
        }
        if (missingTemplatePorts.length > 0) {
          return prevOutputs;
        }
        const parsedUpdate: unknown = updateTemplate ? parseJsonTemplate(updateTemplate) : null;
        if (
          updateTemplate &&
        (!parsedUpdate ||
          (typeof parsedUpdate !== 'object' && !Array.isArray(parsedUpdate)))
        ) {
          toast('Update template must be valid JSON.', { variant: 'error' });
          return {
            result: null,
            bundle: { error: 'Invalid update template' },
            debugPayload,
            aiPrompt,
          };
        }
        const updateDoc: unknown = parsedUpdate ?? updates;
        if (
          !updateDoc ||
        (typeof updateDoc !== 'object' && !Array.isArray(updateDoc))
        ) {
          toast('Update document is missing or invalid.', { variant: 'error' });
          return {
            result: null,
            bundle: { error: 'Invalid update' },
            debugPayload,
            aiPrompt,
          };
        }
        if (
          !Array.isArray(updateDoc) &&
        typeof updateDoc === 'object' &&
        Object.keys(updateDoc as Record<string, unknown>).length === 0
        ) {
          toast('Update document is empty.', { variant: 'error' });
          return {
            result: null,
            bundle: { error: 'Empty update' },
            debugPayload,
            aiPrompt,
          };
        }
        if (executed.updater.has(node.id)) {
          return prevOutputs;
        }
        if (dryRun) {
          executed.updater.add(node.id);
          return {
            result: updateDoc as Record<string, unknown>,
            bundle: {
              dryRun: true,
              action,
              collection,
              filter: resolvedFilter,
              update: updateDoc,
            } as RuntimePortValues,
            debugPayload,
            aiPrompt,
          };
        }
        const resolveEntityId = (): string | null => {
          const entityIdValue =
          typeof resolvedInputs['entityId'] === 'string'
            ? (resolvedInputs['entityId'])
            : typeof resolvedInputs['productId'] === 'string'
              ? (resolvedInputs['productId'])
              : null;
          if (entityIdValue && entityIdValue.trim()) return entityIdValue;
          const fallbackEntityId: string = resolveEntityIdFromInputs(
          resolvedInputs as RuntimePortValues,
          dbConfig.idField ?? 'entityId',
          simulationEntityType,
          simulationEntityId,
          );
          if (fallbackEntityId.trim()) return fallbackEntityId;
          const filterId =
          typeof resolvedFilter['id'] === 'string'
            ? (resolvedFilter['id'])
            : typeof resolvedFilter['_id'] === 'string'
              ? (resolvedFilter['_id'])
              : null;
          return filterId && filterId.trim() ? filterId : null;
        };
        const normalizedCollection: string = collection.trim().toLowerCase();
        const normalizedEntityType: string = (dbConfig.entityType ?? '').trim().toLowerCase();
        const isProductCollection: boolean =
        normalizedCollection === 'product' || normalizedCollection === 'products';
        const shouldUseEntityUpdate =
        action === 'updateOne' && (isProductCollection || normalizedEntityType === 'product');
        if (shouldUseEntityUpdate) {
          const updateDocRecord =
          updateDoc && typeof updateDoc === 'object' && !Array.isArray(updateDoc)
            ? (updateDoc as Record<string, unknown>)
            : null;
          const updateSet =
          updateDocRecord?.['$set'] &&
          typeof updateDocRecord['$set'] === 'object' &&
          !Array.isArray(updateDocRecord['$set'])
            ? (updateDocRecord['$set'] as Record<string, unknown>)
            : null;
          const updatePlain =
          updateDocRecord && !Object.keys(updateDocRecord).some((key) => key.startsWith('$'))
            ? updateDocRecord
            : null;
          const updatesForEntity =
          updateSet ?? updatePlain ?? updates;
          if (!updatesForEntity || Object.keys(updatesForEntity).length === 0) {
            return prevOutputs;
          }
          const entityIdValue = resolveEntityId();
          if (!entityIdValue) {
            reportAiPathsError(
              new Error('Database update missing entity id'),
              {
                action: 'updateEntity',
                collection,
                nodeId: node.id,
                provider: queryPayload['provider'],
              },
              'Database update skipped:',
            );
            toast('Database update skipped: missing entity ID.', { variant: 'error' });
            return {
              result: null,
              bundle: { error: 'Missing entity id' },
              debugPayload,
              aiPrompt,
            };
          }
          const updateResult = await entityApi.update({
            entityType: 'product',
            entityId: entityIdValue,
            updates: updatesForEntity,
            mode: dbConfig.mode ?? 'replace',
          });
          executed.updater.add(node.id);
          if (!updateResult.ok) {
            reportAiPathsError(
              new Error(updateResult.error),
              { action: 'updateEntity', collection, nodeId: node.id },
              'Database update failed:',
            );
            toast('Database update failed.', { variant: 'error' });
            return {
              result: null,
              bundle: { error: 'Update failed' },
              debugPayload,
              aiPrompt,
            };
          }
          const modifiedCount: number =
          typeof (updateResult.data as Record<string, unknown> | null)?.['modifiedCount'] === 'number'
            ? ((updateResult.data as Record<string, unknown>)['modifiedCount'] as number)
            : 1;
          toast(
            `Entity updated in ${collection} (${modifiedCount} row${modifiedCount === 1 ? '' : 's'}).`,
            { variant: 'success' },
          );
          const primaryValue: unknown = updates[primaryTarget];
          return {
            content_en:
            primaryTarget === 'content_en'
              ? ((primaryValue as string | undefined) ??
                (nodeInputs['content_en'] as string | undefined))
              : (nodeInputs['content_en'] as string | undefined),
            result: updateResult.data,
            bundle: updateResult.data as Record<string, unknown>,
            debugPayload,
            aiPrompt,
          };
        }
        if (action === 'updateOne') {
          const hasFilter: boolean =
          resolvedFilter &&
          typeof resolvedFilter === 'object' &&
          Object.keys(resolvedFilter).length > 0;
          if (!hasFilter) {
            const fallbackEntityId = resolveEntityId();
            if (fallbackEntityId) {
              resolvedFilter = { id: fallbackEntityId };
            }
          }
          if (!resolvedFilter || Object.keys(resolvedFilter).length === 0) {
            reportAiPathsError(
              new Error('Database update missing filter'),
              { action: 'dbUpdate', collection, nodeId: node.id, provider: queryPayload['provider'] },
              'Database update skipped:',
            );
            toast('Database update skipped: missing query filter.', { variant: 'error' });
            return {
              result: null,
              bundle: { error: 'Missing query filter' },
              debugPayload,
              aiPrompt,
            };
          }
        }
        const updateResult: ApiResponse<unknown> = await dbApi.action({
          ...(queryPayload['provider'] ? { provider: queryPayload['provider'] as 'auto' | 'mongodb' | 'prisma' } : {}),
          action,
          collection,
          filter: resolvedFilter,
          update: updateDoc,
          ...(idType !== undefined ? { idType: idType as 'string' | 'objectId' } : {}),
        });
        executed.updater.add(node.id);
        if (!updateResult.ok) {
          reportAiPathsError(
            new Error(updateResult.error),
            { action: 'dbUpdate', collection, nodeId: node.id },
            'Database update failed:',
          );
          toast(updateResult.error || 'Database update failed.', { variant: 'error' });
          return {
            result: null,
            bundle: { error: 'Update failed' },
            debugPayload,
            aiPrompt,
          };
        }
        const modifiedCount: number =
        typeof (updateResult.data as Record<string, unknown> | null)?.['modifiedCount'] === 'number'
          ? ((updateResult.data as Record<string, unknown>)['modifiedCount'] as number)
          : 1;
        toast(
          `Entity updated in ${collection} (${modifiedCount} row${modifiedCount === 1 ? '' : 's'}).`,
          { variant: 'success' },
        );
        const primaryValue: unknown = updates[primaryTarget];
        return {
          content_en:
          primaryTarget === 'content_en'
            ? ((primaryValue as string | undefined) ??
              (nodeInputs['content_en'] as string | undefined))
            : (nodeInputs['content_en'] as string | undefined),
          result: updateResult.data,
          bundle: updateResult.data as Record<string, unknown>,
          debugPayload,
          aiPrompt,
        };
      }

      if (actionCategory === 'delete') {
        if (executed.updater.has(node.id)) {
          return prevOutputs;
        }
        if (dryRun) {
          executed.updater.add(node.id);
          return {
            result: { dryRun: true, action, collection, filter },
            bundle: { dryRun: true } as RuntimePortValues,
            aiPrompt,
          };
        }
        const deleteResult: ApiResponse<unknown> = await dbApi.action({
          ...(queryPayload['provider'] ? { provider: queryPayload['provider'] as 'auto' | 'mongodb' | 'prisma' } : {}),
          action,
          collection,
          filter,
          ...(idType !== undefined ? { idType: idType as 'string' | 'objectId' } : {}),
        });
        executed.updater.add(node.id);
        if (!deleteResult.ok) {
          reportAiPathsError(
            new Error(deleteResult.error),
            { action: 'dbDelete', collection, nodeId: node.id },
            'Database delete failed:',
          );
          toast(deleteResult.error || 'Database delete failed.', { variant: 'error' });
          return { result: null, bundle: { error: 'Delete failed' }, aiPrompt };
        }
        toast('Delete completed.', { variant: 'success' });
        return {
          result: deleteResult.data,
          bundle: deleteResult.data as Record<string, unknown>,
          aiPrompt,
        };
      }
    }

    if (operation === 'query') {
      const inputQuery: unknown = coerceInput(nodeInputs['query']);
      const callbackInput: unknown = coerceInput(nodeInputs['queryCallback']);
      const aiQueryInput: unknown = coerceInput(nodeInputs['aiQuery']);
      const resolvedEntityId: string | null = resolveEntityIdFromInputs(
      resolvedInputs as RuntimePortValues,
      undefined,
      simulationEntityType,
      simulationEntityId,
      );
      const inputValue: unknown = templateInputValue;
      const entityIdInput: unknown = coerceInput(resolvedInputs['entityId']);
      const productIdInput: unknown = coerceInput(resolvedInputs['productId']);
      const parseRenderedQuery = (raw: string): Record<string, unknown> | null => {
        const parsed: unknown = parseJsonSafe(
          renderJsonTemplate(
            raw,
            templateContext,
            inputValue ?? '',
          ),
        );
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
        return null;
      };
      const parseQueryInput = (value: unknown): Record<string, unknown> | null => {
        if (!value) return null;
        if (typeof value === 'object' && !Array.isArray(value)) {
          try {
            const serialized: string = JSON.stringify(value);
            return parseRenderedQuery(serialized) ?? (value as Record<string, unknown>);
          } catch {
            return value as Record<string, unknown>;
          }
        }
        if (typeof value === 'string') {
          const match: RegExpMatchArray | null = value.match(/```(?:json)?\s*([\s\S]*?)```/);
          const jsonStr: string = match ? match[1]!.trim() : value.trim();
          return parseRenderedQuery(jsonStr);
        }
        return null;
      };
      const callbackTemplate: string | null =
      typeof callbackInput === 'string' && (callbackInput).trim()
        ? (callbackInput)
        : null;
      let query: Record<string, unknown> = {};

      // Priority 1: AI-generated query from model output
      if (aiQueryInput !== undefined && aiQueryInput !== null) {
        let parsedAiQuery: Record<string, unknown> | null = null;

        parsedAiQuery = parseQueryInput(aiQueryInput);

        if (parsedAiQuery && typeof parsedAiQuery === 'object') {
        // Handle nested query structure (AI might return {query: {...}, collection: "..."})
          if (parsedAiQuery['query'] && typeof parsedAiQuery['query'] === 'object') {
            query = parsedAiQuery['query'] as Record<string, unknown>;
            // Override collection if AI specified one
            if (typeof parsedAiQuery['collection'] === 'string') {
              queryConfig.collection = parsedAiQuery['collection'];
            }
          } else {
            query = parsedAiQuery;
          }
        } else {
          toast('AI query could not be parsed as valid JSON.', {
            variant: 'error',
          });
          return {
            result: null,
            bundle: {
              count: 0,
              query: {},
              collection: queryConfig.collection,
              error: 'Invalid AI query format',
              rawAiQuery: aiQueryInput,
            },
            aiPrompt,
          };
        }
      } else {
        const inlineQuery = parseQueryInput(inputQuery ?? callbackInput);
        if (inlineQuery) {
          query = inlineQuery;
        } else if (callbackTemplate) {
          const parsed: unknown = parseJsonSafe(
            renderJsonTemplate(
              callbackTemplate,
              templateContext,
              inputValue ?? '',
            ),
          );
          if (parsed && typeof parsed === 'object') {
            query = parsed as Record<string, unknown>;
          }
        } else if (queryConfig.mode === 'preset') {
          const presetValue: unknown =
          queryConfig.preset === 'by_productId'
            ? (productIdInput ?? inputValue)
            : queryConfig.preset === 'by_entityId'
              ? (entityIdInput ?? inputValue ?? resolvedEntityId)
              : (inputValue ??
                resolvedEntityId ??
                entityIdInput ??
                productIdInput);
          if (presetValue !== undefined) {
            let field: string =
            queryConfig.preset === 'by_productId'
              ? 'productId'
              : queryConfig.preset === 'by_entityId'
                ? 'entityId'
                : queryConfig.preset === 'by_field'
                  ? queryConfig.field || 'id'
                  : '_id';
            if (
              queryConfig.preset === 'by_id' &&
            field === '_id' &&
            !looksLikeObjectId(presetValue as string)
            ) {
              field = 'id';
            }
            query = { [field]: presetValue };
          } else {
            toast('Database query needs an ID/value input.', {
              variant: 'error',
            });
            return {
              result: null,
              bundle: {
                count: 0,
                query: {},
                collection: queryConfig.collection,
                error: 'Missing query value',
              },
              aiPrompt,
            };
          }
        } else {
          const parsed: unknown = parseJsonSafe(
            renderJsonTemplate(
              queryConfig.queryTemplate ?? '{}',
              templateContext,
              inputValue ?? '',
            ),
          );
          if (parsed && typeof parsed === 'object') {
            query = parsed as Record<string, unknown>;
          }
        }
      }
      const projection: Record<string, unknown> | undefined = parseJsonSafe(queryConfig.projection ?? '') as
      | Record<string, unknown>
      | undefined;
      const sort: Record<string, unknown> | undefined = parseJsonSafe(queryConfig.sort ?? '') as
      | Record<string, unknown>
      | undefined;
      if (dryRun) {
        return {
          result: query,
          bundle: {
            dryRun: true,
            query,
            collection: queryConfig.collection,
            projection,
            sort,
            limit: queryConfig.limit,
            single: queryConfig.single,
            idType: queryConfig.idType,
          } as RuntimePortValues,
          aiPrompt,
        };
      }
      const queryResult: ApiResponse<DbQueryResult> = await dbApi.query<DbQueryResult>({ 
        provider: queryConfig.provider,
        collection: queryConfig.collection,
        query,
        projection,
        sort,
        limit: queryConfig.limit,
        single: queryConfig.single,
        idType: queryConfig.idType as 'string' | 'objectId' | undefined,
      });
      if (!queryResult.ok) {
        reportAiPathsError(
          new Error(queryResult.error),
          { action: 'dbQuery', collection: queryConfig.collection, query },
          'Database query failed:',
        );
        toast(queryResult.error || 'Database query failed.', { variant: 'error' });
        return {
          result: null,
          bundle: {
            count: 0,
            query,
            collection: queryConfig.collection,
            error: 'Query failed',
          },
          aiPrompt,
        };
      }
      const result: unknown = queryConfig.single
        ? ((queryResult.data as Record<string, unknown>)['item'] ?? null)
        : ((queryResult.data as Record<string, unknown>)['items'] ?? []);
      const count: number =
      ((queryResult.data as Record<string, unknown>)['count'] as number) ??
      (Array.isArray(result) ? (result as unknown[]).length : result ? 1 : 0);
      const collectionLabel =
      typeof queryConfig.collection === 'string' && queryConfig.collection.trim()
        ? queryConfig.collection
        : 'collection';
      toast(
        `Database query succeeded for ${collectionLabel} (${count} result${count === 1 ? '' : 's'}).`,
        { variant: 'success' },
      );
      return {
        result,
        bundle: {
          count,
          query,
          collection: queryConfig.collection,
        },
        aiPrompt,
      };
    }

    if (operation === 'update') {
      const fallbackTarget: string = (dbConfig.mappings as any)?.[0]?.['targetPath'] ?? 'content_en';
      const fallbackSourcePort: string = node.inputs.includes('result')
        ? 'result'
        : 'content_en';
      const mappings: UpdaterMapping[] =
      dbConfig.mappings && dbConfig.mappings.length > 0
        ? dbConfig.mappings
        : [
          {
            targetPath: fallbackTarget,
            sourcePort: fallbackSourcePort,
          },
        ];
      const trimStrings: boolean = dbConfig.trimStrings ?? false;
      const skipEmpty: boolean = dbConfig.skipEmpty ?? false;
      const isEmptyValue = (value: unknown): boolean =>
        value === undefined ||
      value === null ||
      (typeof value === 'string' && (value).trim() === '') ||
      (Array.isArray(value) && (value as unknown[]).length === 0);
      const isEffectivelyMissing = (value: unknown): boolean =>
        isEmptyValue(value) ||
      (typeof value === 'object' &&
        !Array.isArray(value) &&
        value !== null &&
        Object.keys(value as Record<string, unknown>).length === 0);
      const updates: Record<string, unknown> = {};
      const requiredSourcePorts: Set<string> = new Set<string>();
      const unresolvedSourcePorts: Set<string> = new Set<string>();
      mappings.forEach((mapping: UpdaterMapping) => {
        const sourcePort = mapping.sourcePort;
        if (!sourcePort) return;
        requiredSourcePorts.add(sourcePort);
        const sourceValue = resolvedInputs[sourcePort];
        if (sourceValue === undefined) return;
        let value: unknown = coerceInput(sourceValue);
        if (value && typeof value === 'object' && mapping.sourcePath) {
          const resolved = getValueAtMappingPath(value, mapping.sourcePath);
          if (resolved !== undefined) {
            value = resolved;
          } else if (sourcePort === 'result') {
            unresolvedSourcePorts.add(sourcePort);
            return;
          }
        }
        if (
          sourcePort === 'result' &&
        value &&
        typeof value === 'object' &&
        !mapping.sourcePath
        ) {
          const resultValue: unknown = (value as Record<string, unknown>)['result'];
          const descriptionValue: unknown = (value as Record<string, unknown>)['description'];
          const contentValue: unknown = (value as Record<string, unknown>)['content_en'];
          value = resultValue ?? descriptionValue ?? contentValue ?? value;
        }
        if (sourcePort === 'result' && isEffectivelyMissing(value)) {
          unresolvedSourcePorts.add(sourcePort);
          return;
        }
        if (typeof value === 'string' && trimStrings) {
          value = (value).trim();
        }
        if (skipEmpty && isEmptyValue(value)) {
          return;
        }
        if (mapping.targetPath) {
          updates[mapping.targetPath] = value;
        }
      });
      const missingSourcePorts: string[] = Array.from(requiredSourcePorts).filter(
        (sourcePort: string): boolean => resolvedInputs[sourcePort] === undefined,
      );
      const hasUpdates = Object.keys(updates).length > 0;
      if (missingSourcePorts.length > 0 || unresolvedSourcePorts.size > 0) {
        return prevOutputs;
      }
      if (!hasUpdates) {
        return prevOutputs;
      }
      const updateStrategy = dbConfig.updateStrategy ?? 'one';
      const entityType = (dbConfig.entityType ?? 'product').trim().toLowerCase();
      const configuredCollection = queryConfig.collection?.trim() ?? '';
      const configuredCollectionKey = configuredCollection.toLowerCase();
      const forceCollectionUpdate =
      configuredCollection.length > 0 &&
      !['product', 'products', 'note', 'notes'].includes(configuredCollectionKey);
      const shouldUseEntityUpdate =
      !forceCollectionUpdate && (entityType === 'product' || entityType === 'note');
      const idField = dbConfig.idField ?? 'entityId';
      const entityId = resolveEntityIdFromInputs(
      resolvedInputs as RuntimePortValues,
      idField,
      simulationEntityType,
      simulationEntityId,
      );
      const debugPayload = {
        mode: 'legacy',
        updateStrategy,
        entityType,
        collection: configuredCollection || null,
        forceCollectionUpdate,
        idField,
        entityId,
        updates,
        mappings,
      };
      let updateResult: unknown = updates;

      if (updateStrategy === 'many') {
        const queryPayload = buildDbQueryPayload(resolvedInputs as RuntimePortValues, queryConfig);
        const query = (queryPayload['query']) ?? {};
        const hasQuery =
        query && typeof query === 'object' && Object.keys(query).length > 0;

        if (
          hasUpdates &&
        dbConfig.mode === 'append' &&
        !executed.updater.has(node.id)
        ) {
          reportAiPathsError(
            new Error('Append mode is not supported for update many'),
            { action: 'updateMany', nodeId: node.id },
            'Database update many failed:',
          );
          toast('Update many does not support append mode.', {
            variant: 'error',
          });
          updateResult = {
            error: 'append_not_supported',
            updates,
            query,
            collection: queryPayload['collection'],
          };
          executed.updater.add(node.id);
        } else if (hasUpdates && !hasQuery && !executed.updater.has(node.id)) {
          return prevOutputs;
        } else if (hasUpdates && hasQuery && !executed.updater.has(node.id)) {
          if (dryRun) {
            updateResult = {
              dryRun: true,
              updateMany: true,
              collection: queryPayload['collection'],
              query,
              updates,
              mode: dbConfig.mode ?? 'replace',
            };
            executed.updater.add(node.id);
          } else {
            const dbUpdateResult: ApiResponse<DbActionResult> = await dbApi.update<DbActionResult>({ 
              provider: (queryPayload['provider'] as any),
              collection: queryPayload['collection'],
              query,
              updates,
              single: false,
              ...(queryPayload['idType'] !== undefined ? { idType: queryPayload['idType'] as any } : {}),
            });
            executed.updater.add(node.id);
            if (!dbUpdateResult.ok) {
              reportAiPathsError(
                new Error(dbUpdateResult.error),
                {
                  action: 'updateMany',
                  collection: queryPayload['collection'],
                  nodeId: node.id,
                },
                'Database update many failed:',
              );
              toast(`Failed to update ${queryPayload['collection']}.`, {
                variant: 'error',
              });
            } else {
              updateResult = dbUpdateResult.data;
              const modified: number = (dbUpdateResult.data as Record<string, unknown>)?.['modifiedCount'] as number ?? 0;
              const matched: number = (dbUpdateResult.data as Record<string, unknown>)?.['matchedCount'] as number ?? 0;
              const countLabel = modified || matched;
              toast(
                `Updated ${countLabel} document${countLabel === 1 ? '' : 's'} in ${queryPayload['collection']}.`,
                { variant: 'success' },
              );
            }
          }
        }
      } else if (!executed.updater.has(node.id)) {
        if (dryRun) {
          if (shouldUseEntityUpdate) {
            updateResult = {
              dryRun: true,
              entityType,
              entityId: entityId || undefined,
              updates,
              mode: dbConfig.mode ?? 'replace',
            };
          } else {
            const queryPayload = buildDbQueryPayload(
            resolvedInputs as RuntimePortValues,
            queryConfig,
            );
            const queryFromPayload =
            queryPayload['query'] &&
            typeof queryPayload['query'] === 'object' &&
            !Array.isArray(queryPayload['query'])
              ? (queryPayload['query'])
              : {};
            const fallbackQuery =
            Object.keys(queryFromPayload).length > 0
              ? queryFromPayload
              : entityId && idField.trim().length > 0
                ? { [idField]: entityId }
                : {};
            const collection =
            (queryPayload['collection'] as string | undefined)?.trim() || configuredCollection || entityType;
            updateResult = {
              dryRun: true,
              updateMany: false,
              collection,
              query: fallbackQuery,
              updates,
              mode: dbConfig.mode ?? 'replace',
            };
          }
          executed.updater.add(node.id);
        } else if (shouldUseEntityUpdate) {
          if (!entityId) {
            return prevOutputs;
          }
          try {
            const entityUpdateResult = await entityApi.update({
              entityType: entityType as any,
              entityId,
              updates,
              mode: dbConfig.mode ?? 'replace',
            });
            if (!entityUpdateResult.ok) {
              throw new Error(entityUpdateResult.error);
            }
            updateResult = entityUpdateResult.data ?? updates;
            executed.updater.add(node.id);
            const suffix = entityId ? ` ${entityId}` : '';
            toast(`Updated ${entityType}${suffix}`, { variant: 'success' });
          } catch (error: unknown) {
            reportAiPathsError(
              error,
              { action: 'updateEntity', entityType, entityId, nodeId: node.id },
              'Database update failed:',
            );
            toast(`Failed to update ${entityType}.`, { variant: 'error' });
            executed.updater.add(node.id);
          }
        } else {
          const queryPayload = buildDbQueryPayload(
          resolvedInputs as RuntimePortValues,
          queryConfig,
          );
          const queryFromPayload =
          queryPayload['query'] &&
          typeof queryPayload['query'] === 'object' &&
          !Array.isArray(queryPayload['query'])
            ? (queryPayload['query'])
            : {};
          const query =
          Object.keys(queryFromPayload).length > 0
            ? queryFromPayload
            : entityId && idField.trim().length > 0
              ? { [idField]: entityId }
              : {};
          const collection =
          (queryPayload['collection'] as string | undefined)?.trim() || configuredCollection || entityType;

          if (Object.keys(query).length === 0) {
            reportAiPathsError(
              new Error('Database update missing query filter'),
              {
                action: 'dbUpdateOne',
                collection,
                entityType,
                entityId,
                nodeId: node.id,
              },
              'Database update failed:',
            );
            toast('Database update requires a query filter.', { variant: 'error' });
            updateResult = { error: 'missing_query', collection, updates };
            executed.updater.add(node.id);
          } else {
            const dbUpdateResult: ApiResponse<DbActionResult> = await dbApi.update<DbActionResult>({
              provider: (queryPayload['provider'] as any),
              collection,
              query,
              updates,
              single: true,
              ...(queryPayload['idType'] !== undefined ? { idType: queryPayload['idType'] as any } : {}),
            });
            executed.updater.add(node.id);
            if (!dbUpdateResult.ok) {
              reportAiPathsError(
                new Error(dbUpdateResult.error),
                {
                  action: 'dbUpdateOne',
                  collection,
                  entityType,
                  nodeId: node.id,
                },
                'Database update failed:',
              );
              toast(dbUpdateResult.error || `Failed to update ${collection}.`, {
                variant: 'error',
              });
            } else {
              updateResult = dbUpdateResult.data;
              const modified: number = dbUpdateResult.data?.modifiedCount ?? 0;
              const matched: number = dbUpdateResult.data?.matchedCount ?? 0;
              const countLabel = modified || matched;
              toast(
                `Updated ${countLabel} document${countLabel === 1 ? '' : 's'} in ${collection}.`,
                { variant: 'success' },
              );
            }
          }
        }
      }

      const primaryTarget =
      mappings.find((mapping: UpdaterMapping) => mapping.targetPath)?.targetPath ??
      fallbackTarget;
      const primaryValue = updates[primaryTarget];
      return {
        content_en:
        primaryTarget === 'content_en'
          ? ((primaryValue as string | undefined) ??
            (nodeInputs['content_en'] as string | undefined) ??
            '')
          : (nodeInputs['content_en'] as string | undefined),
        bundle: updates,
        result: updateResult,
        debugPayload,
        aiPrompt,
      };
    }

    if (operation === 'insert') {
      const entityType = (dbConfig.entityType ?? 'product').trim().toLowerCase();
      const configuredCollection = queryConfig.collection?.trim() ?? '';
      const configuredCollectionKey = configuredCollection.toLowerCase();
      const forceCollectionInsert =
      configuredCollection.length > 0 &&
      !['product', 'products', 'note', 'notes'].includes(configuredCollectionKey);
      const writeSource = dbConfig.writeSource ?? 'bundle';

      // Resolve queryTemplate first (config-based payload with {{placeholder}} support),
      // falling back to the writeSource port value.
      const insertTemplate: string = queryConfig.queryTemplate?.trim() ?? '';
      const parsedTemplatePayload: unknown = insertTemplate
        ? parseJsonSafe(
          renderJsonTemplate(insertTemplate, templateContext, templateInputValue ?? ''),
        )
        : null;
      const templatePayload: unknown =
      parsedTemplatePayload && typeof parsedTemplatePayload === 'object' && !Array.isArray(parsedTemplatePayload)
        ? parsedTemplatePayload
        : null;
      const rawPayload = templatePayload ?? coerceInput(nodeInputs[writeSource]);
      const callbackInput = coerceInput(nodeInputs['queryCallback']);
    
      const coercePayloadObject = (value: unknown): Record<string, unknown> | null => {
        if (!value) return null;
        if (typeof value === 'string') {
          const parsed: unknown = parseJsonSafe(value);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
          }
          return null;
        }
        if (typeof value === 'object' && !Array.isArray(value)) {
          return value as Record<string, unknown>;
        }
        return null;
      };

      let payload = coercePayloadObject(rawPayload);
      if (payload && writeSourcePath) {
        const resolved = getValueAtMappingPath(payload, writeSourcePath);
        payload = coercePayloadObject(resolved);
      }

      // Callback injection for insert: if callback is an object, merge it or use it as payload
      if (
        callbackInput &&
      typeof callbackInput === 'object' &&
      !Array.isArray(callbackInput)
      ) {
        payload = {
          ...(payload ?? {}),
          ...(callbackInput as Record<string, unknown>),
        };
      }

      let insertResult: unknown = payload;

      if (!payload) {
        const nodeTitle = node.title?.trim();
        const nodeLabel = nodeTitle ? `"${nodeTitle}"` : `node ${node.id}`;
        const writeSourceLabel = writeSourcePath
          ? `${writeSource}.${writeSourcePath}`
          : writeSource;
        reportAiPathsError(
          new Error('Database insert missing payload'),
          {
            action: 'insertEntity',
            nodeId: node.id,
            nodeTitle: nodeTitle ?? null,
            writeSource,
            writeSourcePath,
          },
          'Database insert missing payload:',
        );
        toast(
          `Database insert payload missing for ${nodeLabel} (write source: ${writeSourceLabel}).`,
          { variant: 'error' },
        );
        return {
          result: null,
          bundle: { error: 'Missing payload' },
          aiPrompt,
        };
      }

      if (!executed.updater.has(node.id)) {
        if (dryRun) {
          insertResult = {
            dryRun: true,
            entityType,
            ...(configuredCollection ? { collection: configuredCollection } : {}),
            payload,
          };
          executed.updater.add(node.id);
        } else {
          if (forceCollectionInsert) {
            const queryPayload = buildDbQueryPayload(
            templateContext as RuntimePortValues,
            queryConfig,
            );
            const collection =
            queryPayload.collection?.trim() || configuredCollection || entityType;
            const customInsertPayload = {
              ...(queryPayload.provider
                ? {
                  provider: queryPayload.provider as
                  | 'auto'
                  | 'mongodb'
                  | 'prisma',
                }
                : {}),
              action: 'insertOne' as const,
              collection,
              document: payload,
            };
            const customInsertResult: ApiResponse<unknown> = await dbApi.action(
              customInsertPayload,
            );
            executed.updater.add(node.id);
            if (!customInsertResult.ok) {
              reportAiPathsError(
                new Error(customInsertResult.error),
                {
                  action: 'insertEntity',
                  entityType,
                  collection,
                  nodeId: node.id,
                },
                'Database insert failed:',
              );
              toast(customInsertResult.error || `Failed to insert ${collection}.`, {
                variant: 'error',
              });
            } else {
              insertResult = customInsertResult.data;
              toast(`Inserted ${collection}`, { variant: 'success' });
            }
          } else if (entityType === 'product') {
            const productResult: ApiResponse<unknown> = await entityApi.createProduct(
              buildFormData(payload),
            );
            executed.updater.add(node.id);
            if (!productResult.ok) {
              reportAiPathsError(
                new Error(productResult.error),
                { action: 'insertEntity', entityType, nodeId: node.id },
                'Database insert failed:',
              );
              toast(`Failed to insert ${entityType}.`, { variant: 'error' });
            } else {
              insertResult = productResult.data;
              toast(`Inserted ${entityType}`, { variant: 'success' });
            }
          } else if (entityType === 'note') {
            const noteResult: ApiResponse<unknown> = await entityApi.createNote(payload);
            executed.updater.add(node.id);
            if (!noteResult.ok) {
              reportAiPathsError(
                new Error(noteResult.error),
                { action: 'insertEntity', entityType, nodeId: node.id },
                'Database insert failed:',
              );
              toast(`Failed to insert ${entityType}.`, { variant: 'error' });
            } else {
              insertResult = noteResult.data;
              toast(`Inserted ${entityType}`, { variant: 'success' });
            }
          } else {
            const queryPayload = buildDbQueryPayload(
            templateContext as RuntimePortValues,
            queryConfig,
            );
            const collection =
            queryPayload.collection?.trim() ||
            queryConfig.collection?.trim() ||
            entityType;
            const customInsertPayload = {
              ...(queryPayload.provider
                ? {
                  provider: queryPayload.provider as
                  | 'auto'
                  | 'mongodb'
                  | 'prisma',
                }
                : {}),
              action: 'insertOne' as const,
              collection,
              document: payload,
            };
            const customInsertResult: ApiResponse<unknown> = await dbApi.action(
              customInsertPayload,
            );
            executed.updater.add(node.id);
            if (!customInsertResult.ok) {
              reportAiPathsError(
                new Error(customInsertResult.error),
                {
                  action: 'insertEntity',
                  entityType,
                  collection,
                  nodeId: node.id,
                },
                'Database insert failed:',
              );
              toast(customInsertResult.error || `Failed to insert ${collection}.`, {
                variant: 'error',
              });
            } else {
              insertResult = customInsertResult.data;
              toast(`Inserted ${collection}`, { variant: 'success' });
            }
          }
        }
      }

      return {
        result: insertResult,
        bundle: insertResult as Record<string, unknown>,
        content_en:
        typeof (insertResult as Record<string, unknown>)?.['content_en'] ===
        'string'
          ? ((insertResult as Record<string, unknown>)['content_en'] as string)
          : undefined,
        aiPrompt,
      };
    }

    if (operation === 'delete') {
      const entityType = (dbConfig.entityType ?? 'product').trim().toLowerCase();
      const idField = dbConfig.idField ?? 'entityId';
      const entityId = resolveEntityIdFromInputs(
        nodeInputs,
        idField,
        simulationEntityType,
        simulationEntityId,
      );
      if (!entityId) {
        reportAiPathsError(
          new Error('Database delete missing entity id'),
          { action: 'deleteEntity', nodeId: node.id },
          'Database delete missing entity id:',
        );
        toast('Database delete needs an entity ID input.', { variant: 'error' });
        return {
          result: null,
          bundle: { error: 'Missing entity id' },
          aiPrompt,
        };
      }

      let deleteResult: unknown = { ok: false };
      if (!executed.updater.has(node.id)) {
        if (dryRun) {
          deleteResult = { ok: true, dryRun: true, entityId, entityType };
          executed.updater.add(node.id);
        } else {
          if (entityType === 'product') {
            const productDeleteResult: { ok: boolean; error?: string } = await entityApi.deleteProduct(entityId);
            executed.updater.add(node.id);
            if (!productDeleteResult.ok) {
              reportAiPathsError(
                new Error(productDeleteResult.error),
                { action: 'deleteEntity', entityType, entityId, nodeId: node.id },
                'Database delete failed:',
              );
              toast(`Failed to delete ${entityType}.`, { variant: 'error' });
            } else {
              deleteResult = { ok: true, entityId };
              toast(`Deleted ${entityType} ${entityId}`, { variant: 'success' });
            }
          } else if (entityType === 'note') {
            const noteDeleteResult: { ok: boolean; error?: string } = await entityApi.deleteNote(entityId);
            executed.updater.add(node.id);
            if (!noteDeleteResult.ok) {
              reportAiPathsError(
                new Error(noteDeleteResult.error),
                { action: 'deleteEntity', entityType, entityId, nodeId: node.id },
                'Database delete failed:',
              );
              toast(`Failed to delete ${entityType}.`, { variant: 'error' });
            } else {
              deleteResult = { ok: true, entityId };
              toast(`Deleted ${entityType} ${entityId}`, { variant: 'success' });
            }
          } else {
            toast('Custom deletes are not supported yet.', { variant: 'error' });
            executed.updater.add(node.id);
            return {
              result: { ok: false },
              bundle: { ok: false, entityId },
              aiPrompt,
            };
          }
        }
      }

      return {
        result: deleteResult,
        bundle: deleteResult as Record<string, unknown>,
        aiPrompt,
      };
    }

    return { aiPrompt };
  } catch (error) {
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

type FieldInfo = {
  name: string;
  type: string;
  isRequired?: boolean;
  isId?: boolean;
  isUnique?: boolean;
  hasDefault?: boolean;
  relationTo?: string;
};

type CollectionSchema = {
  name: string;
  fields?: FieldInfo[];
  relations?: string[];
};

type LocalSchemaResponse = {
  provider: 'mongodb' | 'prisma' | 'multi';
  collections: CollectionSchema[];
};

function formatSchemaAsText(schema: LocalSchemaResponse): string {
  const lines: string[] = [
    'DATABASE SCHEMA',
    '===============',
    `Provider: ${schema.provider}`,
    '',
  ];

  for (const collection of schema.collections) {
    lines.push(`Collection: ${collection.name}`);
    lines.push('Fields:');
    for (const field of collection.fields ?? []) {
      const markers: string[] = [];
      if (field.isId) markers.push('ID');
      if (field.isRequired) markers.push('required');
      if (field.isUnique) markers.push('unique');
      if (field.hasDefault) markers.push('has default');
      const markerStr = markers.length > 0 ? ` [${markers.join(', ')}]` : '';
      lines.push(`  - ${field.name} (${field.type})${markerStr}`);
    }
    if (collection.relations && collection.relations.length > 0) {
      lines.push(`Relations: ${collection.relations.join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function filterCollections(
  schema: SchemaResponse,
  selectedCollections: string[],
): SchemaResponse {
  if (!selectedCollections || selectedCollections.length === 0) {
    return schema;
  }
  const selectedSet = new Set(selectedCollections.map((c: string): string => c.toLowerCase()));
  return {
    ...schema,
    collections: schema.collections.filter((c: CollectionSchema): boolean =>
      selectedSet.has(c.name.toLowerCase()),
    ),
  };
}

export const handleDbSchema: NodeHandler = async ({ 
  node,
  prevOutputs,
  executed,
  reportAiPathsError,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  if (executed.schema?.has(node.id)) return prevOutputs;

  const defaultConfig: DbSchemaConfig = {
    mode: 'all',
    collections: [],
    includeFields: true,
    includeRelations: true,
    formatAs: 'text',
  };

  const config: DbSchemaConfig = {
    ...defaultConfig,
    ...(node.config?.db_schema ?? {}),
  };

  const schemaResult = await getCachedSchema();
  if (!schemaResult.ok) {
    reportAiPathsError(
      new Error(schemaResult.error),
      { action: 'fetchDbSchema', nodeId: node.id },
      'Database schema fetch failed:',
    );
    return {
      schema: null,
      context: null,
    };
  }

  const fullSchema = schemaResult.data as SchemaResponse;

  // Filter collections if mode is "selected"
  const schema =
    config.mode === 'selected'
      ? filterCollections(fullSchema, config.collections ?? [])
      : fullSchema;

  // Optionally filter out fields or relations
  if (!config.includeFields || !config.includeRelations) {
    schema.collections = schema.collections.map((c: CollectionSchema): CollectionSchema => {
      const result: CollectionSchema = {
        name: c.name,
        fields: config.includeFields ? (c.fields ?? []) : [],
      };
      if (config.includeRelations && c.relations) {
        result.relations = c.relations;
      }
      return result;
    });
  }

  // Format for AI consumption
  const schemaText =
    config.formatAs === 'text'
      ? formatSchemaAsText(schema)
      : JSON.stringify(schema, null, 2);

  executed.schema?.add(node.id);

  return {
    // Keep ports strongly-typed:
    // - `schema` is the raw schema object (connect to "schema" inputs)
    // - `context` is an object containing both the raw schema + a text rendering for prompt/templates
    schema,
    context: {
      schema,
      schemaText,
      provider: schema.provider,
      collections: schema.collections,
    },
  };
};
