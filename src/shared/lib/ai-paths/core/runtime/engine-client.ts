import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import type { RuntimeState, NodeHandler } from '@/shared/contracts/ai-paths-runtime';

import { evaluateGraphInternal } from './engine-core';
import { resolveAiPathsRuntimeCodeObjectHandler } from './code-object-resolver-registry';
import { createNodeRuntimeKernel, toNodeRuntimeResolutionTelemetry } from './node-runtime-kernel';
import { createNodeCodeObjectV3ContractResolver } from './node-code-object-v3-legacy-bridge';

import { type EvaluateGraphArgs, type EvaluateGraphOptions } from './engine-modules/engine-types';

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

// Re-export types from core
export * from './engine-core';

const CLIENT_HANDLERS: Record<string, NodeHandler> = {
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
  'ai-paths.node-code-object.parser.v3': handleParser,
  'ai-paths.node-code-object.regex.v3': handleRegex,
  'ai-paths.node-code-object.router.v3': handleRouter,
  'ai-paths.node-code-object.string_mutator.v3': handleStringMutator,
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
