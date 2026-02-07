import type {
  ContextConfig,
  DbQueryConfig,
  RuntimePortValues,
} from '@/shared/types/ai-paths';

import { aiJobsApi, dbApi } from '../../api';
import {
  DEFAULT_CONTEXT_ROLE,
} from '../constants';
import {
  applyContextScope,
  coerceInput,
  formatRuntimeValue,
  getValueAtMappingPath,
  parseJsonSafe,
  renderJsonTemplate,
  renderTemplate,
  safeStringify,
} from '../utils';

export const looksLikeObjectId = (value: unknown): boolean =>
  typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);

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

export function extractImageUrls(value: unknown, seen: Set<object> = new Set<object>()): string[] {
  if (!value) return [];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        return extractImageUrls(parsed, seen);
      } catch {
        return /(\.png|\.jpe?g|\.webp|\.gif|\.svg|\/uploads\/|^https?:\/\/)/i.test(value) ? [value] : [];
      }
    }
    return /(\.png|\.jpe?g|\.webp|\.gif|\.svg|\/uploads\/|^https?:\/\/)/i.test(value) ? [value] : [];
  }
  if (Array.isArray(value)) {
    return Array.from(
      new Set(value.flatMap((item: unknown) => extractImageUrls(item, seen)))
    );
  }
  if (typeof value === 'object') {
    if (seen.has(value)) return [];
    seen.add(value);
    const record = value as Record<string, unknown>;
    const candidates = [
      'url',
      'src',
      'thumbnail',
      'thumb',
      'imageUrl',
      'image',
      'imageFile',
      'filepath',
      'filePath',
      'path',
      'file',
      'previewUrl',
      'preview',
    ];
    const urls: string[] = candidates.flatMap((key: string) => extractImageUrls(record[key], seen));
    if (urls.length) return Array.from(new Set(urls));
    const deepUrls: string[] = Object.values(record).flatMap((val: unknown) =>
      extractImageUrls(val, seen)
    );
    return Array.from(new Set(deepUrls));
  }
  return [];
}

export const buildFallbackEntity = (entityId?: string | null): Record<string, unknown> => ({
  id: entityId ?? 'demo-entity',
  title: 'Sample entity',
  images: [],
  content_en: 'Sample content',
});

export const coercePayloadObject = (value: unknown): Record<string, unknown> | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    const parsed = parseJsonSafe(value);
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

export const buildPromptOutput = (
  promptConfig: { template?: string } | undefined,
  nodeInputs: RuntimePortValues
): { promptOutput: string; imagesValue: unknown } => {
  const resolvedConfig = promptConfig ?? { template: '' };
  const bundleValue = coerceInput(nodeInputs.bundle);
  let bundleContext: Record<string, unknown> = {};
  if (bundleValue && typeof bundleValue === 'object' && !Array.isArray(bundleValue)) {
    bundleContext = bundleValue as Record<string, unknown>;
  } else if (typeof bundleValue === 'string') {
    const parsed = parseJsonSafe(bundleValue);
    if (parsed && typeof parsed === 'object' && !Array.isArray(bundleValue)) {
      bundleContext = parsed as Record<string, unknown>;
    }
  }
  const bundleTitle = 
    bundleContext.title ??
    bundleContext.name ??
    bundleContext.name_en ??
    bundleContext.name_pl ??
    bundleContext.name_de ??
    bundleContext.label ??
    bundleContext.productName ??
    undefined;
  const bundleId = 
    bundleContext.productId ??
    bundleContext.entityId ??
    bundleContext.id ??
    bundleContext._id ??
    undefined;
  const bundleDescription = 
    bundleContext.content_en ??
    bundleContext.description_en ??
    bundleContext.description ??
    bundleContext.content ??
    undefined;
  const alias: Record<string, unknown> = {
    ...(bundleTitle !== undefined ? { title: bundleTitle, name: bundleTitle } : {}),
    ...(bundleId !== undefined ? { productId: bundleId, entityId: bundleId } : {}),
    ...(bundleDescription !== undefined
      ? { content_en: bundleDescription, description_en: bundleDescription } 
      : {}),
  };
  const data = { ...bundleContext, ...alias, ...nodeInputs, bundle: bundleContext };
  const currentValue = 
    coerceInput(nodeInputs.result) ?? coerceInput(nodeInputs.value) ?? '';
  const prompt = resolvedConfig.template
    ? renderTemplate(
      resolvedConfig.template,
        data as Record<string, unknown>,
        currentValue
    )
    : Object.entries(data as Record<string, unknown>)
      .map(([key, value]: [string, unknown]) => `${key}: ${formatRuntimeValue(value)}`)
      .join('\n');
  const imagesValue = 
    nodeInputs.images !== undefined
      ? nodeInputs.images
      : bundleContext.images !== undefined
        ? bundleContext.images
        : undefined;
  return { promptOutput: prompt || 'Prompt: (no template)', imagesValue };
};

