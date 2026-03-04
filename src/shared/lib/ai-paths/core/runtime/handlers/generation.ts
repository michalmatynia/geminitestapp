import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import type {
  NodeHandler,
  NodeHandlerContext,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths-runtime';

import { aiJobsApi, aiGenerationApi } from '@/shared/lib/ai-paths/api';
import { generateProductAiDescription } from '../server/description-generator';
import {
  coerceInput,
  coerceInputArray,
  formatRuntimeValue,
  hashRuntimeValue,
  renderTemplate,
} from '../../utils';
import { evaluateOutboundUrlPolicy } from '../security/outbound-url-policy';
import { buildPromptOutput, extractImageUrls, pollGraphJob, resolveJobProductId } from '../utils';

export const handleTemplate: NodeHandler = ({
  node,
  nodeInputs,
}: NodeHandlerContext): RuntimePortValues => {
  const templateConfig = node.config?.template ?? { template: '' };
  const data = { ...nodeInputs };
  const currentValue = coerceInput(nodeInputs['value']) ?? '';
  const prompt = templateConfig.template
    ? renderTemplate(templateConfig.template, data, currentValue)
    : Object.entries(data)
      .map(([key, value]: [string, unknown]) => `${key}: ${formatRuntimeValue(value)}`)
      .join('\n');
  return { prompt: prompt || 'Prompt: (no template)' };
};

export const handlePrompt: NodeHandler = ({
  node,
  nodeInputs,
}: NodeHandlerContext): RuntimePortValues => {
  const { promptOutput, imagesValue } = buildPromptOutput(node.config?.prompt, nodeInputs);
  return imagesValue !== undefined
    ? { prompt: promptOutput, images: imagesValue }
    : { prompt: promptOutput };
};

interface PromptCandidate {
  edge: Edge;
  fromNode: AiNode | undefined;
  edgeValue: unknown;
  promptValue: unknown;
  derivedPromptValue: unknown;
  sourceOutputs: RuntimePortValues;
}

const resolveImageUrlForOutboundPolicy = (rawUrl: string): string => {
  const trimmed = rawUrl.trim();
  if (!trimmed) return trimmed;

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    // Resolve relative URLs against a known app base when possible.
  }

  const baseCandidates: string[] = [];
  if (typeof window !== 'undefined') {
    const browserOrigin = window.location?.origin;
    if (typeof browserOrigin === 'string' && browserOrigin.trim().length > 0) {
      baseCandidates.push(browserOrigin.trim());
    }
  }

  const envBaseCandidates = [
    process.env['AI_PATHS_ASSET_BASE_URL'],
    process.env['NEXT_PUBLIC_APP_URL'],
    process.env['NEXTAUTH_URL'],
    process.env['VERCEL_URL'] ? `https://${process.env['VERCEL_URL']}` : null,
  ];
  envBaseCandidates.forEach((candidate) => {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      baseCandidates.push(candidate.trim());
    }
  });

  for (const baseCandidate of baseCandidates) {
    const normalizedBase = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(baseCandidate)
      ? baseCandidate
      : baseCandidate.startsWith('//')
        ? `https:${baseCandidate}`
        : `https://${baseCandidate.replace(/^\/+/, '')}`;
    try {
      return new URL(trimmed, normalizedBase).toString();
    } catch {
      continue;
    }
  }

  return trimmed;
};

