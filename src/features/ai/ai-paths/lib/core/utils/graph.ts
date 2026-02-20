import type { AiNode, Edge, ConnectionValidation } from '@/shared/contracts/ai-paths';

import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MAX_SCALE,
  MIN_SCALE,
  PORT_STACK_TOP,
  PORT_GAP,
  PORT_COMPATIBILITY,
} from '../constants';
import {
  arePortTypesCompatible,
  formatPortDataTypes,
  getPortDataTypes,
} from './port-types';

export const getPortOffsetY = (index: number, _totalPorts: number): number => {
  return PORT_STACK_TOP + index * PORT_GAP;
};

export const normalizePortName = (port: string): string => {
  if (port === 'productJson') return 'entityJson';
  if (port === 'simulation') return 'context';
  return port;
};

export const isValidConnection = (
  from: AiNode,
  to: AiNode,
  fromPort?: string,
  toPort?: string
): boolean => {
  if (!fromPort || !toPort) return false;
  if (!from.outputs.includes(fromPort)) return false;
  if (!to.inputs.includes(toPort)) return false;

  const allowed = PORT_COMPATIBILITY[fromPort];
  const portCompatible = allowed?.includes(toPort) || fromPort === toPort;
  if (!portCompatible) return false;
  if (
    to.type === 'trigger' &&
    toPort === 'context' &&
    (from.type !== 'simulation' || (fromPort !== 'context' && fromPort !== 'simulation'))
  ) {
    return false;
  }
  if (to.type === 'simulation' && toPort === 'trigger') {
    if (from.type !== 'trigger' || fromPort !== 'trigger') return false;
  }
  const fromTypes = getPortDataTypes(fromPort);
  const toTypes = getPortDataTypes(toPort);
  return arePortTypesCompatible(fromTypes, toTypes);
};

export const sanitizeEdges = (nodes: AiNode[], edges: Edge[]): Edge[] => {
  const nodeMap = new Map(nodes.map((node: AiNode) => [node.id, node]));
  return edges.flatMap((edge: Edge) => {
    if (!edge.from || !edge.to) return [];
    const from = nodeMap.get(edge.from);
    const to = nodeMap.get(edge.to);
    if (!from || !to) return [];
    const fromPort = edge.fromPort ? normalizePortName(edge.fromPort) : undefined;
    const toPort = edge.toPort ? normalizePortName(edge.toPort) : undefined;
    if (fromPort && toPort) {
      if (isValidConnection(from, to, fromPort, toPort)) {
        return [
          {
            ...edge,
            fromPort,
            toPort,
          },
        ];
      }
      if (from.outputs.includes(toPort) && to.inputs.includes(toPort)) {
        return [
          {
            ...edge,
            fromPort: toPort,
            toPort,
          },
        ];
      }
      if (from.outputs.includes(fromPort) && to.inputs.includes(fromPort)) {
        return [
          {
            ...edge,
            fromPort,
            toPort: fromPort,
          },
        ];
      }
      return [];
    }
    const matches = from.outputs.filter((output: string) => to.inputs.includes(output));
    if (matches.length !== 1) return [];
    const port = matches[0];
    if (!port) return [];
    return [
      {
        ...edge,
        fromPort: port,
        toPort: port,
      },
    ];
  });
};

type GraphIntegrityIssue =
  | {
    kind: 'invalid_edge';
    count: number;
  }
  | {
    kind: 'disconnected_processing_node';
    nodeId: string;
    nodeType: string;
    nodeTitle: string;
  };

type GraphIntegrityReport = {
  issues: GraphIntegrityIssue[];
  invalidEdgeCount: number;
  disconnectedProcessingNodes: Array<{
    nodeId: string;
    nodeType: string;
    nodeTitle: string;
  }>;
};

