import type { AiNode, Edge, RuntimeHistoryLink } from '@/shared/contracts/ai-paths';
import type { RuntimePortValues } from '@/shared/contracts/ai-paths-runtime';

import { getNodeInputPortContract, coerceInput, normalizePortName } from '../../utils';

type NodeInputReadiness = {
  ready: boolean;
  requiredPorts: string[];
  optionalPorts: string[];
  waitingOnPorts: string[];
  waitingOnDetails: Array<{
    port: string;
    upstream: Array<{
      nodeId: string;
      nodeType: string | null;
      nodeTitle: string | null;
      sourcePort: string | null;
      status: string;
      blockedReason?: string;
      waitingOnPorts?: string[];
    }>;
  }>;
};

const TRANSIENT_UPSTREAM_WAIT_STATUSES = new Set<string>([
  'pending',
  'queued',
  'running',
  'processing',
  'polling',
  'waiting_callback',
  'advance_pending',
]);

const resolveEdgeNodeId = (value: string | undefined): string | null => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized.length > 0 ? normalized : null;
};

export const pickString = (val: unknown): string | undefined =>
  typeof val === 'string' && val.trim().length > 0 ? val.trim() : undefined;

export const readEntityTypeFromContext = (context: Record<string, unknown>): string | null => {
  const type = pickString(context['entityType']);
  if (type) return type;
  if (pickString(context['productId'])) return 'product';
  return null;
};

export const readEntityIdFromContext = (context: Record<string, unknown>): string | null =>
  pickString(context['productId']) ?? pickString(context['entityId']) ?? null;

export const resolveEdgeFromNodeId = (edge: Edge): string | null => resolveEdgeNodeId(edge.from);

export const resolveEdgeToNodeId = (edge: Edge): string | null => resolveEdgeNodeId(edge.to);

const resolveEdgePort = (value: string | null | undefined): string | null => {
  const normalized = typeof value === 'string' ? normalizePortName(value) : '';
  return normalized.length > 0 ? normalized : null;
};

export const resolveEdgeFromPort = (edge: Edge): string | null => resolveEdgePort(edge.fromPort);

export const resolveEdgeToPort = (edge: Edge): string | null => resolveEdgePort(edge.toPort);

export const checkContextMatchesSimulation = (context: Record<string, unknown>): boolean => {
  const contextSource = context['contextSource'];
  if (
    typeof contextSource === 'string' &&
    contextSource.trim().toLowerCase().startsWith('simulation')
  ) {
    return true;
  }
  const source = context['source'];
  if (typeof source === 'string' && source.trim().toLowerCase() === 'simulation') {
    return true;
  }
  return false;
};

export const hasValuableSimulationContext = (context: Record<string, unknown>): boolean => {
  return Boolean(readEntityIdFromContext(context) && readEntityTypeFromContext(context));
};

export const isSimulationCapableFetcher = (node: AiNode): boolean => {
  if (node.type !== 'fetcher') return false;
  const mode = node.config?.fetcher?.sourceMode;
  return mode === 'simulation_id' || mode === 'live_then_simulation';
};

export const hasMeaningfulValue = (value: unknown): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
};

export const orderNodesByDependencies = (nodes: AiNode[], edges: Edge[]): AiNode[] => {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  nodes.forEach((n) => {
    adj.set(n.id, []);
    inDegree.set(n.id, 0);
  });

  edges.forEach((e) => {
    const fromNodeId = resolveEdgeFromNodeId(e);
    const toNodeId = resolveEdgeToNodeId(e);
    if (!fromNodeId || !toNodeId) return;
    if (nodeById.has(fromNodeId) && nodeById.has(toNodeId)) {
      adj.get(fromNodeId)?.push(toNodeId);
      inDegree.set(toNodeId, (inDegree.get(toNodeId) ?? 0) + 1);
    }
  });

  const queue: string[] = [];
  inDegree.forEach((degree, id) => {
    if (degree === 0) queue.push(id);
  });

  const result: AiNode[] = [];
  while (queue.length > 0) {
    const u = queue.shift()!;
    const node = nodeById.get(u);
    if (node) result.push(node);

    adj.get(u)?.forEach((v) => {
      const nextDegree = (inDegree.get(v) ?? 0) - 1;
      inDegree.set(v, nextDegree);
      if (nextDegree === 0) queue.push(v);
    });
  }

  if (result.length !== nodes.length) {
    const missing = nodes.filter((n) => !result.find((r) => r.id === n.id));
    return [...result, ...missing];
  }

  return result;
};

