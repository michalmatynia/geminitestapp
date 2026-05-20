import { type AiNode, type RuntimePortValues } from '@/shared/contracts/ai-paths';

export type BlockedNodeDiagnostic = {
  nodeId: string;
  nodeType: string;
  nodeTitle: string | null;
  blockedReason: string;
  message: string | null;
  requiredPorts: string[];
  waitingOnPorts: string[];
  waitingOnDetails: BlockedNodeWaitingDetail[];
};

type BlockedNodeWaitingDetail = {
  port: string;
  upstream: Array<{
    nodeId: string;
    nodeType: string | null;
    nodeTitle: string | null;
    sourcePort: string | null;
    status: string;
    output?: RuntimePortValues;
  }>;
};

export type FailedNodeDiagnostic = {
  nodeId: string;
  nodeType: string;
  nodeTitle: string | null;
  message: string | null;
};

export type WaitingNodeDiagnostic = {
  nodeId: string;
  nodeType: string;
  nodeTitle: string | null;
  message: string | null;
  waitingOnPorts: string[];
};

export const normalizePortList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry: unknown): entry is string => typeof entry === 'string')
    .map((entry: string): string => entry.trim())
    .filter((entry: string): boolean => entry.length > 0);
};

const normalizeWaitingOnDetails = (
  value: unknown,
  outputs: Record<string, RuntimePortValues>
): BlockedNodeWaitingDetail[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry: unknown): BlockedNodeWaitingDetail | null => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
      const record = entry as Record<string, unknown>;
      const port = typeof record['port'] === 'string' ? record['port'].trim() : '';
      if (port.length === 0 || !Array.isArray(record['upstream'])) return null;
      const upstream = record['upstream']
        .map((upstreamEntry: unknown): BlockedNodeWaitingDetail['upstream'][number] | null => {
          if (!upstreamEntry || typeof upstreamEntry !== 'object' || Array.isArray(upstreamEntry)) {
            return null;
          }
          const upstreamRecord = upstreamEntry as Record<string, unknown>;
          const nodeId =
            typeof upstreamRecord['nodeId'] === 'string' ? upstreamRecord['nodeId'].trim() : '';
          const status =
            typeof upstreamRecord['status'] === 'string' ? upstreamRecord['status'].trim() : '';
          if (nodeId.length === 0 || status.length === 0) return null;
          return {
            nodeId,
            nodeType:
              typeof upstreamRecord['nodeType'] === 'string'
                ? upstreamRecord['nodeType'].trim()
                : null,
            nodeTitle:
              typeof upstreamRecord['nodeTitle'] === 'string'
                ? upstreamRecord['nodeTitle'].trim()
                : null,
            sourcePort:
              typeof upstreamRecord['sourcePort'] === 'string'
                ? upstreamRecord['sourcePort'].trim()
                : null,
            status,
            output: outputs[nodeId],
          };
        })
        .filter(
          (
            upstream
          ): upstream is BlockedNodeWaitingDetail['upstream'][number] => upstream !== null
        );
      return { port, upstream };
    })
    .filter((entry): entry is BlockedNodeWaitingDetail => entry !== null);
};

export const collectBlockedNodeDiagnostics = (
  nodes: AiNode[],
  outputs: Record<string, RuntimePortValues> | undefined
): BlockedNodeDiagnostic[] => {
  if (!outputs) return [];
  const nodeById = new Map<string, AiNode>(nodes.map((node: AiNode) => [node.id, node]));
  return Object.entries(outputs)
    .map(([nodeId, value]): BlockedNodeDiagnostic | null => {
      const status =
        typeof value?.['status'] === 'string' ? value['status'].trim().toLowerCase() : '';
      if (status !== 'blocked') return null;
      const node = nodeById.get(nodeId);
      const blockedReason =
        typeof value['blockedReason'] === 'string' && value['blockedReason'].trim().length > 0
          ? value['blockedReason'].trim()
          : typeof value['skipReason'] === 'string' && value['skipReason'].trim().length > 0
            ? value['skipReason'].trim()
            : 'blocked';
      const message =
        typeof value['message'] === 'string' && value['message'].trim().length > 0
          ? value['message'].trim()
          : null;
      return {
        nodeId,
        nodeType: node?.type ?? 'unknown',
        nodeTitle: node?.title ?? null,
        blockedReason,
        message,
        requiredPorts: normalizePortList(value['requiredPorts']),
        waitingOnPorts: normalizePortList(value['waitingOnPorts']),
        waitingOnDetails: normalizeWaitingOnDetails(value['waitingOnDetails'], outputs),
      };
    })
    .filter((entry: BlockedNodeDiagnostic | null): entry is BlockedNodeDiagnostic =>
      Boolean(entry)
    );
};

const buildCompletedUpstreamMissingOutputMessage = (
  diagnostic: BlockedNodeDiagnostic
): string | null => {
  const nodeTitle = diagnostic.nodeTitle ?? diagnostic.nodeId;
  for (const detail of diagnostic.waitingOnDetails) {
    const completedUpstream = detail.upstream.find((upstream) => {
      const status = upstream.status.trim().toLowerCase();
      return (status === 'completed' || status === 'cached') && upstream.sourcePort !== null;
    });
    const sourcePort = completedUpstream?.sourcePort ?? null;
    if (sourcePort === null) continue;
    const upstreamTitle = completedUpstream?.nodeTitle ?? completedUpstream?.nodeId ?? 'upstream node';
    const upstreamErrors = normalizePortList(completedUpstream?.output?.['errors']);
    const upstreamValid = completedUpstream?.output?.['valid'];
    if (upstreamErrors.length > 0 || upstreamValid === false) {
      const errorDetail =
        upstreamErrors.length > 0 ? `: ${upstreamErrors.join('; ')}` : '.';
      return `Run blocked by ${nodeTitle}: ${upstreamTitle} rejected its input${errorDetail}`;
    }
    return `Run blocked by ${nodeTitle}: ${upstreamTitle} completed without output "${sourcePort}" required for input "${detail.port}". Check the model output and mapper schema.`;
  }
  return null;
};

