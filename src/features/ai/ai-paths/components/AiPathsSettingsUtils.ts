import type {
  DbQueryConfig,
  DatabaseConfig,
  ParserSampleState,
  PathConfig,
  RuntimeHistoryEntry,
  RuntimePortValues,
  RuntimeState,
  AiNode,
  UpdaterSampleState,
} from '@/shared/lib/ai-paths';
import {
  safeParseJson,
  parseJsonSafe,
  palette,
  cloneJsonSafe,
  coerceInput,
  renderTemplate,
  dbApi,
  aiJobsApi,
  backfillPathConfigNodeContracts,
  findPathConfigCollectionAliasIssues,
  getValueAtMappingPath,
  normalizeNodes,
  parserSampleStateSchema,
  safeStringify,
  safeJsonStringify as sharedSafeJsonStringify,
  sanitizeEdges,
  updaterSampleStateSchema,
  stableStringify,
  validateCanonicalPathNodeIdentities,
  EMPTY_RUNTIME_STATE,
} from '@/shared/lib/ai-paths';
import type { DbQueryPayload } from '@/shared/lib/ai-paths/api/client';
import { runtimeStateSchema } from '@/shared/contracts/ai-paths-runtime';
import { validationError } from '@/shared/errors/app-error';

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

export const toJsonSafe = (value: unknown): unknown => cloneJsonSafe(value);

export const safeJsonStringify = (value: unknown): string => sharedSafeJsonStringify(value);

export const parseRuntimeState = (value: unknown): RuntimeState => {
  if (!value) return EMPTY_RUNTIME_STATE;
  const assertNoLegacyRunIdentity = (record: Record<string, unknown>, location: string): void => {
    const deprecatedKeys = ['runId', 'runStartedAt'].filter(
      (key: string): boolean => key in record
    );
    if (deprecatedKeys.length === 0) return;
    throw validationError('Legacy AI Paths runtime identity fields are no longer supported.', {
      reason: 'deprecated_runtime_identity_fields',
      keys: deprecatedKeys,
      location,
    });
  };
  const assertNoLegacyRuntimeIdentityFields = (parsed: Record<string, unknown>): void => {
    assertNoLegacyRunIdentity(parsed, 'runtime_state');

    const events = parsed['events'];
    if (Array.isArray(events)) {
      events.forEach((entry: unknown, index: number): void => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
        assertNoLegacyRunIdentity(entry as Record<string, unknown>, `events[${index}]`);
      });
    }

    const history = parsed['history'];
    if (!history || typeof history !== 'object' || Array.isArray(history)) return;
    Object.entries(history as Record<string, unknown>).forEach(
      ([nodeId, entries]: [string, unknown]): void => {
        if (!Array.isArray(entries)) return;
        entries.forEach((entry: unknown, index: number): void => {
          if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
          assertNoLegacyRunIdentity(
            entry as Record<string, unknown>,
            `history.${nodeId}[${index}]`
          );
        });
      }
    );
  };
  const normalizeParsedRuntimeState = (parsed: Record<string, unknown>): RuntimeState => {
    assertNoLegacyRuntimeIdentityFields(parsed);
    const merged = {
      ...EMPTY_RUNTIME_STATE,
      ...parsed,
    };
    const validated = runtimeStateSchema.safeParse(merged);
    if (!validated.success) {
      throw validationError('Invalid AI Paths runtime state payload.', {
        reason: 'schema_validation_failed',
        issues: validated.error.flatten(),
      });
    }
    return validated.data as RuntimeState;
  };
  if (typeof value === 'string') {
    const parsed = safeParseJson(value).value;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return normalizeParsedRuntimeState(parsed as Record<string, unknown>);
    }
    throw validationError('Invalid AI Paths runtime state payload.', {
      reason: 'json_parse_failed',
    });
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return normalizeParsedRuntimeState(value as Record<string, unknown>);
  }
  throw validationError('Invalid AI Paths runtime state payload.', {
    reason: 'invalid_shape',
  });
};

