import 'server-only';

import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import type { NodeHandler, RuntimeState } from '@/shared/contracts/ai-paths-runtime';

import { evaluateGraphInternal } from './engine-core';
import { resolveAiPathsRuntimeCodeObjectHandler } from './code-object-resolver-registry';
import { createNodeRuntimeKernel, toNodeRuntimeResolutionTelemetry } from './node-runtime-kernel';
import { createNodeCodeObjectV3ContractResolver } from './node-code-object-v3-legacy-bridge';

import { type EvaluateGraphArgs, type EvaluateGraphOptions } from './engine-modules/engine-types';

import {
  handleAiDescription,
  handleAudioOscillator,
  handleAudioSpeaker,
  handleAdvancedApi,
  handleAgent,
  handleBoundsNormalizer,
  handleCanvasOutput,
  handleBundle,
  handleCompare,
  handleLogicalCondition,
  handleConstant,
  handleContext,
  handleDatabase,
  handleDbSchema,
  handleDelay,
  handleDescriptionUpdater,
  handleGate,
  handleHttp,
  handleMapper,
  handleMath,
  handleModel,
  handleMutator,
  handlePlaywright,
  handleStringMutator,
  handleNotification,
  handleParser,
  handlePoll,
  handlePrompt,
  handleRegex,
  handleValidationPattern,
  handleIterator,
  handleRouter,
  handleSimulation,
  handleLearnerAgent,
  handleTemplate,
  handleFetcher,
  handleTrigger,
  handleValidator,
  handleViewer,
  handleFunctionNode,
  handleStateNode,
  handleSwitchNode,
  handleSubgraphNode,
} from './handlers';

import prisma from '@/shared/lib/db/prisma';
import { getMongoClient } from '@/shared/lib/db/mongo-client';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

// Re-export types from core
export * from './engine-core';

const HANDLERS: Record<string, NodeHandler> = {
  prompt: handlePrompt,
  model: handleModel,
  database: handleDatabase,
  http: handleHttp,
  parser: handleParser,
  mapper: handleMapper,
  math: handleMath,
  compare: handleCompare,
  regex: handleRegex,
  logical_condition: handleLogicalCondition,
  constant: handleConstant,
  delay: handleDelay,
  gate: handleGate,
  router: handleRouter,
  iterator: handleIterator,
  simulation: handleSimulation,
  trigger: handleTrigger,
  viewer: handleViewer,
  bundle: handleBundle,
  notification: handleNotification,
  playwright: handlePlaywright,
  function: handleFunctionNode,
  state: handleStateNode,
  switch: handleSwitchNode,
  subgraph: handleSubgraphNode,
  agent: handleAgent,
  learner_agent: handleLearnerAgent,
  description_updater: handleDescriptionUpdater,
  template: handleTemplate,
  fetcher: handleFetcher,
  validator: handleValidator,
  db_schema: handleDbSchema,
  poll: handlePoll,
  api_advanced: handleAdvancedApi,
  advanced_api: handleAdvancedApi,
  validation_pattern: handleValidationPattern,
  string_mutator: handleStringMutator,
  mutator: handleMutator,
  context: handleContext,
  ai_description: handleAiDescription,
  audio_oscillator: handleAudioOscillator,
  audio_speaker: handleAudioSpeaker,
  bounds_normalizer: handleBoundsNormalizer,
  canvas_output: handleCanvasOutput,
};