export const buildInputLinks = (
  nodeId: string,
  edges: Edge[],
  nodeById: Map<string, AiNode>,
  nodeInputs: Record<string, unknown>
): RuntimeHistoryLink[] => {
  const incoming = edges.filter((e) => resolveEdgeToNodeId(e) === nodeId);
  const hasInputs = Object.keys(nodeInputs).length > 0;
  return incoming
    .map((edge: Edge): RuntimeHistoryLink | null => {
      const fromNodeId = resolveEdgeFromNodeId(edge);
      if (!fromNodeId) return null;
      const toPort = resolveEdgeToPort(edge);
      const isPresent = toPort ? nodeInputs[toPort] !== undefined : hasInputs;
      if (!isPresent) return null;
      const fromNode = nodeById.get(fromNodeId);
      return {
        nodeId: fromNodeId,
        nodeType: fromNode?.type ?? null,
        nodeTitle: fromNode?.title ?? null,
        fromPort: resolveEdgeFromPort(edge),
        toPort,
      };
    })
    .filter((link: RuntimeHistoryLink | null): link is RuntimeHistoryLink => Boolean(link));
};

export const buildOutputLinks = (
  nodeId: string,
  edges: Edge[],
  nodeById: Map<string, AiNode>,
  nodeOutputs: Record<string, unknown>
): RuntimeHistoryLink[] => {
  const outgoing = edges.filter((e) => resolveEdgeFromNodeId(e) === nodeId);
  const hasOutputs = Object.keys(nodeOutputs).length > 0;
  return outgoing
    .map((edge: Edge): RuntimeHistoryLink | null => {
      const toNodeId = resolveEdgeToNodeId(edge);
      if (!toNodeId) return null;
      const fromPort = resolveEdgeFromPort(edge);
      const isPresent = fromPort ? nodeOutputs[fromPort] !== undefined : hasOutputs;
      if (!isPresent) return null;
      const toNode = nodeById.get(toNodeId);
      return {
        nodeId: toNodeId,
        nodeType: toNode?.type ?? null,
        nodeTitle: toNode?.title ?? null,
        fromPort,
        toPort: resolveEdgeToPort(edge),
      };
    })
    .filter((link: RuntimeHistoryLink | null): link is RuntimeHistoryLink => Boolean(link));
};

export const resolveConfiguredRequiredInputPorts = (
  node: AiNode,
  connectedPorts: Set<string>
): string[] => {
  const configuredPorts = new Set<string>([
    ...Object.keys(node.inputContracts ?? {}),
    ...Object.keys(node.config?.runtime?.inputContracts ?? {}),
    ...Array.from(connectedPorts),
  ]);
  (node.inputs ?? []).forEach((port: string): void => {
    configuredPorts.add(port);
  });
  const explicitRequired = Array.from(configuredPorts).filter(
    (port: string): boolean => getNodeInputPortContract(node, port).required === true
  );
  return explicitRequired;
};

const PROMPT_TEMPLATE_TOKEN_PATTERN = /{{\s*([^}]+)\s*}}|\[\s*([A-Za-z0-9_.$:-]+)\s*\]/g;

const resolvePromptTemplateRequiredPorts = (
  template: string,
  connectedPorts: Set<string>
): string[] => {
  if (!template.trim()) return [];

  const requiredPorts = new Set<string>();
  for (const match of template.matchAll(PROMPT_TEMPLATE_TOKEN_PATTERN)) {
    const rawToken = String(match[1] ?? match[2] ?? '').trim();
    if (!rawToken) continue;
    const topLevelToken = normalizePortName(rawToken.split('.')[0] ?? rawToken);
    if (!topLevelToken || !connectedPorts.has(topLevelToken)) continue;
    requiredPorts.add(topLevelToken);
  }

  return Array.from(requiredPorts);
};