export const resolveJobProductId = (
  nodeInputs: RuntimePortValues,
  simulationEntityType?: string | null,
  simulationEntityId?: string | null,
  activePathId?: string | null
): string => {
  const direct = 
    coerceInput(nodeInputs.productId) ?? coerceInput(nodeInputs.entityId);
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  if (typeof direct === 'number') return String(direct);
  const contextValue = coerceInput(nodeInputs.context) as
    | { entityId?: string; productId?: string } 
    | undefined;
  if (contextValue?.productId?.trim()) return contextValue.productId.trim();
  if (contextValue?.entityId?.trim()) return contextValue.entityId.trim();
  const entityJson = coerceInput(nodeInputs.entityJson) as
    | { id?: string | number } 
    | undefined;
  if (typeof entityJson?.id === 'string' && entityJson.id.trim()) {
    return entityJson.id.trim();
  }
  if (typeof entityJson?.id === 'number') return String(entityJson.id);
  if (simulationEntityType === 'product' && simulationEntityId) {
    return simulationEntityId;
  }
  return activePathId ?? 'ai_paths_graph';
};

export const resolveEntityIdFromInputs = (
  nodeInputs: RuntimePortValues,
  idField?: string,
  simulationEntityType?: string | null,
  simulationEntityId?: string | null
): string => {
  const direct =
    (idField ? coerceInput(nodeInputs[idField]) : undefined) ??
    coerceInput(nodeInputs.entityId) ??
    coerceInput(nodeInputs.productId);
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  if (typeof direct === 'number') return String(direct);
  const contextValue = coerceInput(nodeInputs.context) as
    | { entityId?: string; productId?: string } 
    | undefined;
  if (contextValue?.productId?.trim()) return contextValue.productId.trim();
  if (contextValue?.entityId?.trim()) return contextValue.entityId.trim();
  const bundleValue = coerceInput(nodeInputs.bundle) as
    | { entityId?: string; productId?: string; id?: string | number } 
    | undefined;
  if (typeof bundleValue?.productId === 'string' && bundleValue.productId.trim()) {
    return bundleValue.productId.trim();
  }
  if (typeof bundleValue?.entityId === 'string' && bundleValue.entityId.trim()) {
    return bundleValue.entityId.trim();
  }
  if (typeof bundleValue?.id === 'string' && bundleValue.id.trim()) {
    return bundleValue.id.trim();
  }
  if (typeof bundleValue?.id === 'number') return String(bundleValue.id);
  const entityJson = coerceInput(nodeInputs.entityJson) as
    | { id?: string | number } 
    | undefined;
  if (typeof entityJson?.id === 'string' && entityJson.id.trim()) {
    return entityJson.id.trim();
  }
  if (typeof entityJson?.id === 'number') return String(entityJson.id);
  if (simulationEntityType === 'product' && simulationEntityId) {
    return simulationEntityId;
  }
  return '';
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
    try {
      const pollResult = await aiJobsApi.poll(jobId, signal ? { signal } : {});
      if (!pollResult.ok) {
        if (signal?.aborted) {
          throw createAbortError();
        }
        throw new Error(`Connection error: ${pollResult.error}`);
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
    } catch (error) {
      if (signal?.aborted) {
        throw createAbortError();
      }
      if (attempt === maxAttempts - 1) {
        throw new Error(`Connection error after ${maxAttempts} attempts: ${error instanceof Error ? error.message : String(error)}`);
      }
      // Wait before retrying on connection errors
      await sleep(Math.max(0, intervalMs), signal);
    }
  }
  throw new Error('AI job timed out.');
};