const PROCESSING_NODE_TYPES = new Set<string>([
  'parser',
  'mapper',
  'mutator',
  'string_mutator',
  'template',
  'validator',
  'validation_pattern',
  'regex',
  'math',
  'compare',
  'router',
  'gate',
  'bundle',
  'prompt',
  'model',
  'agent',
  'learner_agent',
  'audio_oscillator',
  'audio_speaker',
  'iterator',
  'database',
  'poll',
  'http',
  'api_advanced',
]);

export const inspectGraphIntegrity = (nodes: AiNode[], edges: Edge[]): GraphIntegrityReport => {
  const sanitized = sanitizeEdges(nodes, edges);
  const invalidEdgeCount = Math.max(0, edges.length - sanitized.length);
  const nodeStats = new Map<string, { incoming: number; outgoing: number }>();
  nodes.forEach((node: AiNode) => {
    nodeStats.set(node.id, { incoming: 0, outgoing: 0 });
  });
  sanitized.forEach((edge: Edge) => {
    const fromNodeId = edge.from;
    const toNodeId = edge.to;
    const fromStats = fromNodeId ? nodeStats.get(fromNodeId) : undefined;
    if (fromStats) fromStats.outgoing += 1;
    const toStats = toNodeId ? nodeStats.get(toNodeId) : undefined;
    if (toStats) toStats.incoming += 1;
  });

  const disconnectedProcessingNodes = nodes
    .filter((node: AiNode): boolean => PROCESSING_NODE_TYPES.has(node.type))
    .filter((node: AiNode): boolean => {
      const stats = nodeStats.get(node.id);
      if (!stats) return false;
      return stats.incoming === 0 && stats.outgoing === 0;
    })
    .map((node: AiNode) => ({
      nodeId: node.id,
      nodeType: node.type,
      nodeTitle: node.title ?? node.id,
    }));

  const issues: GraphIntegrityIssue[] = [];
  if (invalidEdgeCount > 0) {
    issues.push({
      kind: 'invalid_edge',
      count: invalidEdgeCount,
    });
  }
  disconnectedProcessingNodes.forEach((node) => {
    issues.push({
      kind: 'disconnected_processing_node',
      nodeId: node.nodeId,
      nodeType: node.nodeType,
      nodeTitle: node.nodeTitle,
    });
  });

  return {
    issues,
    invalidEdgeCount,
    disconnectedProcessingNodes,
  };
};

export type PortCardinality = 'single' | 'many';

export type GraphCompileSeverity = 'error' | 'warning';

export type GraphCompileCode =
  | 'invalid_edges'
  | 'fan_in_single_port'
  | 'terminal_node_has_outgoing_edges'
  | 'cycle_detected'
  | 'unsupported_cycle'
  | 'unreachable_node';

export type GraphCompileFinding = {
  code: GraphCompileCode;
  severity: GraphCompileSeverity;
  message: string;
  nodeId?: string;
  nodeType?: string;
  port?: string;
  edgeId?: string;
  metadata?: Record<string, unknown>;
};

export type GraphCompileReport = {
  ok: boolean;
  errors: number;
  warnings: number;
  findings: GraphCompileFinding[];
};

export type GraphCompileOptions = {
  allowCycles?: boolean;
  allowedCycleNodeTypes?: string[];
  inputCardinalityByNodeType?: Record<string, Record<string, PortCardinality>>;
  inputCardinalityByNodeId?: Record<string, Record<string, PortCardinality>>;
};

const DEFAULT_ALLOWED_CYCLE_NODE_TYPES = new Set<string>([
  'iterator',
  'poll',
  'delay',
  'router',
  'gate',
  'trigger',
  'simulation',
]);

