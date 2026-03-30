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

type ResolveDescriptorContext = {
  nodeType: string;
  resolveCodeObjectHandler?: CreateNodeRuntimeKernelArgs['resolveCodeObjectHandler'];
  resolveLegacyHandler: CreateNodeRuntimeKernelArgs['resolveLegacyHandler'];
  resolveOverrideHandler?: CreateNodeRuntimeKernelArgs['resolveOverrideHandler'];
  runtimeKernelNodeTypes: Set<string>;
};

type BuildKernelDescriptor = (args: {
  handler: NodeHandler | null;
  nodeType: string;
  source: NodeRuntimeResolutionSource;
}) => NodeRuntimeKernelDescriptor;

const createDescriptorBuilder =
  (runtimeKernelNodeTypes: Set<string>) =>
  (
    args: {
      handler: NodeHandler | null;
      nodeType: string;
      source: NodeRuntimeResolutionSource;
    }
  ): NodeRuntimeKernelDescriptor =>
    buildDescriptor({
      ...args,
      runtimeKernelNodeTypes,
    });

const resolveOverrideDescriptor = ({
  buildDescriptor,
  nodeType,
  resolveOverrideHandler,
}: {
  buildDescriptor: BuildKernelDescriptor;
  nodeType: string;
  resolveOverrideHandler?: CreateNodeRuntimeKernelArgs['resolveOverrideHandler'];
}): NodeRuntimeKernelDescriptor | null => {
  if (typeof resolveOverrideHandler !== 'function') {
    return null;
  }

  const override = resolveOverrideHandler(nodeType);

  return override
    ? buildDescriptor({
        nodeType,
        handler: override,
        source: 'override',
      })
    : null;
};

const resolveCodeObjectDescriptor = ({
  buildDescriptor,
  nodeType,
  resolveCodeObjectHandler,
  runtimeKernelNodeTypes,
}: {
  buildDescriptor: BuildKernelDescriptor;
  nodeType: string;
  resolveCodeObjectHandler?: CreateNodeRuntimeKernelArgs['resolveCodeObjectHandler'];
  runtimeKernelNodeTypes: Set<string>;
}): NodeRuntimeKernelDescriptor | null => {
  const strategy = resolveStrategy({
    nodeType,
    runtimeKernelNodeTypes,
  });

  if (strategy !== 'code_object_v3') {
    return null;
  }

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
      });
    }
  }

  return resolveNodeCodeObjectV3ContractByCodeObjectId(codeObjectId)
    ? buildDescriptor({
        nodeType,
        handler: null,
        source: 'missing',
      })
    : null;
};

const resolveLegacyDescriptor = ({
  buildDescriptor,
  nodeType,
  resolveLegacyHandler,
}: {
  buildDescriptor: BuildKernelDescriptor;
  nodeType: string;
  resolveLegacyHandler: CreateNodeRuntimeKernelArgs['resolveLegacyHandler'];
}): NodeRuntimeKernelDescriptor => {
  const handler = resolveLegacyHandler(nodeType);

  return buildDescriptor({
    nodeType,
    handler,
    source: handler ? 'registry' : 'missing',
  });
};

const resolveNodeRuntimeDescriptor = ({
  nodeType,
  resolveCodeObjectHandler,
  resolveLegacyHandler,
  resolveOverrideHandler,
  runtimeKernelNodeTypes,
}: ResolveDescriptorContext): NodeRuntimeKernelDescriptor => {
  const buildKernelDescriptor = createDescriptorBuilder(runtimeKernelNodeTypes);
  const overrideDescriptor = resolveOverrideDescriptor({
    buildDescriptor: buildKernelDescriptor,
    nodeType,
    resolveOverrideHandler,
  });

  if (overrideDescriptor) {
    return overrideDescriptor;
  }

  const codeObjectDescriptor = resolveCodeObjectDescriptor({
    buildDescriptor: buildKernelDescriptor,
    nodeType,
    resolveCodeObjectHandler,
    runtimeKernelNodeTypes,
  });

  if (codeObjectDescriptor) {
    return codeObjectDescriptor;
  }

  return resolveLegacyDescriptor({
    buildDescriptor: buildKernelDescriptor,
    nodeType,
    resolveLegacyHandler,
  });
};

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
    const buildKernelDescriptor = createDescriptorBuilder(resolvedRuntimeKernelNodeTypes);

    if (!nodeType) {
      return buildKernelDescriptor({
        nodeType: '',
        handler: null,
        source: 'missing',
      });
    }

    return resolveNodeRuntimeDescriptor({
      nodeType,
      resolveCodeObjectHandler,
      resolveLegacyHandler,
      resolveOverrideHandler,
      runtimeKernelNodeTypes: resolvedRuntimeKernelNodeTypes,
    });
  };

  return {
    resolveDescriptor,
    resolveHandler: (nodeType: string): NodeHandler | null => resolveDescriptor(nodeType).handler,
  };
};