const filterImageUrlsByOutboundPolicy = (input: {
  imageUrls: string[];
  nodeId: string;
  action: 'graphModel' | 'aiDescription';
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  toast: NodeHandlerContext['toast'];
}): string[] => {
  if (input.imageUrls.length === 0) return [];

  const allowed: string[] = [];
  const blocked: Array<{
    url: string;
    resolvedUrl: string;
    reason: string | null;
    hostname: string | null;
  }> = [];

  input.imageUrls.forEach((url: string): void => {
    const trimmedUrl = url.trim();
    const resolvedUrl = resolveImageUrlForOutboundPolicy(trimmedUrl);

    // Relative URLs (e.g. /uploads/products/…) are self-hosted assets on this server.
    // Resolving them via the outbound policy would block them in development when the app
    // base URL is localhost.  We resolve them to absolute form so the model can fetch them,
    // but skip the outbound policy check — they cannot reach external or private networks.
    if (trimmedUrl.startsWith('/') || trimmedUrl.startsWith('./') || trimmedUrl.startsWith('../')) {
      allowed.push(resolvedUrl);
      return;
    }

    const decision = evaluateOutboundUrlPolicy(resolvedUrl);
    if (decision.allowed) {
      allowed.push(resolvedUrl);
      return;
    }
    blocked.push({
      url,
      resolvedUrl,
      reason: decision.reason,
      hostname: decision.hostname,
    });
  });

  if (blocked.length > 0) {
    const reasons = Array.from(new Set(blocked.map((entry) => entry.reason ?? 'policy_violation')))
      .slice(0, 3)
      .join(', ');
    const summary = `Blocked ${blocked.length} image URL${blocked.length === 1 ? '' : 's'} by outbound policy (${reasons}).`;
    input.reportAiPathsError(
      new Error(summary),
      {
        action: input.action,
        nodeId: input.nodeId,
        blockedImageUrlCount: blocked.length,
        blockedImageUrls: blocked.slice(0, 5),
      },
      summary
    );
    input.toast(
      `Blocked ${blocked.length} image URL${blocked.length === 1 ? '' : 's'} by outbound policy.`,
      { variant: 'warning' }
    );
  }

  return allowed;
};

type ModelTerminalStatus = 'blocked' | 'skipped';

const buildModelTerminalOutputs = (options: {
  status: ModelTerminalStatus;
  reason: string;
  details?: RuntimePortValues;
}): RuntimePortValues => {
  const base: RuntimePortValues = {
    status: options.status,
    skipReason: options.reason,
    result: '',
  };
  if (options.status === 'blocked') {
    base['blockedReason'] = options.reason;
  }
  return {
    ...base,
    ...(options.details ?? {}),
  };
};

