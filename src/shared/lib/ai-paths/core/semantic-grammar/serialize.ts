import type { AiNode, Edge, PathConfig } from '@/shared/contracts/ai-paths';
 
import type {
  CanvasSemanticDocumentDto as CanvasSemanticDocument,
  SemanticEdgeDto as SemanticEdge,
  SemanticNodeDto as SemanticNode,
  SemanticNodeConnectionsDto as SemanticNodeConnections,
  SemanticPortBindingDto as SemanticPortBinding,
} from '@/shared/contracts/ai-paths-semantic-grammar';

const SEMANTIC_SPEC_VERSION = 'ai-paths.semantic-grammar.v1' as const;

export type SerializeSemanticCanvasOptions = {
  includeConnections?: boolean;
  sortById?: boolean;
  exportedAt?: string | undefined;
  exporterVersion?: string | undefined;
  workspace?: string | undefined;
};

const toEdgeFromNodeId = (edge: Edge): string =>
  (typeof edge.from === 'string' && edge.from.trim().length > 0
    ? edge.from
    : typeof edge.source === 'string' && edge.source.trim().length > 0
      ? edge.source
      : ''
  ).trim();

const toEdgeToNodeId = (edge: Edge): string =>
  (typeof edge.to === 'string' && edge.to.trim().length > 0
    ? edge.to
    : typeof edge.target === 'string' && edge.target.trim().length > 0
      ? edge.target
      : ''
  ).trim();

const toEdgeFromPort = (edge: Edge): string | null =>
  typeof edge.fromPort === 'string'
    ? edge.fromPort
    : typeof edge.sourceHandle === 'string'
      ? edge.sourceHandle
      : null;

const toEdgeToPort = (edge: Edge): string | null =>
  typeof edge.toPort === 'string'
    ? edge.toPort
    : typeof edge.targetHandle === 'string'
      ? edge.targetHandle
      : null;

const toSemanticEdge = (edge: Edge): SemanticEdge => ({
  id: edge.id,
  fromNodeId: toEdgeFromNodeId(edge),
  toNodeId: toEdgeToNodeId(edge),
  ...(toEdgeFromPort(edge) !== null ? { fromPort: toEdgeFromPort(edge) } : {}),
  ...(toEdgeToPort(edge) !== null ? { toPort: toEdgeToPort(edge) } : {}),
  ...(typeof edge.label === 'string' || edge.label === null ? { label: edge.label } : {}),
  ...(typeof edge.type === 'string' && edge.type.trim().length > 0 ? { type: edge.type } : {}),
  ...(edge.data && typeof edge.data === 'object' ? { data: edge.data } : {}),
  ...(typeof edge.createdAt === 'string' ? { createdAt: edge.createdAt } : {}),
  ...(typeof edge.updatedAt === 'string' || edge.updatedAt === null
    ? { updatedAt: edge.updatedAt }
    : {}),
});

const toPortBinding = (edge: SemanticEdge): SemanticPortBinding => ({
  edgeId: edge.id,
  fromNodeId: edge.fromNodeId,
  ...(typeof edge.fromPort === 'string' || edge.fromPort === null
    ? { fromPort: edge.fromPort }
    : {}),
  toNodeId: edge.toNodeId,
  ...(typeof edge.toPort === 'string' || edge.toPort === null ? { toPort: edge.toPort } : {}),
});

const buildNodeConnections = (
  nodeIds: string[],
  edges: SemanticEdge[]
): Map<string, SemanticNodeConnections> => {
  const byNodeId = new Map<string, SemanticNodeConnections>();
  nodeIds.forEach((nodeId: string) => {
    byNodeId.set(nodeId, {
      incoming: [],
      outgoing: [],
    });
  });
  edges.forEach((edge: SemanticEdge) => {
    const binding = toPortBinding(edge);
    const outgoing = byNodeId.get(edge.fromNodeId);
    if (outgoing) outgoing.outgoing.push(binding);
    const incoming = byNodeId.get(edge.toNodeId);
    if (incoming) incoming.incoming.push(binding);
  });
  return byNodeId;
};

const sortSemanticNodes = (nodes: SemanticNode[]): SemanticNode[] =>
  nodes
    .slice()
    .sort((left: SemanticNode, right: SemanticNode): number => left.id.localeCompare(right.id));

const sortSemanticEdges = (edges: SemanticEdge[]): SemanticEdge[] =>
  edges
    .slice()
    .sort((left: SemanticEdge, right: SemanticEdge): number => left.id.localeCompare(right.id));