const getConfiguredInputCardinality = (
  node: AiNode,
  port: string,
  options: GraphCompileOptions
): PortCardinality => {
  const byNodeId = options.inputCardinalityByNodeId?.[node.id]?.[port];
  if (byNodeId === 'single' || byNodeId === 'many') return byNodeId;

  const byNodeType = options.inputCardinalityByNodeType?.[node.type]?.[port];
  if (byNodeType === 'single' || byNodeType === 'many') return byNodeType;

  const runtimeConfig = node.config?.runtime as
    | { inputCardinality?: Record<string, PortCardinality> }
    | undefined;
  const runtimePortCardinality = runtimeConfig?.inputCardinality?.[port];
  if (runtimePortCardinality === 'single' || runtimePortCardinality === 'many') {
    return runtimePortCardinality;
  }

  return 'single';
};

export const getNodeInputPortCardinality = (
  node: AiNode,
  port: string,
  options: GraphCompileOptions = {}
): PortCardinality => {
  return getConfiguredInputCardinality(node, port, options);
};

const buildIncomingEdgePortMap = (edges: Edge[]): Map<string, Edge[]> => {
  const map = new Map<string, Edge[]>();
  edges.forEach((edge: Edge): void => {
    if (!edge.to || !edge.toPort) return;
    const key = `${edge.to}::${edge.toPort}`;
    const existing = map.get(key) ?? [];
    existing.push(edge);
    map.set(key, existing);
  });
  return map;
};

const detectCycleNodes = (nodes: AiNode[], edges: Edge[]): Set<string> => {
  const indegree = new Map<string, number>();
  const adjacency = new Map<string, Set<string>>();
  const nodeIds = new Set(nodes.map((node: AiNode): string => node.id));

  nodes.forEach((node: AiNode): void => {
    indegree.set(node.id, 0);
  });

  edges.forEach((edge: Edge): void => {
    if (!edge.from || !edge.to) return;
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) return;
    const neighbors = adjacency.get(edge.from) ?? new Set<string>();
    if (!neighbors.has(edge.to)) {
      neighbors.add(edge.to);
      adjacency.set(edge.from, neighbors);
      indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
    }
  });

  const queue: string[] = [];
  indegree.forEach((value: number, nodeId: string): void => {
    if (value === 0) queue.push(nodeId);
  });

  const processed = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || processed.has(current)) continue;
    processed.add(current);
    const neighbors = adjacency.get(current);
    if (!neighbors) continue;
    neighbors.forEach((next: string): void => {
      const nextValue = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, nextValue);
      if (nextValue === 0) {
        queue.push(next);
      }
    });
  }

  const cycleNodes = new Set<string>();
  nodes.forEach((node: AiNode): void => {
    if (!processed.has(node.id)) {
      cycleNodes.add(node.id);
    }
  });
  return cycleNodes;
};

const detectReachableNodes = (nodes: AiNode[], edges: Edge[]): Set<string> => {
  if (nodes.length === 0) return new Set<string>();
  const nodeMap = new Map(nodes.map((node: AiNode): [string, AiNode] => [node.id, node]));
  const adjacency = new Map<string, Set<string>>();
  edges.forEach((edge: Edge): void => {
    if (!edge.from || !edge.to) return;
    if (!nodeMap.has(edge.from) || !nodeMap.has(edge.to)) return;
    const out = adjacency.get(edge.from) ?? new Set<string>();
    out.add(edge.to);
    adjacency.set(edge.from, out);
  });

  const roots = nodes.filter((node: AiNode): boolean => node.type === 'trigger');
  const fallbackRoots =
    roots.length > 0
      ? roots
      : nodes.filter((node: AiNode): boolean => {
        const hasIncoming = edges.some((edge: Edge): boolean => edge.to === node.id);
        return !hasIncoming;
      });

  const queue = fallbackRoots.map((node: AiNode): string => node.id);
  const reachable = new Set<string>(queue);
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const next = adjacency.get(current);
    if (!next) continue;
    next.forEach((target: string): void => {
      if (reachable.has(target)) return;
      reachable.add(target);
      queue.push(target);
    });
  }

  return reachable;
};

