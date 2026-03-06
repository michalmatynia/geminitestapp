import 'server-only';

import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import type { NodeHandler, RuntimeState } from '@/shared/contracts/ai-paths-runtime';

import { evaluateGraphInternal } from './engine-core';
import { resolveAiPathsRuntimeCodeObjectHandler } from './code-object-resolver-registry';
import { createNodeRuntimeKernel, toNodeRuntimeResolutionTelemetry } from './node-runtime-kernel';
import { createNodeCodeObjectV3ContractResolver } from './node-code-object-v3-legacy-bridge';
import { createNodeRuntimeHandlerCatalog } from './node-runtime-handler-catalog';

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

const SERVER_HANDLER_CATALOG = createNodeRuntimeHandlerCatalog({
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
});

const resolveLegacyHandler = (type: string): NodeHandler | null => {
  return SERVER_HANDLER_CATALOG.resolveLegacyHandler(type);
};
export const SERVER_NATIVE_CODE_OBJECT_HANDLER_IDS: readonly string[] = Object.freeze(
  [...SERVER_HANDLER_CATALOG.nativeCodeObjectHandlerIds]
);

const defaultResolveCodeObjectHandler = createNodeCodeObjectV3ContractResolver({
  resolveLegacyHandler,
  resolveNativeCodeObjectHandler: SERVER_HANDLER_CATALOG.resolveNativeCodeObjectHandler,
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

  const runtimeKernel = createNodeRuntimeKernel({
    resolveLegacyHandler,
    resolveCodeObjectHandler: (args) =>
      resolvedOptions.resolveCodeObjectHandler?.(args) ??
      resolveAiPathsRuntimeCodeObjectHandler(args, {
        resolverIds: resolvedOptions.runtimeKernelCodeObjectResolverIds,
      }) ??
      defaultResolveCodeObjectHandler(args),
    resolveOverrideHandler: resolvedOptions.resolveHandler,
    runtimeKernelNodeTypes: resolvedOptions.runtimeKernelNodeTypes,
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
