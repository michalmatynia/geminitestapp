import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import type {
  RuntimeState,
  NodeHandler,
  NodeHandlerContext,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths-runtime';
import { aiJobsApi } from '@/shared/lib/ai-paths/api';

import { coerceInput, formatRuntimeValue, renderTemplate } from '../utils';
import { resolveAiPathsRuntimeCodeObjectHandler } from './code-object-resolver-registry';
import { evaluateGraphInternal } from './engine-core';
import { type EvaluateGraphArgs, type EvaluateGraphOptions } from './engine-modules/engine-types';
import { handleAgent, handleLearnerAgent } from './handlers/agent';
import { handleAudioOscillator, handleAudioSpeaker } from './handlers/audio';
import {
  handleConstant,
  handleMath,
  handleCompare,
  handleLogicalCondition,
  handleRouter,
  handleGate,
  handleBundle,
  handleDelay,
  handleViewer,
} from './handlers/common';
import { handleAdvancedApi as handleIntegrationAdvancedApi } from './handlers/integration-api-advanced-handler';
import { handleDatabase as handleIntegrationDatabase } from './handlers/integration-database-handler';
import { handleFetcher as handleIntegrationFetcher } from './handlers/integration-fetcher-handler';
import { handleHttp as handleIntegrationHttp } from './handlers/integration-http-handler';
import { handleNotification as handleIntegrationNotification } from './handlers/integration-notification-handler';
import { handlePlaywright as handleIntegrationPlaywright } from './handlers/integration-playwright-handler';
import { handlePoll as handleIntegrationPoll } from './handlers/integration-poll-handler';
import { handleDbSchema as handleIntegrationDbSchema } from './handlers/integration-schema-handler';
import { handleSimulation as handleIntegrationSimulation } from './handlers/integration-simulation-handler';
import { handleTrigger as handleIntegrationTrigger } from './handlers/integration-trigger-handler';
import {
  handleBoundsNormalizer,
  handleCanvasOutput,
  handleParser,
  handleMapper,
  handleMutator,
  handleStringMutator,
  handleValidator,
  handleValidationPattern,
  handleRegex,
  handleIterator,
  handleContext,
} from './handlers/transform';
import {
  createNodeCodeObjectV3ContractResolver,
  resolveNodeCodeObjectV3ContractByCodeObjectId,
} from './node-code-object-v3-legacy-bridge';
import { createNodeRuntimeHandlerCatalog } from './node-runtime-handler-catalog';
import { createNodeRuntimeKernel, toNodeRuntimeResolutionTelemetry } from './node-runtime-kernel';
import { buildPromptOutput } from './utils';

// Re-export types from core
export * from './engine-core';

const handlePrompt: NodeHandler = ({ node, nodeInputs }: NodeHandlerContext): RuntimePortValues => {
  const { promptOutput, imagesValue } = buildPromptOutput(node.config?.prompt, nodeInputs);
  return imagesValue !== undefined
    ? { prompt: promptOutput, images: imagesValue }
    : { prompt: promptOutput };
};

const handleTemplate: NodeHandler = ({
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

const buildModelTerminalOutputs = (options: {
  status: 'blocked' | 'skipped';
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

const handleModel: NodeHandler = async ({
  node,
  nodeInputs,
  prevOutputs,
  skipAiJobs,
  executed,
  reportAiPathsError,
  toast,
  runId,
  activePathId,
  contextRegistry,
  simulationEntityId,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  if (skipAiJobs) {
    return buildModelTerminalOutputs({
      status: 'skipped',
      reason: 'ai_jobs_disabled',
    });
  }
  if (executed.ai.has(node.id)) return prevOutputs;

  const rawPrompt =
    coerceInput(nodeInputs['prompt']) ??
    coerceInput(nodeInputs['value']) ??
    coerceInput(nodeInputs['result']) ??
    coerceInput(nodeInputs['bundle']) ??
    coerceInput(nodeInputs['context']) ??
    coerceInput(nodeInputs['entityJson']) ??
    coerceInput(nodeInputs['title']) ??
    coerceInput(nodeInputs['content_en']);

  const prompt = typeof rawPrompt === 'string' ? rawPrompt.trim() : formatRuntimeValue(rawPrompt);
  if (!prompt || prompt === '—') {
    return buildModelTerminalOutputs({
      status: 'blocked',
      reason: 'missing_prompt',
      details: {
        requiredPorts: ['prompt'],
        waitingOnPorts: ['prompt'],
      },
    });
  }

  const modelConfig = (node.config?.model ?? {}) as Record<string, unknown>;
  const payload = {
    prompt,
    ...(typeof modelConfig['modelId'] === 'string' && modelConfig['modelId'].trim().length > 0
      ? { modelId: modelConfig['modelId'].trim() }
      : {}),
    ...(typeof modelConfig['temperature'] === 'number'
      ? { temperature: modelConfig['temperature'] }
      : {}),
    ...(typeof modelConfig['maxTokens'] === 'number'
      ? { maxTokens: modelConfig['maxTokens'] }
      : {}),
    ...(typeof modelConfig['vision'] === 'boolean' ? { vision: modelConfig['vision'] } : {}),
    source: 'ai_paths',
    graph: {
      pathId: activePathId ?? undefined,
      nodeId: node.id,
      nodeTitle: node.title,
      runId,
    },
    ...(contextRegistry ? { contextRegistry } : {}),
  };

  const productIdInput =
    typeof nodeInputs['productId'] === 'string'
      ? nodeInputs['productId']
      : typeof nodeInputs['entityId'] === 'string'
        ? nodeInputs['entityId']
        : typeof simulationEntityId === 'string'
          ? simulationEntityId
          : 'unknown';

  try {
    const enqueueResult = await aiJobsApi.enqueue({
      productId: productIdInput,
      type: 'graph_model',
      payload,
    });
    if (!enqueueResult.ok) {
      throw new Error(enqueueResult.error || 'Failed to enqueue AI job.');
    }
    const jobIdRaw = enqueueResult.data?.jobId;
    if (typeof jobIdRaw !== 'string' || jobIdRaw.trim().length === 0) {
      throw new Error('AI job enqueue response did not include a valid job id.');
    }
    const jobId = jobIdRaw.trim();
    executed.ai.add(node.id);
    toast('AI model job queued.', { variant: 'success' });

    const waitForResult = modelConfig['waitForResult'] === true;
    if (!waitForResult) {
      return {
        jobId,
        status: 'queued',
        debugPayload: payload,
      };
    }

    const maxAttempts = 10;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const pollResult = await aiJobsApi.poll(jobId);
      if (!pollResult.ok) {
        throw new Error(pollResult.error || 'Failed to poll AI job.');
      }
      const status =
        typeof pollResult.data?.status === 'string' ? pollResult.data.status : 'processing';
      if (status === 'completed') {
        return {
          result: pollResult.data.result ?? '',
          jobId,
          status,
          debugPayload: payload,
        };
      }
      if (status === 'failed' || status === 'cancelled') {
        return {
          result: '',
          jobId,
          status: 'failed',
          error:
            typeof pollResult.data?.error === 'string'
              ? pollResult.data.error
              : 'AI model job failed.',
          debugPayload: payload,
        };
      }
      if (attempt < maxAttempts - 1) {
        await new Promise<void>((resolve) => setTimeout(resolve, 500));
      }
    }

    return {
      result: '',
      jobId,
      status: 'failed',
      error: 'AI model job timed out.',
      debugPayload: payload,
    };
  } catch (error) {
    reportAiPathsError(error, { action: 'graphModel', nodeId: node.id }, 'AI model job failed:');
    executed.ai.add(node.id);
    return {
      result: '',
      status: 'failed',
      error: error instanceof Error ? error.message : 'AI model job failed.',
      debugPayload: payload,
    };
  }
};

const CLIENT_HANDLER_CATALOG = createNodeRuntimeHandlerCatalog({
  prompt: handlePrompt,
  template: handleTemplate,
  model: handleModel,
  agent: handleAgent,
  learner_agent: handleLearnerAgent,
  trigger: handleIntegrationTrigger,
  notification: handleIntegrationNotification,
  fetcher: handleIntegrationFetcher,
  db_schema: handleIntegrationDbSchema,
  api_advanced: handleIntegrationAdvancedApi,
  database: handleIntegrationDatabase,
  playwright: handleIntegrationPlaywright,
  http: handleIntegrationHttp,
  poll: handleIntegrationPoll,
  simulation: handleIntegrationSimulation,
  audio_oscillator: handleAudioOscillator,
  audio_speaker: handleAudioSpeaker,
  constant: handleConstant,
  math: handleMath,
  compare: handleCompare,
  logical_condition: handleLogicalCondition,
  router: handleRouter,
  gate: handleGate,
  bundle: handleBundle,
  delay: handleDelay,
  viewer: handleViewer,
  context: handleContext,

  parser: handleParser,
  mapper: handleMapper,
  mutator: handleMutator,
  string_mutator: handleStringMutator,
  validator: handleValidator,
  validation_pattern: handleValidationPattern,
  regex: handleRegex,
  iterator: handleIterator,
  bounds_normalizer: handleBoundsNormalizer,
  canvas_output: handleCanvasOutput,
});
export const CLIENT_LEGACY_HANDLER_NODE_TYPES: readonly string[] = Object.freeze([
  ...CLIENT_HANDLER_CATALOG.legacyNodeTypes,
]);

const resolveLegacyHandler = (type: string): NodeHandler | null => {
  const handler = CLIENT_HANDLER_CATALOG.resolveLegacyHandler(type);
  if (handler) return handler;

  // For unsupported nodes in client, we return a mock handler that fails or skips
  return () => {
    throw new Error(
      `Node type '${type}' is not supported in client-side execution. Use Server execution.`
    );
  };
};
export const CLIENT_NATIVE_CODE_OBJECT_HANDLER_IDS: readonly string[] = Object.freeze([
  ...CLIENT_HANDLER_CATALOG.nativeCodeObjectHandlerIds,
]);
const defaultResolveCodeObjectHandler = createNodeCodeObjectV3ContractResolver({
  resolveLegacyHandler,
  resolveNativeCodeObjectHandler: CLIENT_HANDLER_CATALOG.resolveNativeCodeObjectHandler,
});
const resolveUnsupportedClientCodeObjectHandler = ({
  nodeType,
  codeObjectId,
}: {
  nodeType: string;
  codeObjectId: string;
}): NodeHandler | null => {
  if (resolveNodeCodeObjectV3ContractByCodeObjectId(codeObjectId)) {
    return null;
  }
  return CLIENT_HANDLER_CATALOG.resolveLegacyHandler(nodeType)
    ? null
    : resolveLegacyHandler(nodeType);
};

export async function evaluateGraphClient(
  argsOrNodes: EvaluateGraphArgs | AiNode[],
  edges?: Edge[],
  options?: EvaluateGraphOptions
): Promise<RuntimeState> {
  let nodes: AiNode[];
  let resolvedEdges: Edge[];
  let resolvedOptions: EvaluateGraphOptions;

  if (Array.isArray(argsOrNodes)) {
    nodes = argsOrNodes;
    resolvedEdges = edges ?? [];
    resolvedOptions = options ?? { reportAiPathsError: () => {} };
  } else {
    nodes = argsOrNodes.nodes;
    resolvedEdges = argsOrNodes.edges;
    resolvedOptions = argsOrNodes;
  }

  const runtimeKernel = createNodeRuntimeKernel({
    resolveLegacyHandler,
    resolveCodeObjectHandler: (args) => {
      const resolvedCodeObjectHandler =
        resolvedOptions.resolveCodeObjectHandler?.(args) ??
        resolveAiPathsRuntimeCodeObjectHandler(args, {
          resolverIds: resolvedOptions.runtimeKernelCodeObjectResolverIds,
        }) ??
        defaultResolveCodeObjectHandler(args);
      if (resolvedCodeObjectHandler) {
        return resolvedCodeObjectHandler;
      }
      return resolveUnsupportedClientCodeObjectHandler(args);
    },
    runtimeKernelNodeTypes: resolvedOptions.runtimeKernelNodeTypes,
  });

  return evaluateGraphInternal(nodes, resolvedEdges, {
    ...resolvedOptions,
    resolveHandler: runtimeKernel.resolveHandler,
    resolveHandlerTelemetry: (type: string) =>
      toNodeRuntimeResolutionTelemetry(runtimeKernel.resolveDescriptor(type)),
  });
}