export const compileGraph = (
  nodes: AiNode[],
  edges: Edge[],
  options: GraphCompileOptions = {}
): GraphCompileReport => {
  const findings: GraphCompileFinding[] = [];
  const nodeById = new Map(nodes.map((node: AiNode): [string, AiNode] => [node.id, node]));
  const sanitized = sanitizeEdges(nodes, edges);
  const { invalidEdgeCount } = inspectGraphIntegrity(nodes, edges);

  if (invalidEdgeCount > 0) {
    findings.push({
      code: 'invalid_edges',
      severity: 'error',
      message: `${invalidEdgeCount} edge(s) are invalid or incompatible with declared ports.`,
      metadata: { invalidEdgeCount },
    });
  }

  const incomingByPort = buildIncomingEdgePortMap(sanitized);
  incomingByPort.forEach((portEdges: Edge[], key: string): void => {
    if (portEdges.length <= 1) return;
    const [nodeId, port] = key.split('::');
    if (!nodeId || !port) return;
    const node = nodeById.get(nodeId);
    if (!node) return;
    const cardinality = getConfiguredInputCardinality(node, port, options);
    if (cardinality === 'many') return;
    findings.push({
      code: 'fan_in_single_port',
      severity: 'error',
      message: `Port "${port}" on node "${node.title ?? node.id}" accepts only one incoming edge.`,
      nodeId: node.id,
      nodeType: node.type,
      port,
      metadata: {
        edgeIds: portEdges.map((edge: Edge): string => edge.id),
        incomingCount: portEdges.length,
      },
    });
  });

  const outgoingByNode = new Map<string, Edge[]>();
  edges.forEach((edge: Edge): void => {
    if (!edge.from) return;
    const current = outgoingByNode.get(edge.from) ?? [];
    current.push(edge);
    outgoingByNode.set(edge.from, current);
  });
  nodes.forEach((node: AiNode): void => {
    const outgoing = outgoingByNode.get(node.id) ?? [];
    if (node.outputs.length > 0 || outgoing.length === 0) return;
    findings.push({
      code: 'terminal_node_has_outgoing_edges',
      severity: 'error',
      message: `Terminal node "${node.title ?? node.id}" has outgoing edges but no output ports.`,
      nodeId: node.id,
      nodeType: node.type,
      metadata: { edgeIds: outgoing.map((edge: Edge): string => edge.id) },
    });
  });

  const cycleNodes = detectCycleNodes(nodes, sanitized);
  if (cycleNodes.size > 0) {
    const allowedCycleTypes = new Set<string>(
      options.allowedCycleNodeTypes && options.allowedCycleNodeTypes.length > 0
        ? options.allowedCycleNodeTypes
        : Array.from(DEFAULT_ALLOWED_CYCLE_NODE_TYPES)
    );
    const unsupportedNodes = Array.from(cycleNodes)
      .map((nodeId: string): AiNode | undefined => nodeById.get(nodeId))
      .filter((node: AiNode | undefined): node is AiNode => Boolean(node))
      .filter((node: AiNode): boolean => !allowedCycleTypes.has(node.type));

    if (unsupportedNodes.length > 0 && !options.allowCycles) {
      findings.push({
        code: 'unsupported_cycle',
        severity: 'error',
        message: `Cycle includes unsupported node types: ${unsupportedNodes
          .map((node: AiNode): string => `${node.title ?? node.id} (${node.type})`)
          .join(', ')}.`,
        metadata: {
          nodeIds: unsupportedNodes.map((node: AiNode): string => node.id),
          nodeTypes: unsupportedNodes.map((node: AiNode): string => node.type),
        },
      });
    } else {
      findings.push({
        code: 'cycle_detected',
        severity: 'warning',
        message: `Graph contains cycle(s) across ${cycleNodes.size} node(s).`,
        metadata: { nodeIds: Array.from(cycleNodes) },
      });
    }
  }

  const reachable = detectReachableNodes(nodes, sanitized);
  nodes.forEach((node: AiNode): void => {
    if (reachable.has(node.id)) return;
    const hasAnyEdge = sanitized.some(
      (edge: Edge): boolean => edge.from === node.id || edge.to === node.id
    );
    if (!hasAnyEdge) return;
    findings.push({
      code: 'unreachable_node',
      severity: 'warning',
      message: `Node "${node.title ?? node.id}" is not reachable from any trigger root.`,
      nodeId: node.id,
      nodeType: node.type,
    });
  });

  const errors = findings.filter(
    (finding: GraphCompileFinding): boolean => finding.severity === 'error'
  ).length;
  const warnings = findings.length - errors;
  return {
    ok: errors === 0,
    errors,
    warnings,
    findings,
  };
};

