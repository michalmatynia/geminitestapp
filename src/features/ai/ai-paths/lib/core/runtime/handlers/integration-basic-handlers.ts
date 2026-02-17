import type {
  DbQueryConfig,
  HttpConfig,
  PollConfig,
  RuntimePortValues,
} from '@/shared/types/domain/ai-paths';
import type { AiNode, Edge } from '@/shared/types/domain/ai-paths';
import type { NodeHandler, NodeHandlerContext } from '@/shared/types/domain/ai-paths-runtime';

import { DEFAULT_DB_QUERY } from '../../constants';
import {
  coerceInput,
  getValueAtMappingPath,
  renderTemplate,
  safeStringify,
} from '../../utils';
import {
  buildFallbackEntity,
  buildPromptOutput,
  pollDatabaseQuery,
  pollGraphJob,
} from '../utils';

interface PromptCandidate {
  edge: Edge;
  fromNode: AiNode | undefined;
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
    contextInput?.['entityType'] ?? simulationEntityType ?? null;
  const resolvedEntityId: string | null = simulationInputId ?? null;
  const resolvedEntityType: string | null = simulationInputType ?? null;
  const triggerExtras: Record<string, unknown> = (triggerContext as Record<string, unknown>) ?? {};
  const triggerEntity =
    triggerExtras['entity'] ?? triggerExtras['entityJson'] ?? triggerExtras['product'] ?? null;
  const triggerEntityId: string | null =
    typeof triggerExtras['entityId'] === 'string'
      ? triggerExtras['entityId']
      : typeof triggerExtras['productId'] === 'string'
        ? triggerExtras['productId']
        : null;
  const triggerEntityType: string | null =
    typeof triggerExtras['entityType'] === 'string'
      ? triggerExtras['entityType']
      : null;
  const effectiveEntityId: string | null = resolvedEntityId ?? triggerEntityId ?? null;
  const effectiveEntityType: string | null = resolvedEntityType ?? triggerEntityType ?? null;
  let hydratedEntity: Record<string, unknown> | null =
    resolvedEntity ??
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
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
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
    const promptSourceInputs: RuntimePortValues = allInputs[promptSourceNode.id] ?? {};
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
  const message: string = safeStringify(messageSource);
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
      typeof prevOutputs['status'] === 'string' ? prevOutputs['status'] : null;
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