const normalizeSampleRecord = <TSample>(
  value: unknown,
  parseSample: (sample: unknown) => TSample | null
): Record<string, TSample> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const normalized: Record<string, TSample> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, sampleValue]) => {
    const normalizedKey = key.trim();
    if (!normalizedKey) return;
    const parsed = parseSample(sampleValue);
    if (!parsed) return;
    normalized[normalizedKey] = parsed;
  });
  return normalized;
};

export const normalizeParserSamples = (value: unknown): Record<string, ParserSampleState> =>
  normalizeSampleRecord(value, (sample: unknown): ParserSampleState | null => {
    const parsed = parserSampleStateSchema.safeParse(sample);
    return parsed.success ? parsed.data : null;
  });

export const normalizeUpdaterSamples = (value: unknown): Record<string, UpdaterSampleState> =>
  normalizeSampleRecord(value, (sample: unknown): UpdaterSampleState | null => {
    const parsed = updaterSampleStateSchema.safeParse(sample);
    return parsed.success ? parsed.data : null;
  });

export const buildPersistedRuntimeState = (state: RuntimeState, graphNodes: AiNode[]): string => {
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
      const trimmedEntries = entries
        .slice(0, 20)
        .map(([key, entryValue]: [string, unknown]) => [
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
    const entries = Array.isArray(value) ? value : [];
    const trimmed = entries.slice(-historyLimit);
    if (trimmed.length > 0) {
      history[key] = trimmed.map((entry: RuntimeHistoryEntry): RuntimeHistoryEntry => {
        return {
          ...entry,
          inputs: entry.inputs ? trimRuntimePorts(entry.inputs) : entry.inputs,
          outputs: entry.outputs ? trimRuntimePorts(entry.outputs) : entry.outputs,
        } as RuntimeHistoryEntry;
      });
    }
  });
  const currentRun =
    state.currentRun && typeof state.currentRun.id === 'string'
      ? {
        id: state.currentRun.id,
        status: state.currentRun.status,
        startedAt: state.currentRun.startedAt ?? null,
        finishedAt: state.currentRun.finishedAt ?? null,
        pathId: state.currentRun.pathId ?? null,
        pathName: state.currentRun.pathName ?? null,
        createdAt: state.currentRun.createdAt,
        updatedAt: state.currentRun.updatedAt ?? null,
      }
      : null;
  const payload: Record<string, unknown> = {
    inputs,
    outputs,
    ...(currentRun ? { currentRun } : {}),
  };
  if (Object.keys(history).length > 0) {
    payload['history'] = history;
  }
  const safe = toJsonSafe(payload);
  return safe ? JSON.stringify(safe) : '';
};

const isDatabaseOperation = (value: unknown): value is DatabaseOperation =>
  value === 'query' || value === 'update' || value === 'insert' || value === 'delete';

const LEGACY_TRIGGER_DATA_PORTS = new Set(['context', 'meta', 'entityId', 'entityType']);

const resolveEdgeSourceNodeId = (edge: Record<string, unknown>): string => {
  const from = typeof edge['from'] === 'string' ? edge['from'].trim() : '';
  if (from) return from;
  const source = typeof edge['source'] === 'string' ? edge['source'].trim() : '';
  return source;
};

const resolveEdgeSourcePort = (edge: Record<string, unknown>): string => {
  const fromPort = typeof edge['fromPort'] === 'string' ? edge['fromPort'].trim() : '';
  if (fromPort) return fromPort;
  const sourceHandle = typeof edge['sourceHandle'] === 'string' ? edge['sourceHandle'].trim() : '';
  return sourceHandle;
};

