import { AiNode, Edge, NodeCacheScope } from '@/shared/contracts/ai-paths';
import {
  AiPathRuntimeNodeStatus,
  RuntimeHistoryEntry,
  RuntimePortValues,
  RuntimeState,
} from '@/shared/contracts/ai-paths-runtime';
import { cloneValue } from '../utils';
import { RuntimeProfileNodeStats, EvaluateGraphOptions } from './engine-types';

const DEFAULT_NODE_CACHE_SCOPE: NodeCacheScope = 'run';

const ALLOWED_DECLARED_NODE_STATUSES = new Set<AiPathRuntimeNodeStatus>([
  'idle',
  'queued',
  'running',
  'completed',
  'cached',
  'failed',
  'canceled',
  'skipped',
  'blocked',
  'pending',
  'processing',
  'polling',
  'waiting_callback',
  'advance_pending',
  'timeout',
]);

const resolveDeclaredNodeStatus = (
  outputs: RuntimePortValues | undefined
): AiPathRuntimeNodeStatus | null => {
  const rawStatus =
    typeof outputs?.['status'] === 'string' ? String(outputs['status']).trim().toLowerCase() : '';
  if (!rawStatus) return null;
  const normalized =
    rawStatus === 'cancelled'
      ? 'canceled'
      : rawStatus === 'advance_pending'
        ? 'waiting_callback'
        : rawStatus === 'error'
          ? 'failed'
          : rawStatus;
  return ALLOWED_DECLARED_NODE_STATUSES.has(normalized as AiPathRuntimeNodeStatus)
    ? (normalized as AiPathRuntimeNodeStatus)
    : null;
};

export const resolveNodeCacheScope = (node: AiNode): NodeCacheScope => {
  const scope = node.config?.runtime?.cache?.scope;
  if (scope === 'run' || scope === 'activation' || scope === 'session') {
    return scope;
  }
  return DEFAULT_NODE_CACHE_SCOPE;
};

const seedNodeAttemptsFromHistory = (
  seedHistory: Record<string, RuntimeHistoryEntry[]> | undefined,
  nodeAttemptMap: Map<string, number>
): void => {
  if (!seedHistory) return;
  Object.entries(seedHistory).forEach(([nodeId, entries]) => {
    if (!Array.isArray(entries) || entries.length === 0) return;
    const maxAttempt = entries.reduce((acc, entry) => {
      const attempt = typeof entry?.attempt === 'number' ? entry.attempt : 0;
      return Math.max(acc, attempt);
    }, 0);
    if (maxAttempt > 0) {
      nodeAttemptMap.set(nodeId, maxAttempt);
    }
  });
};

export class EngineStateManager {
  nodeStats = new Map<string, RuntimeProfileNodeStats>();
  inputs: Record<string, RuntimePortValues> = {};
  outputs: Record<string, RuntimePortValues>;
  variables: Record<string, unknown> = {};
  history = new Map<string, RuntimeHistoryEntry[]>();
  activeNodes = new Set<string>();
  finishedNodes = new Set<string>();
  errorNodes = new Set<string>();
  timeoutNodes = new Set<string>();
  blockedNodes = new Set<string>();
  skippedNodes: Set<string>;
  nodeHashes = new Map<string, string>();
  nodeDurationsMap = new Map<string, number>();
  nodeAttemptMap = new Map<string, number>();
  effectiveCache: Map<string, RuntimePortValues> | null;
  incomingEdgesByNode: Map<string, Edge[]>;

  constructor(
    private nodes: AiNode[],
    private executableNodeCount: number,
    options: EvaluateGraphOptions,
    incomingEdgesByNode: Map<string, Edge[]>
  ) {
    this.outputs = options.seedOutputs ? cloneValue(options.seedOutputs) : {};
    this.skippedNodes = new Set(options.skipNodeIds ?? []);
    this.incomingEdgesByNode = incomingEdgesByNode;
    seedNodeAttemptsFromHistory(options.seedHistory, this.nodeAttemptMap);

    // Auto-create an in-run cache Map when any node has cache mode enabled and no external cache
    // was provided.
    this.effectiveCache =
      options.cache ??
      (nodes.some(
        (n) => n.config?.runtime?.cache?.mode && n.config.runtime.cache.mode !== 'disabled'
      )
        ? new Map<string, RuntimePortValues>()
        : null);
  }

  getNodeAttempt(nodeId: string): number {
    return Math.max(1, this.nodeAttemptMap.get(nodeId) ?? 1);
  }

  incrementNodeAttempt(nodeId: string): number {
    const nextAttempt = (this.nodeAttemptMap.get(nodeId) ?? 0) + 1;
    this.nodeAttemptMap.set(nodeId, nextAttempt);
    return nextAttempt;
  }

  reserveNodeAttempt(nodeId: string): number {
    return this.incrementNodeAttempt(nodeId);
  }

  getOrCreateNodeStats(node: AiNode): RuntimeProfileNodeStats {
    let stats = this.nodeStats.get(node.id);
    if (!stats) {
      stats = {
        nodeId: node.id,
        nodeType: node.type,
        count: 0,
        totalMs: 0,
        maxMs: 0,
        cachedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        hashCount: 0,
        hashTotalMs: 0,
        hashMaxMs: 0,
      };
      this.nodeStats.set(node.id, stats);
    }
    return stats;
  }

  buildRuntimeStateSnapshot(inputsSnapshot: Record<string, RuntimePortValues>): RuntimeState {
    const nodeStatuses = this.nodes.reduce<Record<string, RuntimeState['nodeStatuses'][string]>>(
      (acc, node) => {
        if (this.errorNodes.has(node.id)) {
          acc[node.id] = this.timeoutNodes.has(node.id) ? 'timeout' : 'failed';
        } else if (this.skippedNodes.has(node.id)) {
          acc[node.id] = 'skipped';
        } else if (this.finishedNodes.has(node.id)) {
          acc[node.id] = resolveDeclaredNodeStatus(this.outputs[node.id]) ?? 'completed';
        } else if (this.blockedNodes.has(node.id)) {
          const blockedStatus =
            typeof this.outputs[node.id]?.['status'] === 'string'
              ? String(this.outputs[node.id]?.['status']).trim().toLowerCase()
              : 'blocked';
          acc[node.id] = blockedStatus === 'waiting_callback' ? 'waiting_callback' : 'blocked';
        } else if (this.activeNodes.has(node.id)) {
          acc[node.id] = 'running';
        } else {
          acc[node.id] = 'pending';
        }
        return acc;
      },
      {}
    );

    const outputsSnapshot = cloneValue(this.outputs);
    return {
      status:
        this.errorNodes.size > 0
          ? 'failed'
          : this.finishedNodes.size >= this.executableNodeCount
            ? 'completed'
            : 'running',
      nodeStatuses,
      nodeOutputs: outputsSnapshot,
      variables: cloneValue(this.variables),
      events: [],
      inputs: cloneValue(inputsSnapshot),
      outputs: outputsSnapshot,
      hashes: Object.fromEntries(this.nodeHashes),
      nodeDurations: this.nodeDurationsMap.size
        ? Object.fromEntries(this.nodeDurationsMap)
        : undefined,
      history: this.history.size
        ? (cloneValue(Object.fromEntries(this.history)) as Record<string, RuntimeHistoryEntry[]>)
        : undefined,
    };
  }
}
