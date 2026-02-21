import type {
  DbQueryConfig,
  DatabaseConfig,
  PathConfig,
  RuntimeHistoryEntry,
  RuntimePortValues,
  RuntimeState,
  AiNode,
} from '@/features/ai/ai-paths/lib';
import {
  safeParseJson,
  parseJsonSafe,
  coerceInput,
  renderTemplate,
  dbApi,
  aiJobsApi,
  backfillPathConfigNodeContracts,
  getValueAtMappingPath,
  migratePathConfigCollections,
  safeStringify,
  stableStringify,
} from '@/features/ai/ai-paths/lib';
import type { DbQueryPayload } from '@/features/ai/ai-paths/lib/api/client';

type DatabaseOperation = 'query' | 'update' | 'insert' | 'delete';

export const DEFAULT_DB_QUERY: DbQueryConfig = {
  provider: 'auto',
  collection: 'products',
  mode: 'custom',
  preset: 'by_id',
  field: '_id',
  idType: 'string',
  queryTemplate: '',
  limit: 20,
  sort: '',
  projection: '',
  single: false,
};

const createAbortError = (): Error => {
  const error = new Error('Operation aborted.');
  (error as { name?: string }).name = 'AbortError';
  return error;
};

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (!signal) {
      setTimeout(resolve, ms);
      return;
    }
    if (signal.aborted) {
      reject(createAbortError());
      return;
    }
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(createAbortError());
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });

export const toJsonSafe = (value: unknown): unknown => {
  const seen = new WeakSet();
  const replacer = (_key: string, val: unknown): unknown => {
    if (typeof val === 'bigint') return val.toString();
    if (val instanceof Date) return val.toISOString();
    if (val instanceof Set) return Array.from(val.values()) as unknown[];
    if (val instanceof Map) return Object.fromEntries(val.entries()) as Record<string, unknown>;
    if (typeof val === 'function' || typeof val === 'symbol') return undefined;
    if (val && typeof val === 'object') {
      if (seen.has(val)) return undefined;
      seen.add(val);
    }
    
    return val;
  };
  try {
    return JSON.parse(JSON.stringify(value, replacer)) as unknown;
  } catch {
    return null;
  }
};

export const safeJsonStringify = (value: unknown): string => {
  const seen = new WeakSet();
  const replacer = (_key: string, val: unknown): unknown => {
    if (typeof val === 'bigint') return val.toString();
    if (val instanceof Date) return val.toISOString();
    if (val instanceof Set) return Array.from(val.values()) as unknown[];
    if (val instanceof Map) return Object.fromEntries(val.entries()) as Record<string, unknown>;
    if (typeof val === 'function' || typeof val === 'symbol') return undefined;
    if (val && typeof val === 'object') {
      if (seen.has(val)) return undefined;
      seen.add(val);
    }
    
    return val;
  };
  try {
    return JSON.stringify(value, replacer);
  } catch {
    return '';
  }
};

const EMPTY_RUNTIME_STATE: RuntimeState = { inputs: {}, outputs: {} } as unknown as RuntimeState;

export const parseRuntimeState = (value: unknown): RuntimeState => {
  if (!value) return EMPTY_RUNTIME_STATE;
  if (typeof value === 'string') {
    const parsed = safeParseJson(value).value;
    if (parsed && typeof parsed === 'object') {
      return parsed as RuntimeState;
    }
    return EMPTY_RUNTIME_STATE;
  }
  if (typeof value === 'object') {
    return value as RuntimeState;
  }
  return EMPTY_RUNTIME_STATE;
};