export const buildDbQueryPayload = (
  nodeInputs: RuntimePortValues,
  queryConfig: DbQueryConfig
): {
  query: Record<string, unknown>;
  projection?: Record<string, unknown>;
  sort?: Record<string, unknown>;
  provider: string;
  collection: string;
  limit?: number;
  single?: boolean;
  idType?: string;
} => {
  const inputQuery = coerceInput(nodeInputs.query);
  const aiQueryInput = coerceInput(nodeInputs.aiQuery ?? nodeInputs.queryCallback);
  const inputValue = coerceInput(nodeInputs.value) ?? coerceInput(nodeInputs.jobId);
  const entityIdInput = coerceInput(nodeInputs.entityId);
  const productIdInput = coerceInput(nodeInputs.productId);
  let query: Record<string, unknown> = {};
  const parseRenderedQuery = (raw: string): Record<string, unknown> | null => {
    const parsed = parseJsonSafe(
      renderJsonTemplate(
        raw,
        nodeInputs as Record<string, unknown>,
        inputValue ?? ''
      )
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
        const serialized = JSON.stringify(value);
        return parseRenderedQuery(serialized) ?? (value as Record<string, unknown>);
      } catch {
        return value as Record<string, unknown>;
      }
    }
    if (typeof value === 'string') {
      const match = value.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = match ? match[1]!.trim() : value.trim();
      return parseRenderedQuery(jsonStr);
    }
    return null;
  };
  const inlineQuery = parseQueryInput(aiQueryInput ?? inputQuery);
  if (inlineQuery) {
    query = inlineQuery;
  } else if (queryConfig.mode === 'preset') {
    const presetValue =
      queryConfig.preset === 'by_productId'
        ? productIdInput ?? inputValue
        : queryConfig.preset === 'by_entityId'
          ? entityIdInput ?? inputValue
          : inputValue ?? entityIdInput ?? productIdInput;
    if (presetValue !== undefined) {
      let field =
        queryConfig.preset === 'by_productId'
          ? 'productId'
          : queryConfig.preset === 'by_entityId'
            ? 'entityId'
            : queryConfig.preset === 'by_field'
              ? queryConfig.field || 'id'
              : '_id';
      if (queryConfig.preset === 'by_id' && field === '_id' && !looksLikeObjectId(presetValue)) {
        field = 'id';
      }
      query = { [field]: presetValue };
    }
  } else {
    const parsed = parseJsonSafe(
      renderJsonTemplate(
        queryConfig.queryTemplate ?? '{}',
        nodeInputs as Record<string, unknown>,
        inputValue ?? ''
      )
    );
    if (parsed && typeof parsed === 'object') {
      query = parsed as Record<string, unknown>;
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
    provider: queryConfig.provider,
    collection: queryConfig.collection,
    ...(projection !== undefined ? { projection } : {}),
    ...(sort !== undefined ? { sort } : {}),
    ...(queryConfig.limit !== undefined ? { limit: queryConfig.limit } : {}),
    ...(queryConfig.single !== undefined ? { single: queryConfig.single } : {}),
    ...(queryConfig.idType !== undefined ? { idType: queryConfig.idType } : {}),
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
  const evaluateMatch = (value: unknown): boolean => {
    if (config.successOperator === 'truthy') return Boolean(value);
    const compareTarget = config.successValue ?? '';
    const valStr = safeStringify(value);
    const targetStr = String(compareTarget);

    if (config.successOperator === 'equals') {
      return valStr === targetStr;
    }
    if (config.successOperator === 'notEquals') {
      return valStr !== targetStr;
    }
    if (config.successOperator === 'contains') {
      if (Array.isArray(value)) {
        return value
          .map((entry: unknown) =>
            entry === undefined || entry === null
              ? ''
              : typeof entry === 'string'
                ? entry
                : typeof entry === 'object'
                  ? JSON.stringify(entry)
                  : safeStringify(entry)
          )
          .includes(targetStr);
      }
      return valStr.includes(targetStr);
    }
    return Boolean(value);
  };

  let lastResult: unknown = null;
  let lastBundle: Record<string, unknown> = {};
  // Pre-compute query payload since inputs don't change during polling
  const payload = buildDbQueryPayload(nodeInputs, config.dbQuery);
  for (let attempt = 0; attempt < config.maxAttempts; attempt += 1) {
    if (options?.signal?.aborted) {
      throw createAbortError();
    }
    const queryResult = await dbApi.query<{
      items?: unknown[];
      item?: unknown;
      count?: number;
    }>(payload);
    if (!queryResult.ok) {
      throw new Error('Database poll query failed.');
    }
    const data = queryResult.data;
    const result: unknown = config.dbQuery.single ? data.item ?? null : data.items ?? [];
    const bundle = {
      count: data.count ?? (Array.isArray(result) ? result.length : result ? 1 : 0),
      query: payload.query,
      collection: payload.collection,
      attempt: attempt + 1,
    };
    lastResult = result;
    lastBundle = bundle;
    const successPath = config.successPath?.trim() ?? '';
    const matchedItem: unknown = Array.isArray(result)
      ? result.find((item: unknown) =>
        evaluateMatch(getValueAtMappingPath(item, successPath))
      )
      : null;
    const candidate: unknown = successPath
      ? Array.isArray(result)
        ? matchedItem
        : getValueAtMappingPath(result, successPath)
      : result;
    const isMatch = Array.isArray(result)
      ? Boolean(matchedItem) ||
        result.some((item: unknown) =>
          evaluateMatch(
            successPath ? getValueAtMappingPath(item, successPath) : item
          )
        )
      : evaluateMatch(candidate);
    if (isMatch) {
      let resolvedResult: unknown = config.resultPath?.trim()
        ? getValueAtMappingPath(result, config.resultPath)
        : result;
      if (resolvedResult === undefined && Array.isArray(result)) {
        const fallbackSource = (matchedItem ?? result[0]) as unknown;
        resolvedResult = config.resultPath?.trim()
          ? getValueAtMappingPath(fallbackSource, config.resultPath)
          : fallbackSource;
      }
      return {
        result: resolvedResult ?? result,
        status: 'completed',
        bundle: { ...bundle, status: 'completed' },
      };
    }
    if (attempt < config.maxAttempts - 1) {
      await sleep(Math.max(0, config.intervalMs), options?.signal);
    }
  }
  const fallbackResult = config.resultPath?.trim()
    ? getValueAtMappingPath(lastResult, config.resultPath)
    : lastResult;
  return {
    result: fallbackResult ?? lastResult,
    status: 'timeout',
    bundle: { ...lastBundle, status: 'timeout' },
  };
};

export const buildFormData = (payload: Record<string, unknown>): FormData => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]: [string, unknown]) => {
    if (value === undefined || value === null) return;
    formData.append(key, safeStringify(value));
  });
  return formData;
};

