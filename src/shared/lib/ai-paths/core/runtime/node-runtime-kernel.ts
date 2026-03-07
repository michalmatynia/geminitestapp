import type {
  NodeHandler,
  NodeRuntimeResolutionSource,
  NodeRuntimeResolutionStrategy,
  NodeRuntimeResolutionTelemetry,
} from '@/shared/contracts/ai-paths-runtime';
import { resolveNodeCodeObjectV3ContractByCodeObjectId } from './node-code-object-v3-legacy-bridge';

export const NODE_RUNTIME_KERNEL_STRATEGIES = ['compatibility', 'code_object_v3'] as const;
export type NodeRuntimeKernelStrategy = (typeof NODE_RUNTIME_KERNEL_STRATEGIES)[number];

export const NODE_RUNTIME_KERNEL_CANONICAL_NODE_TYPES = [
  'agent',
  'api_advanced',
  'audio_oscillator',
  'audio_speaker',
  'constant',
  'context',
  'bundle',
  'compare',
  'database',
  'delay',
  'db_schema',
  'description_updater',
  'ai_description',
  'fetcher',
  'gate',
  'http',
  'iterator',
  'learner_agent',
  'mapper',
  'math',
  'model',
  'mutator',
  'notification',
  'parser',
  'playwright',
  'poll',
  'prompt',
  'regex',
  'router',
  'simulation',
  'string_mutator',
  'template',
  'trigger',
  'validation_pattern',
  'validator',
  'viewer',
] as const;

export type NodeRuntimeKernelDescriptor = {
  nodeType: string;
  strategy: NodeRuntimeKernelStrategy;
  source: NodeRuntimeResolutionSource;
  codeObjectId: string | null;
  handler: NodeHandler | null;
};

export type NodeRuntimeKernel = {
  resolveDescriptor: (nodeType: string) => NodeRuntimeKernelDescriptor;
  resolveHandler: (nodeType: string) => NodeHandler | null;
};

export type ResolveCodeObjectHandlerArgs = {
  nodeType: string;
  codeObjectId: string;
};

export type CreateNodeRuntimeKernelArgs = {
  resolveLegacyHandler: (nodeType: string) => NodeHandler | null;
  resolveCodeObjectHandler?:
    | ((args: ResolveCodeObjectHandlerArgs) => NodeHandler | null)
    | undefined;
  resolveOverrideHandler?: ((nodeType: string) => NodeHandler | null) | undefined;
  runtimeKernelNodeTypes?: readonly string[] | undefined;
};

const normalizeNodeType = (nodeType: string): string =>
  typeof nodeType === 'string' ? nodeType.trim() : '';

const buildV3CodeObjectId = (nodeType: string): string =>
  `ai-paths.node-code-object.${nodeType}.v3`;

const toPublicRuntimeStrategy = (
  strategy: NodeRuntimeKernelStrategy
): NodeRuntimeResolutionStrategy => strategy;

export const isNodeRuntimeKernelCanonicalType = ({
  nodeType,
  runtimeKernelNodeTypes,
}: {
  nodeType: string;
  runtimeKernelNodeTypes: Set<string>;
}): boolean => runtimeKernelNodeTypes.has(nodeType);

const resolveStrategy = ({
  nodeType,
  runtimeKernelNodeTypes,
}: {
  nodeType: string;
  runtimeKernelNodeTypes: Set<string>;
}): NodeRuntimeKernelStrategy =>
  isNodeRuntimeKernelCanonicalType({ nodeType, runtimeKernelNodeTypes })
    ? 'code_object_v3'
    : 'compatibility';

const buildDescriptor = ({
  nodeType,
  handler,
  source,
  runtimeKernelNodeTypes,
}: {
  nodeType: string;
  handler: NodeHandler | null;
  source: NodeRuntimeResolutionSource;
  runtimeKernelNodeTypes: Set<string>;
}): NodeRuntimeKernelDescriptor => {
  const strategy = resolveStrategy({ nodeType, runtimeKernelNodeTypes });
  return {
    nodeType,
    strategy,
    source,
    codeObjectId: strategy === 'code_object_v3' ? buildV3CodeObjectId(nodeType) : null,
    handler,
  };
};

export const toNodeRuntimeResolutionTelemetry = (
  descriptor: NodeRuntimeKernelDescriptor
): NodeRuntimeResolutionTelemetry => ({
  runtimeStrategy: toPublicRuntimeStrategy(descriptor.strategy),
  runtimeResolutionSource: descriptor.source,
  runtimeCodeObjectId: descriptor.codeObjectId,
});

export const createNodeRuntimeKernel = ({
  resolveLegacyHandler,
  resolveCodeObjectHandler,
  resolveOverrideHandler,
  runtimeKernelNodeTypes,
}: CreateNodeRuntimeKernelArgs): NodeRuntimeKernel => {
  const resolvedRuntimeKernelNodeTypes = new Set<string>(
    (runtimeKernelNodeTypes ?? NODE_RUNTIME_KERNEL_CANONICAL_NODE_TYPES)
      .map((entry: string): string => normalizeNodeType(entry))
      .filter(Boolean)
  );

  const resolveDescriptor = (nodeTypeInput: string): NodeRuntimeKernelDescriptor => {
    const nodeType = normalizeNodeType(nodeTypeInput);
    if (!nodeType) {
      return buildDescriptor({
        nodeType: '',
        handler: null,
        source: 'missing',
        runtimeKernelNodeTypes: resolvedRuntimeKernelNodeTypes,
      });
    }

    if (typeof resolveOverrideHandler === 'function') {
      const override = resolveOverrideHandler(nodeType);
      if (override) {
        return buildDescriptor({
          nodeType,
          handler: override,
          source: 'override',
          runtimeKernelNodeTypes: resolvedRuntimeKernelNodeTypes,
        });
      }
    }

    const strategy = resolveStrategy({
      nodeType,
      runtimeKernelNodeTypes: resolvedRuntimeKernelNodeTypes,
    });

    if (strategy === 'code_object_v3') {
      const codeObjectId = buildV3CodeObjectId(nodeType);
      if (typeof resolveCodeObjectHandler === 'function') {
        const codeObjectHandler = resolveCodeObjectHandler({
          nodeType,
          codeObjectId,
        });
        if (codeObjectHandler) {
          return buildDescriptor({
            nodeType,
            handler: codeObjectHandler,
            source: 'registry',
            runtimeKernelNodeTypes: resolvedRuntimeKernelNodeTypes,
          });
        }
      }

      if (resolveNodeCodeObjectV3ContractByCodeObjectId(codeObjectId)) {
        return buildDescriptor({
          nodeType,
          handler: null,
          source: 'missing',
          runtimeKernelNodeTypes: resolvedRuntimeKernelNodeTypes,
        });
      }
    }

    // Fallback to legacy handler
    const handler = resolveLegacyHandler(nodeType);
    return buildDescriptor({
      nodeType,
      handler,
      source: handler ? 'registry' : 'missing',
      runtimeKernelNodeTypes: resolvedRuntimeKernelNodeTypes,
    });
  };

  return {
    resolveDescriptor,
    resolveHandler: (nodeType: string): NodeHandler | null => resolveDescriptor(nodeType).handler,
  };
};