export const buildPersistedRuntimeState = (
  state: RuntimeState,
  graphNodes: AiNode[]
): string => {
  const excludedTypes = new Set<string>(['notification', 'viewer']);
  const trimRuntimeValue = (value: unknown, depth: number = 1): unknown => {
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') {
      const trimmed = value.length > 1000 ? `${value.slice(0, 1000)}…` : value;
      return trimmed;
    }
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) {
      if (depth <= 0) return `[Array(${value.length})]`;
      const slice = value.slice(0, 20).map((entry: unknown) => trimRuntimeValue(entry, depth - 1));
      if (value.length > 20) {
        slice.push(`…${value.length - 20} more`);
      }
      return slice;
    }
    if (typeof value === 'object') {
      if (depth <= 0) return '[Object]';
      const record = value as Record<string, unknown>;
      const entries = Object.entries(record);
      const trimmedEntries = entries.slice(0, 20).map(([key, entryValue]: [string, unknown]) => [
        key,
        trimRuntimeValue(entryValue, depth - 1),
      ]);
      const result = Object.fromEntries(trimmedEntries) as Record<string, unknown>;
      if (entries.length > 20) {
        result['__truncated__'] = `…${entries.length - 20} more keys`;
      }
      return result;
    }
    return value;
  };
  const trimRuntimePorts = (ports: RuntimePortValues): RuntimePortValues => {
    const trimmed: RuntimePortValues = {};
    Object.entries(ports).forEach(([key, value]: [string, unknown]) => {
      trimmed[key] = trimRuntimeValue(value, 1);
    });
    return trimmed;
  };
  const includeHistoryInPathConfig = false;
  const historyLimit = 5;
  const nodeIds = new Set(
    graphNodes
      .filter((node: AiNode): boolean => !excludedTypes.has(node.type))
      .map((node: AiNode) => node.id)
  );
  const inputs: Record<string, RuntimePortValues> = {};
  const outputs: Record<string, RuntimePortValues> = {};
  const history: Record<string, RuntimeHistoryEntry[]> = {};
  Object.entries(state.inputs ?? {}).forEach(([key, value]: [string, RuntimePortValues]) => {
    if (nodeIds.has(key)) {
      inputs[key] = trimRuntimePorts(value);
    }
  });
  Object.entries(state.outputs ?? {}).forEach(([key, value]: [string, RuntimePortValues]) => {
    if (nodeIds.has(key)) {
      outputs[key] = trimRuntimePorts(value);
    }
  });
  Object.entries(state.history ?? {}).forEach(([key, value]) => {
    if (!includeHistoryInPathConfig) return;
    if (!nodeIds.has(key)) return;
    const entries = Array.isArray(value) ? (value) : [];
    const trimmed = entries.slice(-historyLimit);
    if (trimmed.length > 0) {
      history[key] = trimmed.map((entry: RuntimeHistoryEntry): RuntimeHistoryEntry => ({
        ...entry,
        inputs: entry.inputs ? trimRuntimePorts(entry.inputs) : entry.inputs,
        outputs: entry.outputs ? trimRuntimePorts(entry.outputs) : entry.outputs,
      }));
    }
  });
  const payload: Record<string, unknown> = {
    inputs,
    outputs,
    ...(state.runId ? { runId: state.runId } : {}),
    ...(state.runStartedAt ? { runStartedAt: state.runStartedAt } : {}),
  };
  if (Object.keys(history).length > 0) {
    payload['history'] = history;
  }
  const safe = toJsonSafe(payload);
  return safe ? JSON.stringify(safe) : '';
};

const isDatabaseOperation = (value: unknown): value is DatabaseOperation =>
  value === 'query' || value === 'update' || value === 'insert' || value === 'delete';

export const sanitizePathConfig = (config: PathConfig): PathConfig => {
  const migrated = migratePathConfigCollections(config).config;
  const contractBackfilled = backfillPathConfigNodeContracts(migrated).config;
  const sanitizedNodes = contractBackfilled.nodes.map((node: AiNode): AiNode => {
    if (node.type !== 'database' || !node.config || typeof node.config !== 'object') {
      return node;
    }
    const configRecord = node.config as Record<string, unknown>;
    const databaseConfig = configRecord['database'];
    if (!databaseConfig || typeof databaseConfig !== 'object') {
      return node;
    }
    if (!('schemaSnapshot' in (databaseConfig as Record<string, unknown>))) {
      return node;
    }
    const operation = (databaseConfig as Record<string, unknown>)['operation'];
    const nextDatabaseConfig = {
      ...(databaseConfig as Partial<DatabaseConfig>),
      operation: isDatabaseOperation(operation) ? operation : 'query',
    } as DatabaseConfig;
    delete (nextDatabaseConfig as { schemaSnapshot?: unknown })['schemaSnapshot'];
    return {
      ...node,
      config: {
        ...configRecord,
        database: nextDatabaseConfig,
      },
    };
  });
  const uiState = contractBackfilled.uiState ? { ...contractBackfilled.uiState } : undefined;
  if (uiState && 'configOpen' in uiState) {
    delete (uiState as { configOpen?: boolean }).configOpen;
  }
  return {
    ...contractBackfilled,
    nodes: sanitizedNodes,
    uiState,
    runtimeState: buildPersistedRuntimeState(
      parseRuntimeState(contractBackfilled.runtimeState),
      sanitizedNodes
    ),
  };
};

export const sanitizePathConfigs = (configs: Record<string, PathConfig>): Record<string, PathConfig> =>
  Object.fromEntries(
    Object.entries(configs).map(([key, value]: [string, PathConfig]) => [key, sanitizePathConfig(value)])
  );

export const serializePathConfigs = (configs: Record<string, PathConfig>): string =>
  stableStringify(sanitizePathConfigs(configs));

