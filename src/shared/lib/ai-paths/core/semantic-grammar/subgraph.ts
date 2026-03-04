import type { AiNode, Edge, PathConfig } from '@/shared/contracts/ai-paths';
import { subgraphSemanticDocumentSchema } from '@/shared/contracts/ai-paths-semantic-grammar';
import type {
  SemanticNode,
  SubgraphSemanticDocument,
  SemanticEdge,
} from '@/shared/contracts/ai-paths-semantic-grammar';

import { serializePathConfigToSemanticCanvas } from './serialize';
import { createNodeInstanceId, resolveNodeTypeId } from '../utils/node-identity';

export type BuildSemanticSubgraphOptions = {
  selectedNodeIds: string[];
  exportedAt?: string | undefined;
  exporterVersion?: string | undefined;
  workspace?: string | undefined;
};

export type ApplySemanticSubgraphOptions = {
  idPrefix?: string | undefined;
  positionOffset?: { x: number; y: number } | undefined;
};

const resolveEdgeFromNodeId = (edge: Edge): string =>
  typeof edge.from === 'string' ? edge.from.trim() : '';

const resolveEdgeToNodeId = (edge: Edge): string =>
  typeof edge.to === 'string' ? edge.to.trim() : '';

const resolveUniqueId = (desiredId: string, existingIds: Set<string>): string => {
  const trimmed = desiredId.trim();
  const base = trimmed.length > 0 ? trimmed : 'node';
  if (!existingIds.has(base)) {
    existingIds.add(base);
    return base;
  }
  let suffix = 2;
  while (suffix <= 9999) {
    const candidate = `${base}_${suffix}`;
    if (!existingIds.has(candidate)) {
      existingIds.add(candidate);
      return candidate;
    }
    suffix += 1;
  }
  const fallback = `${base}_${Date.now().toString(36)}`;
  existingIds.add(fallback);
  return fallback;
};

const resolveSemanticIdentityValue = (
  node: SemanticNode,
  key: 'nodeTypeId' | 'instanceId'
): string => {
  const extensions = node.extensions;
  if (!extensions || typeof extensions !== 'object' || Array.isArray(extensions)) {
    return '';
  }
  const identity = extensions['aiPathsIdentity'];
  if (!identity || typeof identity !== 'object' || Array.isArray(identity)) {
    return '';
  }
  const value = (identity as Record<string, unknown>)[key];
  return typeof value === 'string' ? value.trim() : '';
};

export const buildSemanticSubgraphFromPathConfig = (
  pathConfig: PathConfig,
  options: BuildSemanticSubgraphOptions
): SubgraphSemanticDocument => {
  const selected = new Set<string>(options.selectedNodeIds);
  const full = serializePathConfigToSemanticCanvas(pathConfig, {
    includeConnections: false,
    sortById: false,
    exportedAt: options.exportedAt,
    exporterVersion: options.exporterVersion,
    workspace: options.workspace,
  });
  const nodes = full.nodes.filter((node: SemanticNode): boolean => selected.has(node.id));
  const edges = full.edges.filter(
    (edge: SemanticEdge): boolean => selected.has(edge.fromNodeId) && selected.has(edge.toNodeId)
  );
  const boundaryIncoming = full.edges
    .filter(
      (edge: SemanticEdge): boolean => !selected.has(edge.fromNodeId) && selected.has(edge.toNodeId)
    )
    .map((edge: SemanticEdge) => ({
      edgeId: edge.id,
      fromNodeId: edge.fromNodeId,
      ...(edge.fromPort !== undefined ? { fromPort: edge.fromPort } : {}),
      toNodeId: edge.toNodeId,
      ...(edge.toPort !== undefined ? { toPort: edge.toPort } : {}),
    }));
  const boundaryOutgoing = full.edges
    .filter(
      (edge: SemanticEdge): boolean => selected.has(edge.fromNodeId) && !selected.has(edge.toNodeId)
    )
    .map((edge: SemanticEdge) => ({
      edgeId: edge.id,
      fromNodeId: edge.fromNodeId,
      ...(edge.fromPort !== undefined ? { fromPort: edge.fromPort } : {}),
      toNodeId: edge.toNodeId,
      ...(edge.toPort !== undefined ? { toPort: edge.toPort } : {}),
    }));

  return {
    specVersion: full.specVersion,
    kind: 'subgraph',
    pathId: full.path.id,
    selectedNodeIds: nodes.map((node) => node.id),
    nodes,
    edges,
    boundary: {
      incoming: boundaryIncoming,
      outgoing: boundaryOutgoing,
    },
    provenance: full.provenance,
  };
};