export const ensureUniquePorts = (ports: string[], add: string[]): string[] => {
  const set = new Set(ports.map(normalizePortName));
  add.forEach((port: string) => set.add(normalizePortName(port)));
  return Array.from(set);
};

export const createParserMappings = (outputs: string[]): Record<string, string> =>
  outputs.reduce<Record<string, string>>((acc: Record<string, string>, output: string) => {
    acc[output] = '';
    return acc;
  }, {});

export const createViewerOutputs = (inputs: string[]): Record<string, string> =>
  inputs.reduce<Record<string, string>>((acc: Record<string, string>, input: string) => {
    acc[input] = '';
    return acc;
  }, {});

export const validateConnection = (
  fromNode: AiNode,
  toNode: AiNode,
  fromPort: string,
  toPort: string
): ConnectionValidation => {
  if (!fromPort || !toPort) {
    return { valid: false, message: 'Invalid port selection.' };
  }
  if (!fromNode.outputs.includes(fromPort)) {
    return { valid: false, message: `Port ${fromPort} is not an output of this node.` };
  }
  if (!toNode.inputs.includes(toPort)) {
    return { valid: false, message: `Port ${toPort} is not an input of this node.` };
  }
  const allowed = PORT_COMPATIBILITY[fromPort];
  const portCompatible = allowed?.includes(toPort) || fromPort === toPort;
  if (!portCompatible) {
    return {
      valid: false,
      message: `Port ${fromPort} cannot connect to ${toPort}.`,
    };
  }
  const fromTypes = getPortDataTypes(fromPort);
  const toTypes = getPortDataTypes(toPort);
  const typeCompatible = arePortTypesCompatible(fromTypes, toTypes);
  if (!typeCompatible) {
    return {
      valid: false,
      message: `Type mismatch: ${fromPort} (${formatPortDataTypes(
        fromTypes
      )}) -> ${toPort} (${formatPortDataTypes(toTypes)}).`,
    };
  }
  if (toNode.type === 'trigger' && toPort === 'context') {
    if (fromNode.type !== 'simulation' || (fromPort !== 'context' && fromPort !== 'simulation')) {
      return {
        valid: false,
        message: 'Trigger \'context\' input must connect from Simulation \'context\'.',
      };
    }
  }
  if (toNode.type === 'simulation' && toPort === 'trigger') {
    if (fromNode.type !== 'trigger' || fromPort !== 'trigger') {
      return {
        valid: false,
        message: 'Simulation \'trigger\' input must connect from Trigger \'trigger\'.',
      };
    }
  }
  return { valid: true };
};

export const clampScale = (value: number): number =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

export const clampTranslate = (
  x: number,
  y: number,
  scale: number,
  _viewport: DOMRect | null
): { x: number; y: number } => {
  const minX = -CANVAS_WIDTH * scale + 200;
  const minY = -CANVAS_HEIGHT * scale + 200;
  const maxX = 300;
  const maxY = 300;

  return {
    x: Math.min(maxX, Math.max(minX, x)),
    y: Math.min(maxY, Math.max(minY, y)),
  };
};