const assertNoLegacyTriggerDataGraph = (nodes: AiNode[], edges: unknown[]): void => {
  const nodeById = new Map<string, AiNode>(
    nodes.map((node: AiNode): [string, AiNode] => [node.id, node])
  );

  nodes.forEach((node: AiNode): void => {
    if (node.type !== 'trigger') return;
    const outputs = Array.isArray(node.outputs) ? node.outputs : [];
    const legacyPorts = outputs.filter((port: string): boolean =>
      LEGACY_TRIGGER_DATA_PORTS.has(port)
    );
    if (legacyPorts.length === 0) return;
    throw validationError('Legacy AI Paths trigger data outputs are no longer supported.', {
      source: 'ai_paths.path_config',
      reason: 'deprecated_trigger_outputs',
      nodeId: node.id,
      outputs: legacyPorts,
    });
  });

  edges.forEach((edgeValue: unknown, index: number): void => {
    if (!edgeValue || typeof edgeValue !== 'object' || Array.isArray(edgeValue)) return;
    const edge = edgeValue as Record<string, unknown>;
    const sourceNodeId = resolveEdgeSourceNodeId(edge);
    const sourcePort = resolveEdgeSourcePort(edge);
    if (!sourceNodeId || !sourcePort) return;
    const sourceNode = nodeById.get(sourceNodeId);
    if (sourceNode?.type !== 'trigger') return;
    if (!LEGACY_TRIGGER_DATA_PORTS.has(sourcePort)) return;
    throw validationError('Legacy AI Paths trigger data edges are no longer supported.', {
      source: 'ai_paths.path_config',
      reason: 'deprecated_trigger_data_edge',
      edgeIndex: index,
      edgeId: typeof edge['id'] === 'string' ? edge['id'] : null,
      sourceNodeId,
      sourcePort,
    });
  });
};

