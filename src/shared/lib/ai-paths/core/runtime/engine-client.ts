import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import type {
  RuntimeState,
  NodeHandler,
  NodeHandlerContext,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths-runtime';

import { evaluateGraphInternal } from './engine-core';
import { resolveAiPathsRuntimeCodeObjectHandler } from './code-object-resolver-registry';
import { createNodeRuntimeKernel, toNodeRuntimeResolutionTelemetry } from './node-runtime-kernel';
import {
  createNodeCodeObjectV3ContractResolver,
  resolveNodeCodeObjectV3ContractByCodeObjectId,
} from './node-code-object-v3-legacy-bridge';
import { buildPromptOutput } from './utils';
import { aiGenerationApi, aiJobsApi } from '@/shared/lib/ai-paths/api';

import { type EvaluateGraphArgs, type EvaluateGraphOptions } from './engine-modules/engine-types';
import { coerceInput, formatRuntimeValue, renderTemplate } from '../utils';

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
import { handleAudioOscillator, handleAudioSpeaker } from './handlers/audio';

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
import { handleAgent, handleLearnerAgent } from './handlers/agent';
import { handleNotification as handleIntegrationNotification } from './handlers/integration-notification-handler';
import { handleFetcher as handleIntegrationFetcher } from './handlers/integration-fetcher-handler';
import { handleDbSchema as handleIntegrationDbSchema } from './handlers/integration-schema-handler';
import { handleAdvancedApi as handleIntegrationAdvancedApi } from './handlers/integration-api-advanced-handler';
import { handleDatabase as handleIntegrationDatabase } from './handlers/integration-database-handler';
import { handleHttp as handleIntegrationHttp } from './handlers/integration-http-handler';
import { handlePoll as handleIntegrationPoll } from './handlers/integration-poll-handler';
import { handlePlaywright as handleIntegrationPlaywright } from './handlers/integration-playwright-handler';
import { handleSimulation as handleIntegrationSimulation } from './handlers/integration-simulation-handler';
import { handleTrigger as handleIntegrationTrigger } from './handlers/integration-trigger-handler';

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

const handleAiDescription: NodeHandler = async ({
  node,
  nodeInputs,
  prevOutputs,
  executed,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  if (executed.ai.has(node.id)) return prevOutputs;
  const entityJson = coerceInput(nodeInputs['entityJson']) as Record<string, unknown> | undefined;
  if (!entityJson) {
    return {};
  }

  const generationResult = await aiGenerationApi.generate();
  executed.ai.add(node.id);

  const generatedDescription =
    typeof generationResult.data?.result === 'string' ? generationResult.data.result : '';
  return { description_en: generatedDescription };
};

const handleDescriptionUpdater: NodeHandler = async ({
  node,
  nodeInputs,
  prevOutputs,
  executed,
  reportAiPathsError,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  if (executed.updater.has(node.id)) return prevOutputs;
  const productId = coerceInput(nodeInputs['productId']) as string | undefined;
  const description = coerceInput(nodeInputs['description_en']) as string | undefined;
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

const CLIENT_HANDLERS: Record<string, NodeHandler> = {
  prompt: handlePrompt,
  template: handleTemplate,
  model: handleModel,
  agent: handleAgent,
  learner_agent: handleLearnerAgent,
  ai_description: handleAiDescription,
  description_updater: handleDescriptionUpdater,
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
};
export const CLIENT_LEGACY_HANDLER_NODE_TYPES: readonly string[] = Object.freeze(
  Object.keys(CLIENT_HANDLERS).sort()
);

const resolveLegacyHandler = (type: string): NodeHandler | null => {
  const handler = CLIENT_HANDLERS[type];
  if (handler) return handler;

  // For unsupported nodes in client, we return a mock handler that fails or skips
  return () => {
    throw new Error(
      `Node type '${type}' is not supported in client-side execution. Use Server execution.`
    );
  };
};
const NATIVE_CODE_OBJECT_HANDLERS: Record<string, NodeHandler> = {
  'ai-paths.node-code-object.bundle.v3': handleBundle,
  'ai-paths.node-code-object.compare.v3': handleCompare,
  'ai-paths.node-code-object.constant.v3': handleConstant,
  'ai-paths.node-code-object.context.v3': handleContext,
  'ai-paths.node-code-object.delay.v3': handleDelay,
  'ai-paths.node-code-object.gate.v3': handleGate,
  'ai-paths.node-code-object.iterator.v3': handleIterator,
  'ai-paths.node-code-object.mapper.v3': handleMapper,
  'ai-paths.node-code-object.math.v3': handleMath,
  'ai-paths.node-code-object.mutator.v3': handleMutator,
  'ai-paths.node-code-object.notification.v3': handleIntegrationNotification,
  'ai-paths.node-code-object.fetcher.v3': handleIntegrationFetcher,
  'ai-paths.node-code-object.db_schema.v3': handleIntegrationDbSchema,
  'ai-paths.node-code-object.api_advanced.v3': handleIntegrationAdvancedApi,
  'ai-paths.node-code-object.database.v3': handleIntegrationDatabase,
  'ai-paths.node-code-object.playwright.v3': handleIntegrationPlaywright,
  'ai-paths.node-code-object.http.v3': handleIntegrationHttp,
  'ai-paths.node-code-object.poll.v3': handleIntegrationPoll,
  'ai-paths.node-code-object.audio_oscillator.v3': handleAudioOscillator,
  'ai-paths.node-code-object.audio_speaker.v3': handleAudioSpeaker,
  'ai-paths.node-code-object.parser.v3': handleParser,
  'ai-paths.node-code-object.prompt.v3': handlePrompt,
  'ai-paths.node-code-object.model.v3': handleModel,
  'ai-paths.node-code-object.agent.v3': handleAgent,
  'ai-paths.node-code-object.learner_agent.v3': handleLearnerAgent,
  'ai-paths.node-code-object.ai_description.v3': handleAiDescription,
  'ai-paths.node-code-object.description_updater.v3': handleDescriptionUpdater,
  'ai-paths.node-code-object.regex.v3': handleRegex,
  'ai-paths.node-code-object.router.v3': handleRouter,
  'ai-paths.node-code-object.simulation.v3': handleIntegrationSimulation,
  'ai-paths.node-code-object.string_mutator.v3': handleStringMutator,
  'ai-paths.node-code-object.template.v3': handleTemplate,
  'ai-paths.node-code-object.trigger.v3': handleIntegrationTrigger,
  'ai-paths.node-code-object.validation_pattern.v3': handleValidationPattern,
  'ai-paths.node-code-object.validator.v3': handleValidator,
  'ai-paths.node-code-object.viewer.v3': handleViewer,
};
export const CLIENT_NATIVE_CODE_OBJECT_HANDLER_IDS: readonly string[] = Object.freeze(
  Object.keys(NATIVE_CODE_OBJECT_HANDLERS).sort()
);
const resolveNativeCodeObjectHandler = ({
  nodeType: _nodeType,
  codeObjectId,
}: {
  nodeType: string;
  codeObjectId: string;
}): NodeHandler | null => NATIVE_CODE_OBJECT_HANDLERS[codeObjectId] ?? null;
const defaultResolveCodeObjectHandler = createNodeCodeObjectV3ContractResolver({
  resolveLegacyHandler,
  resolveNativeCodeObjectHandler,
});
const strictDefaultResolveCodeObjectHandler = createNodeCodeObjectV3ContractResolver({
  resolveLegacyHandler,
  resolveNativeCodeObjectHandler,
  strictNativeRegistry: true,
});
const resolveUnsupportedClientCodeObjectHandler = ({
  nodeType,
  codeObjectId,
}: {
  nodeType: string;
  codeObjectId: string;
}): NodeHandler | null =>
  resolveNodeCodeObjectV3ContractByCodeObjectId(codeObjectId)
    ? null
    : resolveLegacyHandler(nodeType);

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

  const runtimeKernelStrictNativeRegistry =
    resolvedOptions.runtimeKernelStrictNativeRegistry ?? true;
  const runtimeKernel = createNodeRuntimeKernel({
    resolveLegacyHandler,
    resolveCodeObjectHandler: (args) => {
      const resolvedCodeObjectHandler =
        resolvedOptions.resolveCodeObjectHandler?.(args) ??
        resolveAiPathsRuntimeCodeObjectHandler(args, {
          resolverIds: resolvedOptions.runtimeKernelCodeObjectResolverIds,
        }) ??
        (runtimeKernelStrictNativeRegistry
          ? strictDefaultResolveCodeObjectHandler(args)
          : defaultResolveCodeObjectHandler(args));
      if (resolvedCodeObjectHandler) {
        return resolvedCodeObjectHandler;
      }
      if (runtimeKernelStrictNativeRegistry) {
        return resolveUnsupportedClientCodeObjectHandler(args);
      }
      return null;
    },
    mode: resolvedOptions.runtimeKernelMode,
    runtimeKernelNodeTypes: resolvedOptions.runtimeKernelNodeTypes,
    runtimeKernelStrictNativeRegistry,
  });

  return evaluateGraphInternal(nodes, resolvedEdges, {
    ...resolvedOptions,
    resolveHandler: runtimeKernel.resolveHandler,
    resolveHandlerTelemetry: (type: string) =>
      toNodeRuntimeResolutionTelemetry(runtimeKernel.resolveDescriptor(type)),
  });
}