export const buildBlockedRunFailureMessage = (blockedNodes: BlockedNodeDiagnostic[]): string => {
  const [first] = blockedNodes;
  if (!first) {
    return 'Run blocked: one or more nodes are missing required inputs.';
  }
  const upstreamMissingOutputMessage = buildCompletedUpstreamMissingOutputMessage(first);
  if (upstreamMissingOutputMessage) {
    const suffix =
      blockedNodes.length > 1
        ? ` (+${blockedNodes.length - 1} more blocked node${blockedNodes.length === 2 ? '' : 's'})`
        : '';
    return `${upstreamMissingOutputMessage}${suffix}`;
  }
  const title = first.nodeTitle ?? first.nodeId;
  const waiting =
    first.waitingOnPorts.length > 0 ? ` (waiting on: ${first.waitingOnPorts.join(', ')})` : '';
  const suffix =
    blockedNodes.length > 1
      ? ` (+${blockedNodes.length - 1} more blocked node${blockedNodes.length === 2 ? '' : 's'})`
      : '';
  return `Run blocked by ${title}${waiting}${suffix}.`;
};

export const collectWaitingNodeDiagnostics = (
  nodes: AiNode[],
  outputs: Record<string, RuntimePortValues> | undefined
): WaitingNodeDiagnostic[] => {
  if (!outputs) return [];
  const nodeById = new Map<string, AiNode>(nodes.map((node: AiNode) => [node.id, node]));
  return Object.entries(outputs)
    .map(([nodeId, value]): WaitingNodeDiagnostic | null => {
      const status =
        typeof value?.['status'] === 'string' ? value['status'].trim().toLowerCase() : '';
      if (status !== 'waiting_callback' && status !== 'advance_pending') return null;
      const node = nodeById.get(nodeId);
      const message =
        typeof value['message'] === 'string' && value['message'].trim().length > 0
          ? value['message'].trim()
          : null;
      return {
        nodeId,
        nodeType: node?.type ?? 'unknown',
        nodeTitle: node?.title ?? null,
        message,
        waitingOnPorts: normalizePortList(value['waitingOnPorts']),
      };
    })
    .filter((entry: WaitingNodeDiagnostic | null): entry is WaitingNodeDiagnostic =>
      Boolean(entry)
    );
};

export const buildWaitingNodeFailureMessage = (waitingNodes: WaitingNodeDiagnostic[]): string => {
  const [first] = waitingNodes;
  if (!first) {
    return 'Run failed while waiting for asynchronous node completion.';
  }
  const title = first.nodeTitle ?? first.nodeId;
  const waiting =
    first.waitingOnPorts.length > 0 ? ` (waiting on: ${first.waitingOnPorts.join(', ')})` : '';
  const detail = first.message ? ` ${first.message}` : '';
  const suffix =
    waitingNodes.length > 1
      ? ` (+${waitingNodes.length - 1} more waiting node${waitingNodes.length === 2 ? '' : 's'})`
      : '';
  return `Run failed while waiting at ${title}${waiting}.${detail}${suffix}`.trim();
};

export const collectFailedNodeDiagnostics = (
  nodes: AiNode[],
  outputs: Record<string, RuntimePortValues> | undefined
): FailedNodeDiagnostic[] => {
  if (!outputs) return [];
  const nodeById = new Map<string, AiNode>(nodes.map((node: AiNode) => [node.id, node]));
  return Object.entries(outputs)
    .map(([nodeId, value]): FailedNodeDiagnostic | null => {
      const status =
        typeof value?.['status'] === 'string' ? value['status'].trim().toLowerCase() : '';
      if (status !== 'failed') return null;
      const node = nodeById.get(nodeId);
      const message =
        typeof value?.['error'] === 'string' && value['error'].trim().length > 0
          ? value['error'].trim()
          : typeof value?.['message'] === 'string' && value['message'].trim().length > 0
            ? value['message'].trim()
            : null;
      return {
        nodeId,
        nodeType: node?.type ?? 'unknown',
        nodeTitle: node?.title ?? null,
        message,
      };
    })
    .filter((entry: FailedNodeDiagnostic | null): entry is FailedNodeDiagnostic => Boolean(entry));
};

export const buildFailedRunFailureMessage = (failedNodes: FailedNodeDiagnostic[]): string => {
  const [first] = failedNodes;
  if (!first) {
    return 'Run failed: one or more required processing nodes failed.';
  }
  const title = first.nodeTitle ?? first.nodeId;
  const detail = first.message ? ` (${first.message})` : '';
  const suffix =
    failedNodes.length > 1
      ? ` (+${failedNodes.length - 1} more failed node${failedNodes.length === 2 ? '' : 's'})`
      : '';
  return `Run failed at ${title}${detail}${suffix}.`;
};

export const shouldFailBlockedRun = (args: {
  runBlocked: boolean;
  blockedRunPolicy: 'fail_run' | 'complete_with_warning';
  nodeValidationEnabled: boolean;
}): boolean =>
  args.runBlocked && args.nodeValidationEnabled && args.blockedRunPolicy === 'fail_run';