export const buildWaitingOnDetails = (
  _node: AiNode,
  waitingPorts: Set<string>,
  incomingEdges: Edge[],
  nodeById: Map<string, AiNode>,
  nodeStatusGetter: (id: string) => string,
  nodeOutputsGetter: (id: string) => Record<string, unknown>
): NodeInputReadiness['waitingOnDetails'] => {
  if (waitingPorts.size === 0) return [];
  const detailsByPort = new Map<
    string,
    {
      port: string;
      upstream: Array<{
        nodeId: string;
        nodeType: string | null;
        nodeTitle: string | null;
        sourcePort: string | null;
        status: string;
        blockedReason?: string;
        waitingOnPorts?: string[];
      }>;
    }
  >();

  waitingPorts.forEach((port) => {
    detailsByPort.set(port, { port, upstream: [] });
  });

  incomingEdges.forEach((edge) => {
    const port = resolveEdgeToPort(edge);
    if (!port || !waitingPorts.has(port)) return;
    const detail = detailsByPort.get(port);
    if (!detail) return;

    const sourceNodeId = resolveEdgeFromNodeId(edge);
    if (!sourceNodeId) return;
    const sourceNode = nodeById.get(sourceNodeId);
    const status = nodeStatusGetter(sourceNodeId);
    const sourceOutputs = nodeOutputsGetter(sourceNodeId);
    const rawWaitingOnPorts = sourceOutputs['waitingOnPorts'];

    detail.upstream.push({
      nodeId: sourceNodeId,
      nodeType: sourceNode?.type ?? null,
      nodeTitle: sourceNode?.title ?? null,
      sourcePort: resolveEdgeFromPort(edge),
      status,
      ...(typeof sourceOutputs['blockedReason'] === 'string'
        ? { blockedReason: sourceOutputs['blockedReason'] }
        : {}),
      ...(Array.isArray(rawWaitingOnPorts)
        ? {
          waitingOnPorts: rawWaitingOnPorts
            .filter((p: unknown): p is string => typeof p === 'string')
            .map((p: string): string => p.trim())
            .filter((p: string): boolean => p.length > 0),
        }
        : {}),
    });
  });

  return Array.from(detailsByPort.values()).map((detail) => ({
    ...detail,
    upstream: detail.upstream.sort((left, right) => left.nodeId.localeCompare(right.nodeId)),
  }));
};

export const resolveMissingInputStatus = (input: {
  waitingOnDetails: Array<{
    upstream: Array<{
      status: string;
      blockedReason?: string;
      waitingOnPorts?: string[];
    }>;
  }>;
}): 'blocked' | 'waiting_callback' => {
  const hasTransientUpstream = input.waitingOnDetails.some((detail) =>
    detail.upstream.some((upstream) => {
      const status = upstream.status.trim().toLowerCase();
      if (TRANSIENT_UPSTREAM_WAIT_STATUSES.has(status)) {
        return true;
      }
      if (status !== 'blocked') {
        return false;
      }
      const blockedReason =
        typeof upstream.blockedReason === 'string'
          ? upstream.blockedReason.trim().toLowerCase()
          : '';
      const hasWaitingPorts =
        Array.isArray(upstream.waitingOnPorts) &&
        upstream.waitingOnPorts.some(
          (port: unknown): boolean => typeof port === 'string' && port.trim().length > 0
        );
      return blockedReason === 'missing_inputs' || hasWaitingPorts;
    })
  );
  return hasTransientUpstream ? 'waiting_callback' : 'blocked';
};