const resolveLegacyHandler = (type: string): NodeHandler | null => {
  return HANDLERS[type] || null;
};
const NATIVE_CODE_OBJECT_HANDLERS: Record<string, NodeHandler> = {
  'ai-paths.node-code-object.agent.v3': handleAgent,
  'ai-paths.node-code-object.ai_description.v3': handleAiDescription,
  'ai-paths.node-code-object.api_advanced.v3': handleAdvancedApi,
  'ai-paths.node-code-object.audio_oscillator.v3': handleAudioOscillator,
  'ai-paths.node-code-object.audio_speaker.v3': handleAudioSpeaker,
  'ai-paths.node-code-object.bundle.v3': handleBundle,
  'ai-paths.node-code-object.compare.v3': handleCompare,
  'ai-paths.node-code-object.constant.v3': handleConstant,
  'ai-paths.node-code-object.context.v3': handleContext,
  'ai-paths.node-code-object.database.v3': handleDatabase,
  'ai-paths.node-code-object.delay.v3': handleDelay,
  'ai-paths.node-code-object.db_schema.v3': handleDbSchema,
  'ai-paths.node-code-object.description_updater.v3': handleDescriptionUpdater,
  'ai-paths.node-code-object.fetcher.v3': handleFetcher,
  'ai-paths.node-code-object.gate.v3': handleGate,
  'ai-paths.node-code-object.http.v3': handleHttp,
  'ai-paths.node-code-object.iterator.v3': handleIterator,
  'ai-paths.node-code-object.learner_agent.v3': handleLearnerAgent,
  'ai-paths.node-code-object.mapper.v3': handleMapper,
  'ai-paths.node-code-object.math.v3': handleMath,
  'ai-paths.node-code-object.model.v3': handleModel,
  'ai-paths.node-code-object.mutator.v3': handleMutator,
  'ai-paths.node-code-object.notification.v3': handleNotification,
  'ai-paths.node-code-object.parser.v3': handleParser,
  'ai-paths.node-code-object.playwright.v3': handlePlaywright,
  'ai-paths.node-code-object.poll.v3': handlePoll,
  'ai-paths.node-code-object.prompt.v3': handlePrompt,
  'ai-paths.node-code-object.regex.v3': handleRegex,
  'ai-paths.node-code-object.router.v3': handleRouter,
  'ai-paths.node-code-object.simulation.v3': handleSimulation,
  'ai-paths.node-code-object.string_mutator.v3': handleStringMutator,
  'ai-paths.node-code-object.template.v3': handleTemplate,
  'ai-paths.node-code-object.trigger.v3': handleTrigger,
  'ai-paths.node-code-object.validation_pattern.v3': handleValidationPattern,
  'ai-paths.node-code-object.validator.v3': handleValidator,
  'ai-paths.node-code-object.viewer.v3': handleViewer,
};
export const SERVER_NATIVE_CODE_OBJECT_HANDLER_IDS: readonly string[] = Object.freeze(
  Object.keys(NATIVE_CODE_OBJECT_HANDLERS).sort()
);
const resolveNativeCodeObjectHandler = ({
  nodeType: _nodeType,
  codeObjectId,
}: {
  nodeType: string;
  codeObjectId: string;
}): NodeHandler | null => NATIVE_CODE_OBJECT_HANDLERS[codeObjectId] ?? null;
const parseBooleanRuntimeFlag = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on')
    return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off')
    return false;
  return undefined;
};

const defaultResolveCodeObjectHandler = createNodeCodeObjectV3ContractResolver({
  resolveLegacyHandler,
  resolveNativeCodeObjectHandler,
});
const strictDefaultResolveCodeObjectHandler = createNodeCodeObjectV3ContractResolver({
  resolveLegacyHandler,
  resolveNativeCodeObjectHandler,
  strictNativeRegistry: true,
});

let processStartedAtMs: number | null = null;

export async function evaluateGraphServer(
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

  const runtimeCallStartedAt = Date.now();
  if (processStartedAtMs === null) {
    processStartedAtMs = runtimeCallStartedAt;
  }

  const mongoStart = Date.now();
  const mongo = await getMongoClient();
  const mongoDurationMs = Date.now() - mongoStart;

  if (mongoDurationMs > 0) {
    void logSystemEvent({
      level: 'info',
      source: 'runtime-engine',
      message: '[engine-server] Mongo client acquisition completed',
      context: {
        mongoDurationMs,
        sinceProcessStartMs: runtimeCallStartedAt - (processStartedAtMs ?? runtimeCallStartedAt),
      },
    });
  }

  const runtimeKernelStrictNativeRegistry =
    resolvedOptions.runtimeKernelStrictNativeRegistry ??
    parseBooleanRuntimeFlag(process.env['AI_PATHS_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY']) ??
    false;
  const runtimeKernel = createNodeRuntimeKernel({
    resolveLegacyHandler,
    resolveCodeObjectHandler: (args) =>
      resolvedOptions.resolveCodeObjectHandler?.(args) ??
      resolveAiPathsRuntimeCodeObjectHandler(args, {
        resolverIds: resolvedOptions.runtimeKernelCodeObjectResolverIds,
      }) ??
      (runtimeKernelStrictNativeRegistry
        ? strictDefaultResolveCodeObjectHandler(args)
        : defaultResolveCodeObjectHandler(args)),
    resolveOverrideHandler: resolvedOptions.resolveHandler,
    mode: resolvedOptions.runtimeKernelMode,
    v3PilotNodeTypes: resolvedOptions.runtimeKernelPilotNodeTypes,
    runtimeKernelStrictNativeRegistry,
  });

  const result = await evaluateGraphInternal(nodes, resolvedEdges, {
    ...resolvedOptions,
    resolveHandler: runtimeKernel.resolveHandler,
    resolveHandlerTelemetry: (type: string) =>
      toNodeRuntimeResolutionTelemetry(runtimeKernel.resolveDescriptor(type)),
    services: {
      prisma,
      mongo,
      ...((resolvedOptions.services as Record<string, unknown>) ?? {}),
    },
  });

  const runtimeCallDurationMs = Date.now() - runtimeCallStartedAt;
  void logSystemEvent({
    level: 'info',
    source: 'runtime-engine',
    message: '[engine-server] evaluateGraphServer completed',
    context: {
      durationMs: runtimeCallDurationMs,
      sinceProcessStartMs: runtimeCallStartedAt - (processStartedAtMs ?? runtimeCallStartedAt),
    },
  });

  return result;
}

export async function evaluateGraphWithIteratorAutoContinue(
  args: EvaluateGraphArgs
): Promise<RuntimeState> {
  return evaluateGraphServer(args);
}