export const handleModel: NodeHandler = async ({
  node,
  nodeInputs,
  prevOutputs,
  allOutputs,
  allInputs,
  edges,
  nodes,
  nodeById,
  runId,
  runStartedAt,
  activePathId,
  simulationEntityType,
  simulationEntityId,
  skipAiJobs,
  executed,
  toast,
  reportAiPathsError,
  abortSignal,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  const parseIntWithMin = (raw: string | undefined, fallback: number, min: number): number => {
    const parsed = Number.parseInt(raw ?? '', 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, parsed);
  };
  const defaultModelPollIntervalMs = parseIntWithMin(
    process.env['AI_PATHS_MODEL_POLL_INTERVAL_MS'],
    2000,
    500
  );
  const defaultModelPollTimeoutMs = parseIntWithMin(
    process.env['AI_PATHS_MODEL_POLL_TIMEOUT_MS'],
    300_000,
    30_000
  );

  if (skipAiJobs) {
    return buildModelTerminalOutputs({
      status: 'skipped',
      reason: 'ai_jobs_disabled',
    });
  }
  if (executed.ai.has(node.id)) return prevOutputs;
  const promptInputs = coerceInputArray(nodeInputs['prompt']);
  const hasMeaningfulValue = (value: unknown): boolean => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  };
  const firstMeaningfulValue = (values: unknown[]): unknown =>
    values.find((value: unknown): boolean => hasMeaningfulValue(value));
  const promptCandidates = edges
    .filter((edge: Edge) => edge.to === node.id && edge.toPort === 'prompt')
    .map((edge: Edge): PromptCandidate => {
      const fromNodeId = edge.from;
      const fromNode = fromNodeId
        ? (nodeById?.get(fromNodeId) ?? nodes.find((item: AiNode) => item.id === fromNodeId))
        : undefined;
      const sourceOutputs = fromNodeId ? (allOutputs[fromNodeId] ?? {}) : {};
      const sourceInputs = fromNodeId ? (allInputs[fromNodeId] ?? {}) : {};
      const edgeValue = sourceOutputs[edge.fromPort ?? 'prompt'];
      const promptValue = sourceOutputs['prompt'];
      const promptTemplate =
        typeof fromNode?.config?.prompt?.template === 'string'
          ? fromNode.config.prompt.template.trim()
          : '';
      const hasSourceInputValue = Object.values(sourceInputs).some(hasMeaningfulValue);
      const shouldDerivePrompt = promptTemplate.length > 0 || hasSourceInputValue;
      const derivedPromptValue =
        fromNode?.type === 'prompt' && shouldDerivePrompt
          ? buildPromptOutput(fromNode.config?.prompt, sourceInputs).promptOutput
          : undefined;
      return {
        edge,
        fromNode,
        edgeValue,
        promptValue,
        derivedPromptValue,
        sourceOutputs,
      };
    })
    .filter((entry: PromptCandidate): boolean => entry.fromNode?.type === 'prompt');
  const promptCandidate = promptCandidates.find(
    (entry: PromptCandidate): boolean =>
      hasMeaningfulValue(entry.edgeValue) ||
      hasMeaningfulValue(entry.promptValue) ||
      hasMeaningfulValue(entry.derivedPromptValue)
  );
  const promptSourceNode = promptCandidate?.fromNode ?? promptCandidates[0]?.fromNode ?? null;
  const promptSourceInputs = promptSourceNode ? (allInputs[promptSourceNode.id] ?? {}) : {};
  const promptSourceTemplate =
    typeof promptSourceNode?.config?.prompt?.template === 'string'
      ? promptSourceNode.config.prompt.template.trim()
      : '';
  const promptSourceHasInputs = Object.values(promptSourceInputs).some(hasMeaningfulValue);
  const derivedPrompt =
    promptSourceNode && (promptSourceTemplate.length > 0 || promptSourceHasInputs)
      ? buildPromptOutput(promptSourceNode.config?.prompt, promptSourceInputs)
      : null;
  const promptSourceOutput =
    firstMeaningfulValue([
      promptCandidate?.edgeValue,
      promptCandidate?.promptValue,
      promptCandidate?.derivedPromptValue,
      promptSourceNode ? allOutputs[promptSourceNode.id]?.['prompt'] : undefined,
      derivedPrompt?.promptOutput,
    ]) ?? undefined;
  const promptInput =
    firstMeaningfulValue([promptSourceOutput, ...[...promptInputs].reverse()]) ?? undefined;
  const modelConfig = node.config?.model ?? {
    temperature: 0.7,
    maxTokens: 800,
    vision: node.inputs.includes('images'),
  };
  if (promptInput === undefined || promptInput === null) {
    const promptSourceWaitingOnPorts = promptCandidates.flatMap(
      (entry: PromptCandidate): string[] => {
        const waitingOnPorts = entry.sourceOutputs['waitingOnPorts'];
        if (!Array.isArray(waitingOnPorts)) return [];
        return waitingOnPorts
          .filter((port: unknown): port is string => typeof port === 'string')
          .map((port: string): string => port.trim())
          .filter((port: string): boolean => port.length > 0);
      }
    );
    return buildModelTerminalOutputs({
      status: 'blocked',
      reason: 'missing_prompt',
      details: {
        requiredPorts: ['prompt'],
        optionalPorts: [],
        waitingOnPorts: ['prompt'],
        promptSourceNodeId: promptSourceNode?.id ?? null,
        promptSourceNodeIds: promptCandidates
          .map((entry: PromptCandidate): string | null => entry.fromNode?.id ?? null)
          .filter((value: string | null): value is string => Boolean(value)),
        ...(promptSourceWaitingOnPorts.length > 0
          ? { promptSourceWaitingOnPorts: Array.from(new Set(promptSourceWaitingOnPorts)) }
          : {}),
      },
    });
  }
  const hasResultConsumers = edges.some(
    (edge: Edge): boolean =>
      edge.from === node.id &&
      (edge.fromPort === 'result' || (edge.fromPort === undefined && edge.toPort === 'result'))
  );
  const hasPollConsumer = edges.some((edge: Edge): boolean => {
    if (edge.from !== node.id) return false;
    if (edge.fromPort && edge.fromPort !== 'jobId') return false;
    const targetNodeId = edge.to;
    if (!targetNodeId) return false;
    const targetNode =
      nodeById?.get(targetNodeId) ?? nodes.find((item: AiNode) => item.id === targetNodeId);
    return targetNode?.type === 'poll';
  });
  const waitPreference = modelConfig.waitForResult;
  let shouldWait = !hasPollConsumer && (waitPreference ?? hasResultConsumers);
  if (!hasPollConsumer && waitPreference === false && hasResultConsumers) {
    shouldWait = true;
  }
  if (waitPreference === true) {
    shouldWait = true;
  }
  const prompt =
    typeof promptInput === 'string' ? promptInput.trim() : formatRuntimeValue(promptInput);
  if (!prompt || prompt === '—') {
    return buildModelTerminalOutputs({
      status: 'blocked',
      reason: 'empty_prompt',
    });
  }
  const imageEdge = edges
    .filter((edge: Edge): boolean => edge.to === node.id && edge.toPort === 'images')
    .map((edge: Edge): { edge: Edge; fromNode: AiNode | undefined; value: unknown } => {
      const fromNodeId = edge.from;
      const fromNode = fromNodeId
        ? (nodeById?.get(fromNodeId) ?? nodes.find((item: AiNode) => item.id === fromNodeId))
        : undefined;
      const value = fromNodeId ? allOutputs[fromNodeId]?.[edge.fromPort ?? 'images'] : undefined;
      return {
        edge,
        fromNode,
        value,
      };
    })
    .find(
      (entry): boolean =>
        entry.fromNode?.type === 'prompt' && entry.value !== undefined && entry.value !== null
    );
  const promptImageOutput = promptSourceNode?.id
    ? (derivedPrompt?.imagesValue ?? allOutputs[promptSourceNode.id]?.['images'])
    : undefined;
  const imageSource =
    promptImageOutput ??
    imageEdge?.value ??
    nodeInputs['images'] ??
    nodeInputs['bundle'] ??
    nodeInputs['context'] ??
    nodeInputs['entityJson'] ??
    nodeInputs['value'] ??
    nodeInputs['result'];
  const imageUrls = filterImageUrlsByOutboundPolicy({
    imageUrls: extractImageUrls(imageSource),
    nodeId: node.id,
    action: 'graphModel',
    reportAiPathsError,
    toast,
  });
  const payload = {
    prompt,
    imageUrls,
    ...(modelConfig.modelId?.trim() ? { modelId: modelConfig.modelId.trim() } : {}),
    temperature: modelConfig.temperature,
    maxTokens: modelConfig.maxTokens,
    vision: modelConfig.vision,
    ...(modelConfig.systemPrompt?.trim() ? { systemPrompt: modelConfig.systemPrompt.trim() } : {}),
    source: 'ai_paths',
    graph: {
      pathId: activePathId ?? undefined,
      nodeId: node.id,
      nodeTitle: node.title,
      // Keep graph-model cache scoped to a single run so repeated manual runs
      // do not silently reuse completed jobs from older runs.
      runId,
    },
  };
  const productId = resolveJobProductId(
    nodeInputs,
    simulationEntityType,
    simulationEntityId,
    activePathId
  );
  const cacheKey = hashRuntimeValue(payload);
  const payloadHash = hashRuntimeValue({ payload, runId, runStartedAt });

  // Idempotency across evaluateGraph calls (seeded outputs): if we already enqueued a job for the same payload,
  // don't enqueue again. This prevents accidental duplicate jobs when the graph is re-evaluated during polling
  // or iterator auto-continue.
  const prevJobId = typeof prevOutputs['jobId'] === 'string' ? prevOutputs['jobId'].trim() : '';
  const prevPayloadHash =
    typeof prevOutputs['payloadHash'] === 'string' ? prevOutputs['payloadHash'] : '';
  if (prevJobId && prevPayloadHash === payloadHash) {
    return { ...prevOutputs, payloadHash };
  }
  let enqueuedJobId: string | undefined;
  try {
    const enqueueResult = await aiJobsApi.enqueue({
      productId,
      type: 'graph_model',
      payload: {
        ...payload,
        cacheKey,
      },
    });
    if (!enqueueResult.ok) {
      throw new Error(enqueueResult.error || 'Failed to enqueue AI job.');
    }
    enqueuedJobId = enqueueResult.data.jobId;
    toast('AI model job queued.', { variant: 'success' });
    executed.ai.add(node.id);
    if (!shouldWait) {
      return {
        jobId: enqueueResult.data.jobId,
        status: 'queued',
        debugPayload: payload,
        cacheKey,
        payloadHash,
      };
    }
    const configuredTimeoutMs =
      typeof node.config?.runtime?.timeoutMs === 'number' &&
      Number.isFinite(node.config.runtime.timeoutMs) &&
      node.config.runtime.timeoutMs > 0
        ? Math.max(1000, Math.floor(node.config.runtime.timeoutMs))
        : defaultModelPollTimeoutMs;
    const pollMaxAttempts = Math.max(
      1,
      Math.ceil(configuredTimeoutMs / defaultModelPollIntervalMs)
    );
    const result = await pollGraphJob(enqueueResult.data.jobId, {
      intervalMs: defaultModelPollIntervalMs,
      maxAttempts: pollMaxAttempts,
      ...(abortSignal ? { signal: abortSignal } : {}),
    });
    return {
      result,
      jobId: enqueueResult.data.jobId,
      status: 'completed',
      debugPayload: payload,
      cacheKey,
      payloadHash,
    };
  } catch (error) {
    if (abortSignal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    const normalizedErrorMessage = errorMessage.toLowerCase();
    const isOllamaConnectionError =
      normalizedErrorMessage.includes('could not connect to ollama server') ||
      (normalizedErrorMessage.includes('ollama') &&
        (normalizedErrorMessage.includes('econnrefused') ||
          normalizedErrorMessage.includes('fetch failed') ||
          normalizedErrorMessage.includes('failed to fetch')));
    const isHardFailure =
      isOllamaConnectionError ||
      normalizedErrorMessage.includes('ai job timed out') ||
      normalizedErrorMessage.includes('connection error after') ||
      normalizedErrorMessage.includes('job not found');
    reportAiPathsError(
      error,
      { action: 'graphModel', nodeId: node.id, ...(enqueuedJobId ? { jobId: enqueuedJobId } : {}) },
      'AI model job failed:'
    );
    toast(isOllamaConnectionError ? errorMessage : 'AI model job failed.', { variant: 'error' });
    executed.ai.add(node.id);
    if (isHardFailure) {
      throw error instanceof Error ? error : new Error(errorMessage);
    }
    return {
      result: '',
      jobId: enqueuedJobId,
      status: 'failed',
      error: errorMessage,
      message: errorMessage,
      debugPayload: payload,
      cacheKey,
      payloadHash,
    };
  }
};

export const handleAiDescription: NodeHandler = async ({
  node,
  nodeInputs,
  prevOutputs,
  executed,
  reportAiPathsError,
  toast,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  if (executed.ai.has(node.id)) return prevOutputs;
  const entityJson = coerceInput(nodeInputs['entityJson']) as Record<string, unknown> | undefined;
  if (!entityJson) {
    return {};
  }
  const rawImages =
    (coerceInput(nodeInputs['images']) as unknown[] | undefined) ??
    (entityJson['imageLinks'] as unknown[] | undefined) ??
    (entityJson['images'] as unknown[] | undefined) ??
    [];
  const rawImageUrls = rawImages
    .map((item: unknown) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const url = (item as { url?: string })['url'];
        if (typeof url === 'string') return url;
      }
      return null;
    })
    .filter((item: unknown): item is string => Boolean(item));
  const imageUrls = filterImageUrlsByOutboundPolicy({
    imageUrls: rawImageUrls,
    nodeId: node.id,
    action: 'aiDescription',
    reportAiPathsError,
    toast,
  });
  try {
    const entityProductId =
      typeof entityJson['id'] === 'string'
        ? entityJson['id']
        : typeof entityJson['_id'] === 'string'
          ? entityJson['_id']
          : 'unknown';
    const result = await generateProductAiDescription({
      productId: entityProductId,
      images: imageUrls,
      options: {
        visionEnabled: node.config?.description?.visionOutputEnabled,
        generationEnabled: node.config?.description?.generationOutputEnabled,
      },
    });
    executed.ai.add(node.id);
    return { description_en: result.description ?? '' };
  } catch (error) {
    reportAiPathsError(
      error,
      { action: 'aiDescription', nodeId: node.id },
      'AI description failed:'
    );
    return { description_en: '' };
  }
};

export const handleDescriptionUpdater: NodeHandler = async ({
  node,
  nodeInputs,
  prevOutputs,
  executed,
  reportAiPathsError,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  if (executed.updater.has(node.id)) return prevOutputs;
  const productId = nodeInputs['productId'] as string | undefined;
  const description = nodeInputs['description_en'] as string | undefined;
  if (!productId || !description) {
    return {};
  }
  const updateResult = await aiGenerationApi.updateProductDescription(productId, description);
  executed.updater.add(node.id);
  if (!updateResult.ok) {
    reportAiPathsError(
      new Error(updateResult.error),
      { action: 'updateDescription', productId, nodeId: node.id },
      'Failed to update description:'
    );
  }
  return { description_en: description };
};