export const evaluateInputReadiness = (
  node: AiNode,
  rawInputs: RuntimePortValues,
  incomingEdges: Edge[],
  nodeById: Map<string, AiNode>,
  nodeStatusGetter: (id: string) => string,
  nodeOutputsGetter: (id: string) => Record<string, unknown>
): NodeInputReadiness => {
  const buildWaitingDetails = (ports: Set<string>) =>
    buildWaitingOnDetails(
      node,
      ports,
      incomingEdges,
      nodeById,
      nodeStatusGetter,
      nodeOutputsGetter
    );

  if (incomingEdges.length === 0) {
    const requiredPorts = resolveConfiguredRequiredInputPorts(node, new Set<string>());
    if (requiredPorts.length > 0) {
      const waitingOnPorts = requiredPorts.filter(
        (port: string): boolean => rawInputs[port] === undefined
      );
      return {
        ready: waitingOnPorts.length === 0,
        requiredPorts,
        optionalPorts: [],
        waitingOnPorts,
        waitingOnDetails: buildWaitingDetails(new Set(waitingOnPorts)),
      };
    }
    return {
      ready: true,
      requiredPorts: [],
      optionalPorts: [],
      waitingOnPorts: [],
      waitingOnDetails: [],
    };
  }

  const connectedPorts = new Set<string>();
  incomingEdges.forEach((edge: Edge) => {
    const port = resolveEdgeToPort(edge);
    if (port) connectedPorts.add(port);
  });
  const connectedPortList = Array.from(connectedPorts);

  if (connectedPorts.size === 0) {
    const requiredPorts = resolveConfiguredRequiredInputPorts(node, connectedPorts);
    if (requiredPorts.length > 0) {
      const waitingOnPorts = requiredPorts.filter(
        (port: string): boolean => rawInputs[port] === undefined
      );
      return {
        ready: waitingOnPorts.length === 0,
        requiredPorts,
        optionalPorts: [],
        waitingOnPorts,
        waitingOnDetails: buildWaitingDetails(new Set(waitingOnPorts)),
      };
    }
    return {
      ready: true,
      requiredPorts: [],
      optionalPorts: [],
      waitingOnPorts: [],
      waitingOnDetails: [],
    };
  }

  const explicitRequiredPorts = resolveConfiguredRequiredInputPorts(node, connectedPorts);

  if (node.type === 'prompt' && explicitRequiredPorts.length === 0) {
    const promptTemplate =
      typeof node.config?.prompt?.template === 'string' ? node.config.prompt.template.trim() : '';
    const templateRequiredPorts = resolvePromptTemplateRequiredPorts(
      promptTemplate,
      connectedPorts
    );
    const hasDynamicTemplateToken = /{{\s*([^}]+)\s*}}|\[\s*([A-Za-z0-9_.$:-]+)\s*\]/.test(
      promptTemplate
    );
    if (templateRequiredPorts.length > 0) {
      const requiredPortSet = new Set<string>(templateRequiredPorts);
      const optionalPorts = connectedPortList.filter(
        (port: string): boolean => !requiredPortSet.has(port)
      );
      const waitingOnPorts = templateRequiredPorts.filter(
        (port: string): boolean => rawInputs[port] === undefined
      );
      return {
        ready: waitingOnPorts.length === 0,
        requiredPorts: templateRequiredPorts,
        optionalPorts,
        waitingOnPorts,
        waitingOnDetails: buildWaitingDetails(new Set(waitingOnPorts)),
      };
    }

    const hasAnyConnectedValue = connectedPortList.some((port: string): boolean =>
      hasMeaningfulValue(coerceInput(rawInputs[port]))
    );

    if (hasAnyConnectedValue) {
      return {
        ready: true,
        requiredPorts: [],
        optionalPorts: connectedPortList,
        waitingOnPorts: [],
        waitingOnDetails: [],
      };
    }

    // Prompt nodes with upstream wiring should not execute on empty placeholder data.
    // Wait when there is no template or when the template depends on runtime tokens.
    if (!promptTemplate || hasDynamicTemplateToken) {
      const waitingOnPorts = new Set<string>(connectedPortList);
      return {
        ready: false,
        requiredPorts: connectedPortList,
        optionalPorts: [],
        waitingOnPorts: Array.from(waitingOnPorts),
        waitingOnDetails: buildWaitingDetails(waitingOnPorts),
      };
    }

    // Static templates are allowed to run without upstream values.
    return {
      ready: true,
      requiredPorts: [],
      optionalPorts: connectedPortList,
      waitingOnPorts: [],
      waitingOnDetails: [],
    };
  }

  const requiredPorts =
    explicitRequiredPorts.length > 0 ? explicitRequiredPorts : connectedPortList;
  const requiredPortSet = new Set(requiredPorts);
  const optionalPorts = connectedPortList.filter(
    (port: string): boolean => !requiredPortSet.has(port)
  );
  const waitingOnPorts = new Set<string>();

  const toReadiness = (ready: boolean): NodeInputReadiness => ({
    ready,
    requiredPorts,
    optionalPorts,
    waitingOnPorts: Array.from(waitingOnPorts),
    waitingOnDetails: buildWaitingDetails(waitingOnPorts),
  });

  if (explicitRequiredPorts.length > 0) {
    explicitRequiredPorts.forEach((port: string): void => {
      const value = rawInputs[port];
      if (value === undefined) {
        waitingOnPorts.add(port);
      }
    });
    if (waitingOnPorts.size > 0) {
      return toReadiness(false);
    }
  }

  if (node.type !== 'database') {
    requiredPorts.forEach((port: string): void => {
      if (rawInputs[port] === undefined) {
        waitingOnPorts.add(port);
      }
    });
    return toReadiness(waitingOnPorts.size === 0);
  }

  const dbConfig = node.config?.database ?? { operation: 'query' };
  const operation = dbConfig.operation ?? 'query';
  const hasAnyValue = (ports: string[]): boolean =>
    ports.some((port: string) => hasMeaningfulValue(coerceInput(rawInputs[port])));
  const anyConnected = (ports: string[]): boolean =>
    ports.some((port: string) => connectedPorts.has(port));
  const allConnectedHaveValues = (ports: string[]): boolean =>
    ports.every(
      (port: string) =>
        !connectedPorts.has(port) || hasMeaningfulValue(coerceInput(rawInputs[port]))
    );
  const markWaitingPorts = (ports: string[], connectedOnly: boolean): void => {
    ports.forEach((port: string): void => {
      if (connectedOnly && !connectedPorts.has(port)) return;
      if (!hasMeaningfulValue(coerceInput(rawInputs[port]))) {
        waitingOnPorts.add(port);
      }
    });
  };

  if (operation === 'query') {
    const queryPorts = ['aiQuery', 'query', 'queryCallback'];
    if (anyConnected(queryPorts) && !hasAnyValue(queryPorts)) {
      markWaitingPorts(queryPorts, true);
    }
    const nonQueryPorts = Array.from(connectedPorts).filter(
      (port: string) => !queryPorts.includes(port)
    );
    if (!allConnectedHaveValues(nonQueryPorts)) {
      markWaitingPorts(nonQueryPorts, true);
    }
    return toReadiness(waitingOnPorts.size === 0);
  }

  if (operation === 'delete') {
    const idPorts = ['entityId', 'productId', 'value'];
    if (anyConnected(idPorts) && !hasAnyValue(idPorts)) {
      markWaitingPorts(idPorts, true);
    }
    return toReadiness(waitingOnPorts.size === 0);
  }

  if (operation === 'insert') {
    const hasTemplatePayload = Boolean(dbConfig.query?.queryTemplate?.trim());
    if (hasTemplatePayload) {
      return toReadiness(true);
    }
    const payloadPorts = ['value', 'payload'];
    if (anyConnected(payloadPorts) && !hasAnyValue(payloadPorts)) {
      markWaitingPorts(payloadPorts, true);
    }
    return toReadiness(waitingOnPorts.size === 0);
  }

  if (operation === 'update' || operation === 'action') {
    const idPorts = ['entityId', 'productId'];
    if (anyConnected(idPorts) && !hasAnyValue(idPorts)) {
      markWaitingPorts(idPorts, true);
    }
    const payloadPorts = ['value', 'payload', 'params', 'query', 'queryCallback', 'aiQuery'];
    const mappings = Array.isArray(dbConfig.mappings) ? dbConfig.mappings : [];
    const sourcePorts = mappings
      .map((m) => m?.sourcePort)
      .filter((p): p is string => typeof p === 'string' && p.trim().length > 0);

    const allPayloadPorts = [...payloadPorts, ...sourcePorts];
    if (anyConnected(allPayloadPorts) && !hasAnyValue(allPayloadPorts)) {
      markWaitingPorts(allPayloadPorts, true);
    }
    return toReadiness(waitingOnPorts.size === 0);
  }

  return toReadiness(true);
};

export function collectNodeInputs(
  toNodeId: string,
  outputs: Record<string, RuntimePortValues>,
  incomingEdgesByNode: Map<string, Edge[]>
): RuntimePortValues {
  const incoming = incomingEdgesByNode.get(toNodeId) ?? [];
  const collected: RuntimePortValues = {};
  incoming.forEach((edge) => {
    const fromId = edge.from || edge.source;
    if (!fromId) return;
    const fromPort = edge.fromPort || 'result';
    const toPort = edge.toPort || 'value';
    const out = outputs[fromId];
    if (out?.[fromPort] !== undefined) {
      collected[toPort] = out[fromPort];
    }
  });
  return collected;
}