export const resolveContextPayload = async (
  config: ContextConfig,
  baseContext: Record<string, unknown> | null,
  simulationEntityType: string | null,
  simulationEntityId: string | null,
  now: string,
  fetchEntityCached: (type: string, id: string) => Promise<Record<string, unknown> | null>
): Promise<{
  role: string;
  entityType: string;
  entityId: string | null;
  rawEntity: Record<string, unknown>;
  scopedEntity: Record<string, unknown>;
  context: Record<string, unknown>;
}> => {
  const contextConfig = config;
  const fallbackRole = contextConfig.role ?? DEFAULT_CONTEXT_ROLE;
  const baseRole =
    baseContext && typeof baseContext.role === 'string' ? baseContext.role : null;
  const role = baseRole ?? fallbackRole;
  const rawEntityType = contextConfig.entityType?.trim() || 'auto';
  const baseEntityType =
    baseContext && typeof baseContext.entityType === 'string'
      ? baseContext.entityType
      : null;
  const entityType =
    rawEntityType === 'auto'
      ? baseEntityType ?? simulationEntityType ?? 'entity'
      : rawEntityType || baseEntityType || simulationEntityType || 'entity';
  const manualId = contextConfig.entityId?.trim() || null;
  const baseEntityId =
    baseContext && typeof baseContext.entityId === 'string'
      ? baseContext.entityId
      : null;
  const entityId =
    contextConfig.entityIdSource === 'manual'
      ? manualId
      : contextConfig.entityIdSource === 'context'
        ? baseEntityId ?? manualId ?? null
        : baseEntityId ?? simulationEntityId ?? manualId ?? null;
  const baseEntity =
    (baseContext?.entity as Record<string, unknown> | undefined) ??
    (baseContext?.entityJson as Record<string, unknown> | undefined) ??
    (baseContext?.product as Record<string, unknown> | undefined) ??
    null;
  const fetched =
    baseEntity ?? (entityId && entityType ? await fetchEntityCached(entityType, entityId) : null);
  const rawEntity = fetched ?? buildFallbackEntity(entityId);
  const scopeTarget = contextConfig.scopeTarget ?? 'entity';
  const scopedEntity =
    scopeTarget === 'entity' ? applyContextScope(rawEntity, contextConfig) : rawEntity;
  const entityForContext = scopeTarget === 'context' ? rawEntity : scopedEntity;
  const baseImages = Array.isArray(baseContext?.images)
    ? (baseContext?.images as unknown[])
    : null;
  // Only extract images from entity when base images aren't already provided
  const resolvedImages =
    baseImages && baseImages.length ? baseImages : extractImageUrls(entityForContext ?? rawEntity);
  const baseContextRest = baseContext ? { ...baseContext } : {};
  delete (baseContextRest as Record<string, unknown>).entity;
  delete (baseContextRest as Record<string, unknown>).entityJson;
  delete (baseContextRest as Record<string, unknown>).product;
  delete (baseContextRest as Record<string, unknown>).images;
  delete (baseContextRest as Record<string, unknown>).imageUrls;
  delete (baseContextRest as Record<string, unknown>).role;
  delete (baseContextRest as Record<string, unknown>).entityType;
  delete (baseContextRest as Record<string, unknown>).entityId;
  delete (baseContextRest as Record<string, unknown>).source;
  delete (baseContextRest as Record<string, unknown>).timestamp;
  delete (baseContextRest as Record<string, unknown>).productId;
  const context = {
    role,
    entityType,
    entityId,
    source: (baseContext?.source as string | undefined) ?? 'context-filter',
    timestamp: (baseContext?.timestamp as string | undefined) ?? now,
    ...(resolvedImages.length ? { images: resolvedImages, imageUrls: resolvedImages } : {}),
    ...baseContextRest,
    entity: entityForContext,
    productId:
      entityType === 'product'
        ? entityId
        : (baseContext?.productId as string | undefined),
    product:
      entityType === 'product'
        ? entityForContext
        : (baseContext?.product as Record<string, unknown> | undefined),
  };
  const scopedContext =
    scopeTarget === 'context' ? applyContextScope(context, contextConfig) : context;
  const scopedContextEntity =
    scopeTarget === 'context'
      ? ((scopedContext?.entity as Record<string, unknown> | undefined) ??
          entityForContext)
      : scopedEntity;
  return {
    role,
    entityType,
    entityId,
    rawEntity,
    scopedEntity: scopedContextEntity,
    context: scopedContext,
  };
};