export const parseSemanticSubgraphDocument = (
  input: unknown
): { ok: true; value: SubgraphSemanticDocument } | { ok: false; error: string } => {
  const parsed = subgraphSemanticDocumentSchema.safeParse(input);
  if (parsed.success) {
    return {
      ok: true,
      value: parsed.data,
    };
  }
  return {
    ok: false,
    error: parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'document'}: ${issue.message}`)
      .join('; '),
  };
};

export const applySemanticSubgraphToPathConfig = (
  targetConfig: PathConfig,
  subgraph: SubgraphSemanticDocument,
  options?: ApplySemanticSubgraphOptions
): {
  pathConfig: PathConfig;
  nodeIdMap: Record<string, string>;
  edgeIdMap: Record<string, string>;
} => {
  const now = new Date().toISOString();
  const idPrefix =
    typeof options?.idPrefix === 'string' && options.idPrefix.trim().length > 0
      ? `${options.idPrefix.trim()}_`
      : '';
  const offset = options?.positionOffset ?? { x: 56, y: 56 };

  const existingNodeIds = new Set<string>(
    (targetConfig.nodes ?? []).map((node: AiNode): string => node.id)
  );
  const existingEdgeIds = new Set<string>(
    (targetConfig.edges ?? []).map((edge: Edge): string => edge.id)
  );
  const nodeIdMap: Record<string, string> = {};
  const edgeIdMap: Record<string, string> = {};

  const appendedNodes = subgraph.nodes.map((node: SemanticNode): AiNode => {
    const remappedId = createNodeInstanceId(existingNodeIds);
    nodeIdMap[node.id] = remappedId;
    const semanticNodeTypeId = resolveSemanticIdentityValue(node, 'nodeTypeId');
    const resolvedNodeTypeId =
      semanticNodeTypeId.length > 0
        ? semanticNodeTypeId
        : resolveNodeTypeId({
          type: node.type,
          title: node.title,
          config: node.config as AiNode['config'] | undefined,
        });
    return {
      id: remappedId,
      instanceId: remappedId,
      nodeTypeId: resolvedNodeTypeId,
      type: node.type,
      title: node.title,
      description: node.description,
      position: {
        x: node.position.x + offset.x,
        y: node.position.y + offset.y,
      },
      inputs: node.inputs,
      outputs: node.outputs,
      ...(node.config && typeof node.config === 'object'
        ? { config: node.config as AiNode['config'] }
        : {}),
      ...(node.data && typeof node.data === 'object' ? { data: node.data } : {}),
      createdAt: now,
      updatedAt: null,
    };
  });

  const appendedEdges = subgraph.edges
    .filter((edge: SemanticEdge): boolean =>
      Boolean(nodeIdMap[edge.fromNodeId] && nodeIdMap[edge.toNodeId])
    )
    .map((edge: SemanticEdge): Edge => {
      const remappedId = resolveUniqueId(`${idPrefix}${edge.id}`, existingEdgeIds);
      edgeIdMap[edge.id] = remappedId;
      const fromNodeId = nodeIdMap[edge.fromNodeId] as string;
      const toNodeId = nodeIdMap[edge.toNodeId] as string;
      return {
        id: remappedId,
        from: fromNodeId,
        to: toNodeId,
        ...(typeof edge.fromPort === 'string' || edge.fromPort === null
          ? {
            fromPort: edge.fromPort,
          }
          : {}),
        ...(typeof edge.toPort === 'string' || edge.toPort === null
          ? {
            toPort: edge.toPort,
          }
          : {}),
        ...(typeof edge.label === 'string' || edge.label === null ? { label: edge.label } : {}),
        ...(typeof edge.type === 'string' ? { type: edge.type } : {}),
        ...(edge.data && typeof edge.data === 'object' ? { data: edge.data } : {}),
        createdAt: now,
        updatedAt: null,
      };
    });

  const pathConfig: PathConfig = {
    ...targetConfig,
    nodes: [...(targetConfig.nodes ?? []), ...appendedNodes],
    edges: [...(targetConfig.edges ?? []), ...appendedEdges],
    updatedAt: now,
    uiState: {
      selectedNodeId: appendedNodes[0]?.id ?? targetConfig.uiState?.selectedNodeId ?? null,
      configOpen: targetConfig.uiState?.configOpen ?? false,
    },
  };

  return {
    pathConfig,
    nodeIdMap,
    edgeIdMap,
  };
};

export const applyParsedSemanticSubgraphToPathConfig = (
  targetConfig: PathConfig,
  input: unknown,
  options?: ApplySemanticSubgraphOptions
):
  | {
      ok: true;
      value: {
        pathConfig: PathConfig;
        nodeIdMap: Record<string, string>;
        edgeIdMap: Record<string, string>;
      };
    }
  | { ok: false; error: string } => {
  const parsed = parseSemanticSubgraphDocument(input);
  if (!parsed.ok) return parsed;
  return {
    ok: true,
    value: applySemanticSubgraphToPathConfig(targetConfig, parsed.value, options),
  };
};

export const summarizeSubgraphBoundary = (
  subgraph: SubgraphSemanticDocument
): {
  incomingCount: number;
  outgoingCount: number;
} => ({
  incomingCount: subgraph.boundary.incoming.length,
  outgoingCount: subgraph.boundary.outgoing.length,
});

export const findSubgraphDanglingEdges = (pathConfig: PathConfig): string[] =>
  (pathConfig.edges ?? [])
    .filter((edge: Edge): boolean => {
      const fromNodeId = resolveEdgeFromNodeId(edge);
      const toNodeId = resolveEdgeToNodeId(edge);
      if (!fromNodeId || !toNodeId) return true;
      const nodeIds = new Set<string>(
        (pathConfig.nodes ?? []).map((node: AiNode): string => node.id)
      );
      return !nodeIds.has(fromNodeId) || !nodeIds.has(toNodeId);
    })
    .map((edge: Edge): string => edge.id);
