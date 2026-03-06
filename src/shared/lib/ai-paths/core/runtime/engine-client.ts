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
import { createNodeCodeObjectV3ContractResolver } from './node-code-object-v3-legacy-bridge';
import { buildPromptOutput } from './utils';
import { aiGenerationApi } from '@/shared/lib/ai-paths/api';

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

const handlePrompt: NodeHandler = ({
  node,
  nodeInputs,
}: NodeHandlerContext): RuntimePortValues => {
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
    resolveCodeObjectHandler: (args) =>
      resolvedOptions.resolveCodeObjectHandler?.(args) ??
      resolveAiPathsRuntimeCodeObjectHandler(args, {
        resolverIds: resolvedOptions.runtimeKernelCodeObjectResolverIds,
      }) ??
      (resolvedOptions.runtimeKernelStrictNativeRegistry
        ? strictDefaultResolveCodeObjectHandler(args)
        : defaultResolveCodeObjectHandler(args)),
    mode: resolvedOptions.runtimeKernelMode,
    v3PilotNodeTypes: resolvedOptions.runtimeKernelPilotNodeTypes,
    runtimeKernelStrictNativeRegistry: resolvedOptions.runtimeKernelStrictNativeRegistry,
  });

  return evaluateGraphInternal(nodes, resolvedEdges, {
    ...resolvedOptions,
    resolveHandler: runtimeKernel.resolveHandler,
    resolveHandlerTelemetry: (type: string) =>
      toNodeRuntimeResolutionTelemetry(runtimeKernel.resolveDescriptor(type)),
  });
}