export const buildDbQueryPayload = (
  nodeInputs: RuntimePortValues,
  queryConfig: DbQueryConfig
): DbQueryPayload => {
  const inputQuery = coerceInput(nodeInputs['query']);
  const callbackQueryInput = coerceInput(nodeInputs['queryCallback']);
  const aiQueryInput = coerceInput(nodeInputs['aiQuery']);
  const inputValue = coerceInput(nodeInputs['value']) ?? coerceInput(nodeInputs['jobId']);
  let query: Record<string, unknown> = {};
  const inlineQuery =
    (aiQueryInput && typeof aiQueryInput === 'object' && !Array.isArray(aiQueryInput)
      ? (aiQueryInput as Record<string, unknown>)
      : null) ??
    (inputQuery && typeof inputQuery === 'object' && !Array.isArray(inputQuery)
      ? (inputQuery as Record<string, unknown>)
      : null) ??
    (callbackQueryInput &&
      typeof callbackQueryInput === 'object' &&
      !Array.isArray(callbackQueryInput)
      ? (callbackQueryInput as Record<string, unknown>)
      : null);
  if (inlineQuery) {
    query = inlineQuery;
  } else {
    const queryTemplate = queryConfig.queryTemplate ?? '';
    if (queryTemplate.trim()) {
      const rendered = renderTemplate(
        queryTemplate,
        nodeInputs,
        inputValue ?? ''
      );
      const parsed = parseJsonSafe(rendered);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        query = parsed as Record<string, unknown>;
      }
    }
  }
  const projection = parseJsonSafe(queryConfig.projection ?? '') as
    | Record<string, unknown>
    | undefined;
  const sort = parseJsonSafe(queryConfig.sort ?? '') as
    | Record<string, unknown>
    | undefined;
  return {
    query,
    projection,
    sort,
    provider: queryConfig.provider,
    collection: queryConfig.collection,
    limit: queryConfig.limit,
    single: queryConfig.single,
    idType: queryConfig.idType,
  };
};

export const pollDatabaseQuery = async (
  nodeInputs: RuntimePortValues,
  config: {
    intervalMs: number;
    maxAttempts: number;
    dbQuery: DbQueryConfig;
    successPath: string;
    successOperator: 'truthy' | 'equals' | 'contains' | 'notEquals';
    successValue: string;
    resultPath: string;
  },
  options?: { signal?: AbortSignal }
): Promise<{ result: unknown; status: string; bundle: Record<string, unknown> }> => {
  const maxAttempts = config.maxAttempts;
  const intervalMs = config.intervalMs;
  const successPath = config.successPath || 'status';
  const successOperator = config.successOperator || 'equals';
  const successValue = config.successValue ?? 'completed';
  const resultPath = config.resultPath || '';
  let lastBundle: Record<string, unknown> | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (options?.signal?.aborted) {
      throw createAbortError();
    }
    const payload = buildDbQueryPayload(nodeInputs, config.dbQuery);
    const queryResult = await dbApi.query<{ item?: unknown; items?: unknown[] }>(payload);
    if (!queryResult.ok) {
      throw new Error('Failed to execute database query.');
    }
    const data = queryResult.data;
    const resultCandidate = payload.single ? data.item : data.items;
    lastBundle = {
      ...(payload.single ? { item: data.item } : { items: data.items }),
    };
    const resolvedStatus = successPath
      ? getValueAtMappingPath(resultCandidate, successPath)
      : resultCandidate;
    const asString = safeStringify(resolvedStatus);
    let success = false;
    switch (successOperator) {
      case 'truthy':
        success = Boolean(resolvedStatus);
        break;
      case 'notEquals':
        success = asString !== String(successValue);
        break;
      case 'contains':
        success = asString.includes(String(successValue));
        break;
      case 'equals':
      default:
        success = asString === String(successValue);
    }
    if (success) {
      const result = resultPath
        ? getValueAtMappingPath(resultCandidate, resultPath)
        : resultCandidate;
      return {
        result,
        status: 'completed',
        bundle: lastBundle ?? {},
      };
    }
    if (attempt < maxAttempts - 1) {
      await sleep(Math.max(0, intervalMs), options?.signal);
    }
  }
  return {
    result: null,
    status: 'timeout',
    bundle: lastBundle ?? {},
  };
};

export const pollGraphJob = async (
  jobId: string,
  options?: { intervalMs?: number; maxAttempts?: number; signal?: AbortSignal }
): Promise<string> => {
  const maxAttempts = options?.maxAttempts ?? 60;
  const intervalMs = options?.intervalMs ?? 2000;
  const signal = options?.signal;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (signal?.aborted) {
      throw createAbortError();
    }
    const pollResult = await aiJobsApi.poll(jobId, signal ? { signal } : {});
    if (!pollResult.ok) {
      if (signal?.aborted) {
        throw createAbortError();
      }
      throw new Error('Failed to fetch job status.');
    }
    const { status, result: jobResult, error: jobError } = pollResult.data;
    if (!status) continue;
    if (status === 'completed') {
      const result = jobResult as
        | { result?: string }
        | string
        | null
        | undefined;
      if (result && typeof result === 'object' && 'result' in result) {
        return (result as { result?: string }).result ?? '';
      }
      return typeof result === 'string' ? result : JSON.stringify(result ?? '');
    }
    if (status === 'failed') {
      throw new Error(jobError || 'AI job failed.');
    }
    if (status === 'canceled') {
      throw new Error('AI job was canceled.');
    }
    if (attempt < maxAttempts - 1) {
      await sleep(Math.max(0, intervalMs), signal);
    }
  }
  throw new Error('AI job timed out.');
};
