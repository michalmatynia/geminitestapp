import 'server-only';

import type {
  AiNode,
  Edge,
} from '@/shared/contracts/ai-paths';
import type {
  RuntimeState,
} from '@/shared/contracts/ai-paths-runtime';

import {
  evaluateGraphInternal,
  type EvaluateGraphArgs,
  type EvaluateGraphOptions,
} from './engine-core';

import {
  NodeHandler,
  handleAiDescription,
  handleAudioOscillator,
  handleAudioSpeaker,
  handleAdvancedApi,
  handleAgent,
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
  handleLearnerAgent,
  handleTemplate,
  handleFetcher,
  handleTrigger,
  handleValidator,
  handleViewer,
} from './handlers';

import prisma from '@/shared/lib/db/prisma';
import { getMongoClient } from '@/shared/lib/db/mongo-client';

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
  trigger: handleTrigger,
  viewer: handleViewer,
  bundle: handleBundle,
  notification: handleNotification,
  playwright: handlePlaywright,
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
};

const resolveHandler = (type: string): NodeHandler | null => {
  return HANDLERS[type] || null;
};

export async function evaluateGraphServer(
  argsOrNodes: EvaluateGraphArgs | AiNode[],
  edges?: Edge[],
  options?: EvaluateGraphOptions
): Promise<RuntimeState> {
  const isArgsObject = !Array.isArray(argsOrNodes);
  const nodes = isArgsObject ? (argsOrNodes as EvaluateGraphArgs).nodes : argsOrNodes;
  const resolvedEdges = isArgsObject ? (argsOrNodes as EvaluateGraphArgs).edges : edges ?? [];
  const resolvedOptions = isArgsObject ? (argsOrNodes as EvaluateGraphArgs) : options ?? { reportAiPathsError: () => {} };

  const mongo = await getMongoClient();

  return evaluateGraphInternal(nodes, resolvedEdges, {
    ...resolvedOptions,
    resolveHandler,
    services: {
      prisma,
      mongo,
      ...(resolvedOptions.services ?? {}),
    },
  });
}

export async function evaluateGraphWithIteratorAutoContinue(
  args: EvaluateGraphArgs
): Promise<RuntimeState> {
  return evaluateGraphServer(args);
}
