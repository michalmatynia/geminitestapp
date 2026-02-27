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
} from './engine-core';

import {
  type EvaluateGraphArgs,
  type EvaluateGraphOptions,
} from './engine-modules/engine-types';

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
  handleBoundsNormalizer,
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
  bounds_normalizer: handleBoundsNormalizer,
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

  return evaluateGraphInternal(nodes, resolvedEdges, {
    ...resolvedOptions,
    resolveHandler,
  });
}
