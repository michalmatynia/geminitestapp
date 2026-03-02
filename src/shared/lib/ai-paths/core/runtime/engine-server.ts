import 'server-only';

import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import type { NodeHandler, RuntimeState } from '@/shared/contracts/ai-paths-runtime';

import { evaluateGraphInternal } from './engine-core';

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

const resolveHandler = (type: string): NodeHandler | null => {
  return HANDLERS[type] || null;
};

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

  const customResolveHandler = (type: string): NodeHandler | null => {
    const rh = resolvedOptions.resolveHandler;
    if (rh) {
      const handler = rh(type);
      if (handler) return handler;
    }
    return resolveHandler(type);
  };

  const result = await evaluateGraphInternal(nodes, resolvedEdges, {
    ...resolvedOptions,
    resolveHandler: customResolveHandler,
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
