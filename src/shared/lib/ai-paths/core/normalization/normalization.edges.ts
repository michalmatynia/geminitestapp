import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

import { FETCHER_INPUT_PORTS, FETCHER_OUTPUT_PORTS } from '../constants';
import { normalizePortName } from '../utils';

export type TriggerToFetcherMigrationResult = {
  nodes: AiNode[];
  edges: Edge[];
  changed: boolean;
  createdFetcherNodeIds: string[];
  rewiredEdgeIds: string[];
};

const LEGACY_TRIGGER_DATA_PORTS = ['context', 'meta', 'entityId', 'entityType'];
const LEGACY_TRIGGER_DATA_PORT_SET = new Set<string>(LEGACY_TRIGGER_DATA_PORTS);

const normalizeEdgePortName = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = normalizePortName(value).trim();
  return trimmed.length > 0 ? trimmed : null;
};

const createUniqueId = (base: string, usedIds: Set<string>): string => {
  if (!usedIds.has(base)) {
    usedIds.add(base);
    return base;
  }
  let suffix = 2;
  while (usedIds.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  const next = `${base}-${suffix}`;
  usedIds.add(next);
  return next;
};

const resolveFetcherForTrigger = (
  triggerNodeId: string,
  nodesById: Map<string, AiNode>,
  edges: Edge[]
): AiNode | null => {
  const candidateIds: string[] = [];
  edges.forEach((edge: Edge): void => {
    if (edge.from !== triggerNodeId || !edge.to) return;
    const target = nodesById.get(edge.to);
    if (target?.type !== 'fetcher') return;
    if (!candidateIds.includes(target.id)) {
      candidateIds.push(target.id);
    }
  });
  if (candidateIds.length === 0) return null;

  const pickScore = (fetcherId: string): number => {
    const hasSignalEdge = edges.some((edge: Edge): boolean => {
      if (edge.from !== triggerNodeId || edge.to !== fetcherId) return false;
      const fromPort =
        normalizeEdgePortName(edge.fromPort) ?? normalizeEdgePortName(edge.sourceHandle);
      const toPort = normalizeEdgePortName(edge.toPort) ?? normalizeEdgePortName(edge.targetHandle);
      const fromIsSignal = fromPort === 'trigger' || fromPort === null;
      const toIsSignal = toPort === 'trigger' || toPort === null;
      return fromIsSignal && toIsSignal;
    });
    return hasSignalEdge ? 1 : 0;
  };

  const sorted = candidateIds
    .map((id: string): { id: string; score: number } => ({ id, score: pickScore(id) }))
    .sort((left, right): number => {
      if (left.score !== right.score) return right.score - left.score;
      return left.id.localeCompare(right.id);
    });
  const winner = sorted[0];
  if (!winner) return null;
  return nodesById.get(winner.id) ?? null;
};

export const migrateTriggerToFetcherGraph = (
  rawNodes: AiNode[],
  rawEdges: Edge[]
): TriggerToFetcherMigrationResult => {
  const nodes = rawNodes.map((node: AiNode): AiNode => ({ ...node }));
  const edges = rawEdges.map((edge: Edge): Edge => ({ ...edge }));
  const nodeById = new Map(nodes.map((node: AiNode): [string, AiNode] => [node.id, node]));
  const usedNodeIds = new Set<string>(nodes.map((node: AiNode): string => node.id));
  const usedEdgeIds = new Set<string>(
    edges
      .map((edge: Edge): string | undefined => edge.id)
      .filter((edgeId: string | undefined): edgeId is string => Boolean(edgeId))
  );
  const createdFetcherNodeIds: string[] = [];
  const rewiredEdgeIds: string[] = [];
  const rewiredEdgeIdSet = new Set<string>();
  let changed = false;

  const triggerNodes = nodes.filter((node: AiNode): boolean => node.type === 'trigger');
  triggerNodes.forEach((triggerNode: AiNode): void => {
    const legacyDataEdges = edges.filter((edge: Edge): boolean => {
      if (edge.from !== triggerNode.id || !edge.to) return false;
      const targetNode = nodeById.get(edge.to);
      if (!targetNode || targetNode.type === 'fetcher') return false;
      const fromPort =
        normalizeEdgePortName(edge.fromPort) ?? normalizeEdgePortName(edge.sourceHandle);
      const toPort = normalizeEdgePortName(edge.toPort) ?? normalizeEdgePortName(edge.targetHandle);
      if (fromPort && LEGACY_TRIGGER_DATA_PORT_SET.has(fromPort)) return true;
      if (!fromPort && (!toPort || LEGACY_TRIGGER_DATA_PORT_SET.has(toPort))) return true;
      return false;
    });
    if (legacyDataEdges.length === 0) return;

    let fetcherNode = resolveFetcherForTrigger(triggerNode.id, nodeById, edges);
    if (!fetcherNode) {
      const fetcherId = createUniqueId(
        `node-fetcher-${triggerNode.id.replace(/^node-/, '')}`,
        usedNodeIds
      );
      const triggerPosition = triggerNode.position ?? { x: 0, y: 0 };
      const triggerLabel =
        typeof triggerNode.title === 'string'
          ? triggerNode.title.replace(/^Trigger:\s*/i, '').trim()
          : '';
      const title = triggerLabel ? `Fetcher: ${triggerLabel}` : 'Fetcher: Trigger Context';
      const createdAt =
        typeof triggerNode.createdAt === 'string' && triggerNode.createdAt.trim().length > 0
          ? triggerNode.createdAt
          : new Date().toISOString();
      fetcherNode = {
        id: fetcherId,
        createdAt,
        updatedAt: null,
        type: 'fetcher',
        title,
        description: 'Resolve live trigger context or fetch simulated entity by ID.',
        position: {
          x: triggerPosition.x + 320,
          y: triggerPosition.y,
        },
        data: {},
        inputs: FETCHER_INPUT_PORTS,
        outputs: FETCHER_OUTPUT_PORTS,
        inputContracts: {
          trigger: { required: true },
          context: { required: false },
          meta: { required: false },
          entityId: { required: false },
          entityType: { required: false },
        },
        config: {
          fetcher: {
            sourceMode: 'live_context',
            entityType: 'product',
            entityId: '',
            productId: '',
          },
          runtime: {
            waitForInputs: true,
            inputContracts: {
              trigger: { required: true },
              context: { required: false },
              meta: { required: false },
              entityId: { required: false },
              entityType: { required: false },
            },
          },
        },
      };
      nodes.push(fetcherNode);
      nodeById.set(fetcherNode.id, fetcherNode);
      createdFetcherNodeIds.push(fetcherNode.id);
      changed = true;
    }

    const hasSignalEdge = edges.some((edge: Edge): boolean => {
      if (edge.from !== triggerNode.id || edge.to !== fetcherNode?.id) return false;
      const fromPort =
        normalizeEdgePortName(edge.fromPort) ?? normalizeEdgePortName(edge.sourceHandle);
      const toPort = normalizeEdgePortName(edge.toPort) ?? normalizeEdgePortName(edge.targetHandle);
      const fromIsSignal = fromPort === 'trigger' || fromPort === null;
      const toIsSignal = toPort === 'trigger' || toPort === null;
      return fromIsSignal && toIsSignal;
    });
    if (!hasSignalEdge) {
      const edgeId = createUniqueId(`edge-${triggerNode.id}-to-${fetcherNode.id}`, usedEdgeIds);
      edges.push({
        id: edgeId,
        from: triggerNode.id,
        to: fetcherNode.id,
        fromPort: 'trigger',
        toPort: 'trigger',
      });
      changed = true;
    }

    legacyDataEdges.forEach((edge: Edge): void => {
      const targetNode = edge.to ? nodeById.get(edge.to) : null;
      if (!targetNode) return;
      const currentFromPort =
        normalizeEdgePortName(edge.fromPort) ?? normalizeEdgePortName(edge.sourceHandle);
      const currentToPort =
        normalizeEdgePortName(edge.toPort) ?? normalizeEdgePortName(edge.targetHandle);
      let migratedPort =
        currentFromPort && LEGACY_TRIGGER_DATA_PORT_SET.has(currentFromPort)
          ? currentFromPort
          : currentToPort && LEGACY_TRIGGER_DATA_PORT_SET.has(currentToPort)
            ? currentToPort
            : 'context';
      if (!targetNode.inputs.includes(migratedPort)) {
        const firstMatchingPort = LEGACY_TRIGGER_DATA_PORTS.find((port: string): boolean =>
          targetNode.inputs.includes(port)
        );
        if (firstMatchingPort) {
          migratedPort = firstMatchingPort;
        }
      }
      if (!targetNode.inputs.includes(migratedPort)) {
        return;
      }

      const nextFrom = fetcherNode.id;
      const nextFromPort = migratedPort;
      const nextToPort = migratedPort;
      const changedEdge =
        edge.from !== nextFrom || currentFromPort !== nextFromPort || currentToPort !== nextToPort;
      if (!changedEdge) return;

      edge.from = nextFrom;
      edge.source = nextFrom;
      edge.fromPort = nextFromPort;
      edge.sourceHandle = nextFromPort;
      edge.toPort = nextToPort;
      edge.targetHandle = nextToPort;
      changed = true;
      if (!rewiredEdgeIdSet.has(edge.id)) {
        rewiredEdgeIdSet.add(edge.id);
        rewiredEdgeIds.push(edge.id);
      }
    });
  });

  const dedupedEdges: Edge[] = [];
  const seenEdgeSignatures = new Set<string>();
  edges.forEach((edge: Edge): void => {
    const fromPort =
      normalizeEdgePortName(edge.fromPort) ?? normalizeEdgePortName(edge.sourceHandle) ?? '';
    const toPort =
      normalizeEdgePortName(edge.toPort) ?? normalizeEdgePortName(edge.targetHandle) ?? '';
    const signature = `${edge.from ?? ''}|${edge.to ?? ''}|${fromPort}|${toPort}`;
    if (seenEdgeSignatures.has(signature)) {
      changed = true;
      return;
    }
    seenEdgeSignatures.add(signature);
    dedupedEdges.push(edge);
  });

  return {
    nodes,
    edges: dedupedEdges,
    changed,
    createdFetcherNodeIds,
    rewiredEdgeIds,
  };
};