export const sanitizePathConfig = (config: PathConfig): PathConfig => {
  const collectionAliasIssues = findPathConfigCollectionAliasIssues(config);
  if (collectionAliasIssues.length > 0) {
    throw validationError('AI Path config contains deprecated collection aliases.', {
      source: 'ai_paths.path_config',
      reason: 'deprecated_collection_aliases',
      pathId: config.id,
      issues: collectionAliasIssues,
    });
  }
  const contractBackfilled = backfillPathConfigNodeContracts(config).config;
  const sanitizedNodes = contractBackfilled.nodes.map((node: AiNode): AiNode => {
    if (node.type !== 'database' || !node.config || typeof node.config !== 'object') {
      return node;
    }
    const configRecord = node.config as Record<string, unknown>;
    const databaseConfig = configRecord['database'];
    if (!databaseConfig || typeof databaseConfig !== 'object') {
      return node;
    }
    const databaseRecord = databaseConfig as Record<string, unknown>;
    const queryConfig =
      databaseRecord['query'] && typeof databaseRecord['query'] === 'object'
        ? (databaseRecord['query'] as Record<string, unknown>)
        : null;
    if (Object.prototype.hasOwnProperty.call(databaseRecord, 'schemaSnapshot')) {
      throw validationError('AI Path config contains deprecated database schemaSnapshot.', {
        source: 'ai_paths.path_config',
        reason: 'deprecated_database_schema_snapshot',
        nodeId: node.id,
      });
    }
    const operation = databaseRecord['operation'];
    const nextDatabaseConfig = {
      ...(databaseConfig as Partial<DatabaseConfig>),
      operation: isDatabaseOperation(operation) ? operation : 'query',
      writeOutcomePolicy: {
        onZeroAffected:
          databaseRecord['writeOutcomePolicy'] &&
          typeof databaseRecord['writeOutcomePolicy'] === 'object' &&
          !Array.isArray(databaseRecord['writeOutcomePolicy']) &&
          ((databaseRecord['writeOutcomePolicy'] as Record<string, unknown>)['onZeroAffected'] ===
            'warn' ||
            (databaseRecord['writeOutcomePolicy'] as Record<string, unknown>)['onZeroAffected'] ===
              'ignore')
            ? ((databaseRecord['writeOutcomePolicy'] as Record<string, unknown>)[
              'onZeroAffected'
            ] as 'warn' | 'ignore')
            : 'fail',
      },
    } as DatabaseConfig;
    if (queryConfig) {
      const provider = queryConfig['provider'];
      if (provider === 'all') {
        throw validationError('AI Path config contains deprecated database query provider "all".', {
          source: 'ai_paths.path_config',
          reason: 'deprecated_database_query_provider',
          nodeId: node.id,
          provider,
        });
      }
      if (
        provider !== undefined &&
        provider !== 'auto' &&
        provider !== 'mongodb' &&
        provider !== 'prisma'
      ) {
        throw validationError('AI Path config contains invalid database query provider.', {
          source: 'ai_paths.path_config',
          reason: 'invalid_database_query_provider',
          nodeId: node.id,
          provider,
        });
      }
      nextDatabaseConfig.query = {
        provider: provider ?? 'auto',
        collection:
          typeof queryConfig['collection'] === 'string' ? queryConfig['collection'] : 'products',
        mode:
          queryConfig['mode'] === 'preset' || queryConfig['mode'] === 'custom'
            ? queryConfig['mode']
            : 'custom',
        preset:
          queryConfig['preset'] === 'by_id' ||
          queryConfig['preset'] === 'by_productId' ||
          queryConfig['preset'] === 'by_entityId' ||
          queryConfig['preset'] === 'by_field'
            ? queryConfig['preset']
            : 'by_id',
        field: typeof queryConfig['field'] === 'string' ? queryConfig['field'] : '_id',
        idType:
          queryConfig['idType'] === 'string' || queryConfig['idType'] === 'objectId'
            ? queryConfig['idType']
            : 'string',
        queryTemplate:
          typeof queryConfig['queryTemplate'] === 'string' ? queryConfig['queryTemplate'] : '',
        limit:
          typeof queryConfig['limit'] === 'number' && Number.isFinite(queryConfig['limit'])
            ? queryConfig['limit']
            : 20,
        sort: typeof queryConfig['sort'] === 'string' ? queryConfig['sort'] : '',
        ...(typeof queryConfig['sortPresetId'] === 'string'
          ? { sortPresetId: queryConfig['sortPresetId'] }
          : {}),
        projection: typeof queryConfig['projection'] === 'string' ? queryConfig['projection'] : '',
        ...(typeof queryConfig['projectionPresetId'] === 'string'
          ? { projectionPresetId: queryConfig['projectionPresetId'] }
          : {}),
        single: queryConfig['single'] === true,
      };
    }
    return {
      ...node,
      config: {
        ...configRecord,
        database: nextDatabaseConfig,
      },
    };
  });
  const identityIssues = validateCanonicalPathNodeIdentities(
    {
      ...contractBackfilled,
      nodes: sanitizedNodes,
    },
    { palette }
  );
  if (identityIssues.length > 0) {
    throw validationError('AI Path config contains legacy node identities.', {
      source: 'ai_paths.path_config',
      reason: 'deprecated_node_identities',
      pathId: config.id,
      issues: identityIssues,
    });
  }
  const normalizedNodes = normalizeNodes(sanitizedNodes);
  const rawEdges = Array.isArray(contractBackfilled.edges) ? contractBackfilled.edges : [];
  assertNoLegacyTriggerDataGraph(normalizedNodes, rawEdges);
  const graphNodes = normalizeNodes(normalizedNodes);
  const normalizedEdges = sanitizeEdges(graphNodes, rawEdges);
  if (stableStringify(normalizedEdges) !== stableStringify(rawEdges)) {
    throw validationError('AI Path config contains invalid or non-canonical edges.', {
      source: 'ai_paths.path_config',
      reason: 'invalid_edges',
      pathId: config.id,
    });
  }
  const uiState = contractBackfilled.uiState ? { ...contractBackfilled.uiState } : undefined;
  if (uiState && 'configOpen' in uiState) {
    delete (uiState as { configOpen?: boolean }).configOpen;
  }
  return {
    ...contractBackfilled,
    nodes: graphNodes,
    edges: normalizedEdges,
    uiState,
    runtimeState: buildPersistedRuntimeState(
      parseRuntimeState(contractBackfilled.runtimeState),
      graphNodes
    ),
  };
};

export const sanitizePathConfigs = (
  configs: Record<string, PathConfig>
): Record<string, PathConfig> =>
  Object.fromEntries(
    Object.entries(configs).map(([key, value]: [string, PathConfig]) => [
      key,
      sanitizePathConfig(value),
    ])
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
      const rendered = renderTemplate(queryTemplate, nodeInputs, inputValue ?? '');
      const parsed = parseJsonSafe(rendered);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        query = parsed as Record<string, unknown>;
      }
    }
  }
  const projection = parseJsonSafe(queryConfig.projection ?? '') as
    | Record<string, unknown>
    | undefined;
  const sort = parseJsonSafe(queryConfig.sort ?? '') as Record<string, unknown> | undefined;
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
    let success: boolean;
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
      const result = jobResult as { result?: string } | string | null | undefined;
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
