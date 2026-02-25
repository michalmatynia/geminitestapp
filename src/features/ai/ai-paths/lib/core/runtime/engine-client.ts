'use client';

import type {
  AiNode,
  Edge,
} from '@/shared/contracts/ai-paths';
import type {
  RuntimeState,
  NodeHandler,
} from '@/shared/contracts/ai-paths-runtime';

import {
  evaluateGraphInternal,
  type EvaluateGraphArgs,
  type EvaluateGraphOptions,
} from './engine-core';

import {
  handleConstant,
  handleMath,
  handleLogicalCondition,
  handleRouter,
  handleGate,
  handleBundle,
  handleDelay,
  handleViewer,
} from './handlers/common';

import {
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

// Re-export types from core
export * from './engine-core';

const CLIENT_HANDLERS: Record<string, NodeHandler> = {
  constant: handleConstant,
  math: handleMath,
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
};

const resolveHandler = (type: string): NodeHandler | null => {
  const handler = CLIENT_HANDLERS[type];
  if (handler) return handler;
  
  // For unsupported nodes in client, we return a mock handler that fails or skips
  return () => {
    throw new Error(`Node type '${type}' is not supported in client-side execution. Use Server execution.`);
  };
};

export async function evaluateGraphClient(
  argsOrNodes: EvaluateGraphArgs | AiNode[],
  edges?: Edge[],
  options?: EvaluateGraphOptions
): Promise<RuntimeState> {
  const isArgsObject = !Array.isArray(argsOrNodes);
  const nodes = isArgsObject ? (argsOrNodes).nodes : argsOrNodes;
  const resolvedEdges = isArgsObject ? (argsOrNodes).edges : edges ?? [];
  const resolvedOptions = isArgsObject ? (argsOrNodes) : options ?? { reportAiPathsError: () => {} };

  return evaluateGraphInternal(nodes, resolvedEdges, {
    ...resolvedOptions,
    resolveHandler,
  });
}