export const serializePathConfigToSemanticCanvas = (
  pathConfig: PathConfig,
  options?: SerializeSemanticCanvasOptions
): CanvasSemanticDocument => {
  const includeConnections = options?.includeConnections !== false;
  const sortById = options?.sortById !== false;

  const semanticEdgesRaw = (pathConfig.edges ?? []).map(
    (edge: Edge): SemanticEdge => toSemanticEdge(edge)
  );
  const semanticEdges = sortById ? sortSemanticEdges(semanticEdgesRaw) : semanticEdgesRaw;

  const nodeConnections = buildNodeConnections(
    (pathConfig.nodes ?? []).map((node: AiNode) => node.id),
    semanticEdges
  );

  const semanticNodesRaw = (pathConfig.nodes ?? []).map((node: AiNode): SemanticNode => {
    const nodeTypeId = typeof node.nodeTypeId === 'string' ? node.nodeTypeId.trim() : '';
    const instanceId = typeof node.instanceId === 'string' ? node.instanceId.trim() : '';
    const identityExtension =
      nodeTypeId.length > 0 || instanceId.length > 0
        ? {
          aiPathsIdentity: {
            ...(nodeTypeId.length > 0 ? { nodeTypeId } : {}),
            instanceId: instanceId.length > 0 ? instanceId : node.id,
          },
        }
        : null;
    return {
      id: node.id,
      type: node.type,
      title: node.title ?? '',
      description: node.description ?? '',
      position: node.position,
      inputs: node.inputs,
      outputs: node.outputs,
      ...(node.config && typeof node.config === 'object' ? { config: node.config } : {}),
      ...(node.data && typeof node.data === 'object' ? { data: node.data } : {}),
      ...(typeof node.createdAt === 'string' ? { createdAt: node.createdAt } : {}),
      ...(typeof node.updatedAt === 'string' || node.updatedAt === null
        ? { updatedAt: node.updatedAt }
        : {}),
      ...(includeConnections
        ? { connections: nodeConnections.get(node.id) ?? { incoming: [], outgoing: [] } }
        : {}),
      ...(identityExtension ? { extensions: identityExtension } : {}),
    };
  });
  const semanticNodes = sortById ? sortSemanticNodes(semanticNodesRaw) : semanticNodesRaw;

  return {
    specVersion: SEMANTIC_SPEC_VERSION,
    kind: 'canvas',
    path: {
      id: pathConfig.id,
      version: pathConfig.version,
      name: pathConfig.name,
      description: pathConfig.description,
      trigger: pathConfig.trigger,
      updatedAt: pathConfig.updatedAt,
      ...(typeof pathConfig.executionMode === 'string'
        ? { executionMode: pathConfig.executionMode }
        : {}),
      ...(typeof pathConfig.flowIntensity === 'string'
        ? { flowIntensity: pathConfig.flowIntensity }
        : {}),
      ...(typeof pathConfig.runMode === 'string' ? { runMode: pathConfig.runMode } : {}),
      ...(typeof pathConfig.strictFlowMode === 'boolean'
        ? { strictFlowMode: pathConfig.strictFlowMode }
        : {}),
      ...(typeof pathConfig.isLocked === 'boolean' ? { isLocked: pathConfig.isLocked } : {}),
      ...(typeof pathConfig.isActive === 'boolean' ? { isActive: pathConfig.isActive } : {}),
    },
    nodes: semanticNodes,
    edges: semanticEdges,
    execution: {
      ...(pathConfig.parserSamples &&
      typeof pathConfig.parserSamples === 'object' &&
      !Array.isArray(pathConfig.parserSamples)
        ? { parserSamples: pathConfig.parserSamples }
        : {}),
      ...(pathConfig.updaterSamples &&
      typeof pathConfig.updaterSamples === 'object' &&
      !Array.isArray(pathConfig.updaterSamples)
        ? { updaterSamples: pathConfig.updaterSamples }
        : {}),
      ...(pathConfig.runtimeState !== undefined ? { runtimeState: pathConfig.runtimeState } : {}),
      ...(typeof pathConfig.lastRunAt === 'string' || pathConfig.lastRunAt === null
        ? { lastRunAt: pathConfig.lastRunAt }
        : {}),
      ...(typeof pathConfig.runCount === 'number' ? { runCount: pathConfig.runCount } : {}),
    },
    ...(pathConfig.aiPathsValidation ? { validation: pathConfig.aiPathsValidation } : {}),
    provenance: {
      source: 'ai-paths',
      exportedAt: options?.exportedAt ?? new Date().toISOString(),
      pathId: pathConfig.id,
      ...(options?.exporterVersion ? { exporterVersion: options.exporterVersion } : {}),
      ...(options?.workspace ? { workspace: options.workspace } : {}),
    },
  };
};
