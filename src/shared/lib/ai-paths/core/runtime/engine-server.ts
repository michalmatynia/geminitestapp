/**
 * Engine Server: AI Path Evaluation Orchestrator
 * 
 * Central server-side entry point for AI automation graph evaluation.
 * This module bridges the abstract graph evaluation core with concrete
 * Node Runtime implementations (e.g., Prompt, Model, Database handlers).
 * 
 * Features:
 * - Runtime Kernel Orchestration: Initializes the runtime kernel with necessary 
 *   handler registries and legacy bridges.
 * - Concurrency Handling: Manages MongoDB client acquisition and observability 
 *   hooks for performance monitoring.
 * - Abstraction Layer: Bridges the gap between the `engine-core` and platform-specific
 *   Node Runtime execution logic.
 * 
 * Usage:
 * This module is invoked by the server-side AI Path runner. Use this as the 
 * top-level evaluator for all AI-automation workflows.
 */

import 'server-only';

import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import type { NodeHandler, RuntimeState } from '@/shared/contracts/ai-paths-runtime';
import { getMongoClient } from '@/shared/lib/db/mongo-client';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';

import { resolveAiPathsRuntimeCodeObjectHandler } from './code-object-resolver-registry';
import { evaluateGraphInternal } from './engine-core';
import { type EvaluateGraphArgs, type EvaluateGraphOptions } from './engine-modules/engine-types';

import {
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
import { createNodeCodeObjectV3ContractResolver } from './node-code-object-v3-legacy-bridge';
import { createNodeRuntimeHandlerCatalog } from './node-runtime-handler-catalog';
import { createNodeRuntimeKernel, toNodeRuntimeResolutionTelemetry } from './node-runtime-kernel';

// Re-export core evaluation interfaces for external callers
export * from './engine-core';

/**
 * Registry of all available runtime handlers for AI Path nodes.
 * Used by the runtime kernel to resolve execution logic per node type.
 */
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
  audio_oscillator: handleAudioOscillator,
  audio_speaker: handleAudioSpeaker,
  bounds_normalizer: handleBoundsNormalizer,
  canvas_output: handleCanvasOutput,
});

/** Resolves a legacy handler by node type ID. */
const resolveLegacyHandler = (type: string): NodeHandler | null => {
  return SERVER_HANDLER_CATALOG.resolveLegacyHandler(type);
};

/** List of native code object handler IDs for runtime validation. */
export const SERVER_NATIVE_CODE_OBJECT_HANDLER_IDS: readonly string[] = Object.freeze([
  ...SERVER_HANDLER_CATALOG.nativeCodeObjectHandlerIds,
]);

/** Default resolver for code objects based on V3 contract metadata. */
const defaultResolveCodeObjectHandler = createNodeCodeObjectV3ContractResolver({
  resolveNativeCodeObjectHandler: SERVER_HANDLER_CATALOG.resolveNativeCodeObjectHandler,
});

let processStartedAtMs: number | null = null;

/**
 * Server-side evaluation entry point.
 * Normalizes graph inputs and triggers the execution pipeline.
 */
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
