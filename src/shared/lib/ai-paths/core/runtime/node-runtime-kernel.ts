import type {
  NodeHandler,
  NodeRuntimeResolutionSource,
  NodeRuntimeResolutionStrategy,
  NodeRuntimeResolutionTelemetry,
} from '@/shared/contracts/ai-paths-runtime';

export const NODE_RUNTIME_KERNEL_STRATEGIES = ['legacy_adapter', 'code_object_v3'] as const;
export const NODE_RUNTIME_KERNEL_MODES = ['auto'] as const;
export type NodeRuntimeKernelMode = (typeof NODE_RUNTIME_KERNEL_MODES)[number];

export const NODE_RUNTIME_KERNEL_V3_PILOT_NODE_TYPES = [
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
  strategy: NodeRuntimeResolutionStrategy;
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
  resolveCodeObjectHandler?: ((args: ResolveCodeObjectHandlerArgs) => NodeHandler | null) | undefined;
  resolveOverrideHandler?: ((nodeType: string) => NodeHandler | null) | undefined;
  v3PilotNodeTypes?: readonly string[] | undefined;
  mode?: NodeRuntimeKernelMode | undefined;
  runtimeKernelStrictNativeRegistry?: boolean | undefined;
};

const normalizeNodeType = (nodeType: string): string =>
  typeof nodeType === 'string' ? nodeType.trim() : '';

const buildV3CodeObjectId = (nodeType: string): string => `ai-paths.node-code-object.${nodeType}.v3`;

export const resolveNodeRuntimeKernelMode = (_mode: unknown): NodeRuntimeKernelMode => 'auto';

export const isNodeRuntimeKernelV3PilotType = ({
  nodeType,
  v3PilotNodeTypes,
}: {
  nodeType: string;
  v3PilotNodeTypes: Set<string>;
}): boolean => v3PilotNodeTypes.has(nodeType);

const resolveStrategy = ({
  nodeType,
  v3PilotNodeTypes,
}: {
  nodeType: string;
  v3PilotNodeTypes: Set<string>;
}): NodeRuntimeResolutionStrategy =>
  isNodeRuntimeKernelV3PilotType({ nodeType, v3PilotNodeTypes })
    ? 'code_object_v3'
    : 'legacy_adapter';

const buildDescriptor = ({
  nodeType,
  handler,
  source,
  v3PilotNodeTypes,
}: {
  nodeType: string;
  handler: NodeHandler | null;
  source: NodeRuntimeResolutionSource;
  v3PilotNodeTypes: Set<string>;
}): NodeRuntimeKernelDescriptor => {
  const strategy = resolveStrategy({ nodeType, v3PilotNodeTypes });
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
  runtimeStrategy: descriptor.strategy,
  runtimeResolutionSource: descriptor.source,
  runtimeCodeObjectId: descriptor.codeObjectId,
});

export const createNodeRuntimeKernel = ({
  resolveLegacyHandler,
  resolveCodeObjectHandler,
  resolveOverrideHandler,
  v3PilotNodeTypes,
  mode,
  runtimeKernelStrictNativeRegistry,
}: CreateNodeRuntimeKernelArgs): NodeRuntimeKernel => {
  // Accept deprecated mode inputs for compatibility, but runtime behavior is always auto.
  resolveNodeRuntimeKernelMode(mode);
  const resolvedPilotNodeTypes = new Set<string>(
    (v3PilotNodeTypes ?? NODE_RUNTIME_KERNEL_V3_PILOT_NODE_TYPES)
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
        v3PilotNodeTypes: resolvedPilotNodeTypes,
      });
    }

    if (typeof resolveOverrideHandler === 'function') {
      const override = resolveOverrideHandler(nodeType);
      if (override) {
        return buildDescriptor({
          nodeType,
          handler: override,
          source: 'override',
          v3PilotNodeTypes: resolvedPilotNodeTypes,
        });
      }
    }

    const strategy = resolveStrategy({
      nodeType,
      v3PilotNodeTypes: resolvedPilotNodeTypes,
    });
    if (strategy === 'code_object_v3' && typeof resolveCodeObjectHandler === 'function') {
      const codeObjectId = buildV3CodeObjectId(nodeType);
      const codeObjectHandler = resolveCodeObjectHandler({
        nodeType,
        codeObjectId,
      });
      if (codeObjectHandler) {
        return buildDescriptor({
          nodeType,
          handler: codeObjectHandler,
          source: 'registry',
          v3PilotNodeTypes: resolvedPilotNodeTypes,
        });
      }
      if (runtimeKernelStrictNativeRegistry) {
        return buildDescriptor({
          nodeType,
          handler: null,
          source: 'missing',
          v3PilotNodeTypes: resolvedPilotNodeTypes,
        });
      }
    }

    const handler = resolveLegacyHandler(nodeType);
    return buildDescriptor({
      nodeType,
      handler,
      source: handler ? 'registry' : 'missing',
      v3PilotNodeTypes: resolvedPilotNodeTypes,
    });
  };

  return {
    resolveDescriptor,
    resolveHandler: (nodeType: string): NodeHandler | null => resolveDescriptor(nodeType).handler,
  };
};
