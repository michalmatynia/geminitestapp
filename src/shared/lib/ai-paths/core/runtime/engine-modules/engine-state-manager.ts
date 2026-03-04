import { AiNode, NodeCacheScope } from '@/shared/contracts/ai-paths';
import {
  RuntimeHistoryEntry,
  RuntimePortValues,
  RuntimeState,
} from '@/shared/contracts/ai-paths-runtime';
import { cloneValue } from '../utils';
import { RuntimeProfileNodeStats, EvaluateGraphOptions } from './engine-types';

const DEFAULT_NODE_CACHE_SCOPE: NodeCacheScope = 'run';

export const resolveNodeCacheScope = (node: AiNode): NodeCacheScope => {
  const scope = node.config?.runtime?.cache?.scope;
  if (scope === 'run' || scope === 'activation' || scope === 'session') {
    return scope;
  }
  return DEFAULT_NODE_CACHE_SCOPE;
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
  effectiveCache: Map<string, RuntimePortValues> | null;

  constructor(
    private nodes: AiNode[],
    private executableNodeCount: number,
    options: EvaluateGraphOptions
  ) {
    this.outputs = options.seedOutputs ? cloneValue(options.seedOutputs) : {};
    this.skippedNodes = new Set(options.skipNodeIds ?? []);

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
          acc[node.id] = 'completed';
        } else if (this.blockedNodes.has(node.id)) {
          acc[node.id] = 'blocked';
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
