import type {
  NodeHandler,
  NodeRuntimeResolutionSource,
  NodeRuntimeResolutionStrategy,
  NodeRuntimeResolutionTelemetry,
} from '@/shared/contracts/ai-paths-runtime';

export const NODE_RUNTIME_KERNEL_STRATEGIES = ['legacy_adapter', 'code_object_v3'] as const;
export const NODE_RUNTIME_KERNEL_MODES = ['auto', 'legacy_only'] as const;
export type NodeRuntimeKernelMode = (typeof NODE_RUNTIME_KERNEL_MODES)[number];

export const NODE_RUNTIME_KERNEL_V3_PILOT_NODE_TYPES = [
  'constant',
  'context',
  'bundle',
  'compare',
  'delay',
  'db_schema',
  'description_updater',
  'fetcher',
  'gate',
  'iterator',
  'mapper',
  'math',
  'mutator',
  'notification',
  'parser',
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

export type CreateNodeRuntimeKernelArgs = {
  resolveLegacyHandler: (nodeType: string) => NodeHandler | null;
  resolveOverrideHandler?: ((nodeType: string) => NodeHandler | null) | undefined;
  v3PilotNodeTypes?: readonly string[] | undefined;
  mode?: NodeRuntimeKernelMode | undefined;
};

const normalizeNodeType = (nodeType: string): string =>
  typeof nodeType === 'string' ? nodeType.trim() : '';

const buildV3CodeObjectId = (nodeType: string): string => `ai-paths.node-code-object.${nodeType}.v3`;

export const resolveNodeRuntimeKernelMode = (mode: unknown): NodeRuntimeKernelMode =>
  mode === 'legacy_only' ? 'legacy_only' : 'auto';

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
  mode,
}: {
  nodeType: string;
  v3PilotNodeTypes: Set<string>;
  mode: NodeRuntimeKernelMode;
}): NodeRuntimeResolutionStrategy =>
  mode === 'legacy_only'
    ? 'legacy_adapter'
    : isNodeRuntimeKernelV3PilotType({ nodeType, v3PilotNodeTypes })
      ? 'code_object_v3'
      : 'legacy_adapter';

const buildDescriptor = ({
  nodeType,
  handler,
  source,
  v3PilotNodeTypes,
  mode,
}: {
  nodeType: string;
  handler: NodeHandler | null;
  source: NodeRuntimeResolutionSource;
  v3PilotNodeTypes: Set<string>;
  mode: NodeRuntimeKernelMode;
}): NodeRuntimeKernelDescriptor => {
  const strategy = resolveStrategy({ nodeType, v3PilotNodeTypes, mode });
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
  resolveOverrideHandler,
  v3PilotNodeTypes,
  mode,
}: CreateNodeRuntimeKernelArgs): NodeRuntimeKernel => {
  const resolvedMode = resolveNodeRuntimeKernelMode(mode);
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
        mode: resolvedMode,
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
          mode: resolvedMode,
        });
      }
    }

    const handler = resolveLegacyHandler(nodeType);
    return buildDescriptor({
      nodeType,
      handler,
      source: handler ? 'registry' : 'missing',
      v3PilotNodeTypes: resolvedPilotNodeTypes,
      mode: resolvedMode,
    });
  };

  return {
    resolveDescriptor,
    resolveHandler: (nodeType: string): NodeHandler | null => resolveDescriptor(nodeType).handler,
  };
};
