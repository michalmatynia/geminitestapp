import 'server-only';

import { repairRuntimeStatePorts } from '@/features/ai/ai-paths/services/runtime-state-port-repair';
import type {
  AiPathRunNodeRecord,
  AiPathRunRecord,
  AiPathRunRepository,
  RuntimeHistoryEntry,
  RuntimePortValues,
  RuntimeState,
} from '@/shared/contracts/ai-paths';

import { sanitizeRuntimeState } from '../path-run-executor.logic';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


export class PathRunRuntimeStateManager {
  private latestSnapshot: RuntimeState | null = null;
  private historyEntriesByNode = new Map<string, RuntimeHistoryEntry[]>();
  private nodeStatusOverrides = new Map<string, RuntimeState['nodeStatuses'][string]>();

  constructor(
    private run: AiPathRunRecord,
    private initialRuntimeState: RuntimeState,
    private accInputs: Record<string, RuntimePortValues>,
    private accOutputs: Record<string, RuntimePortValues>,
    private repo: AiPathRunRepository,
    private resolvedRunStartedAt: string
  ) {}

  setLatestSnapshot(snapshot: RuntimeState | null): void {
    this.latestSnapshot = snapshot;
  }

  appendHistoryEntry(nodeId: string, entry: RuntimeHistoryEntry): void {
    const entries = this.historyEntriesByNode.get(nodeId) ?? [];
    entries.push(entry);
    this.historyEntriesByNode.set(nodeId, entries);
  }

  setNodeStatus(nodeId: string, status: RuntimeState['nodeStatuses'][string]): void {
    this.nodeStatusOverrides.set(nodeId, status);
  }

  private async loadRunNodesForRuntimeRepair(): Promise<AiPathRunNodeRecord[]> {
    try {
      return await this.repo.listRunNodes(this.run.id);
    } catch (error) {
      void ErrorSystem.captureException(error);
      return [];
    }
  }

  async buildCurrentRuntimeStateSnapshot(): Promise<RuntimeState> {
    const currentRun = {
      ...this.run,
      status: 'running' as const,
      startedAt: this.resolvedRunStartedAt,
    };

    const statusFromLatest = this.latestSnapshot?.status ?? this.initialRuntimeState.status;
    const nodeStatusesFromLatest =
      this.latestSnapshot?.nodeStatuses ?? this.initialRuntimeState.nodeStatuses;
    const nodeOutputsFromLatest =
      this.latestSnapshot?.nodeOutputs ?? this.initialRuntimeState.nodeOutputs;
    const historyFromLatest = this.latestSnapshot?.history ?? this.initialRuntimeState.history;
    const hashesFromLatest = this.latestSnapshot?.hashes ?? this.initialRuntimeState.hashes;
    const hashTimestampsFromLatest =
      this.latestSnapshot?.hashTimestamps ?? this.initialRuntimeState.hashTimestamps;
    const nodeDurationsFromLatest =
      this.latestSnapshot?.nodeDurations ?? this.initialRuntimeState.nodeDurations;
    const mergedHistory = new Map<string, Map<string, RuntimeHistoryEntry>>();
    const buildHistoryEntryKey = (entry: RuntimeHistoryEntry): string =>
      entry.spanId ??
      [
        entry.traceId ?? '',
        entry.timestamp,
        entry.status,
        entry.attempt ?? '',
        entry.iteration,
      ].join(':');
    const appendHistory = (
      source: Record<string, RuntimeHistoryEntry[]> | undefined
    ): void => {
      if (!source) return;
      Object.entries(source).forEach(([nodeId, entries]) => {
        if (!Array.isArray(entries) || entries.length === 0) return;
        const existing = mergedHistory.get(nodeId) ?? new Map<string, RuntimeHistoryEntry>();
        entries.forEach((entry) => {
          existing.set(buildHistoryEntryKey(entry), entry);
        });
        mergedHistory.set(nodeId, existing);
      });
    };
    appendHistory(this.initialRuntimeState.history);
    appendHistory(historyFromLatest);
    this.historyEntriesByNode.forEach((entries, nodeId) => {
      if (!Array.isArray(entries) || entries.length === 0) return;
      const existing = mergedHistory.get(nodeId) ?? new Map<string, RuntimeHistoryEntry>();
      entries.forEach((entry) => {
        existing.set(buildHistoryEntryKey(entry), entry);
      });
      mergedHistory.set(nodeId, existing);
    });
    const mergedNodeStatuses: RuntimeState['nodeStatuses'] = {
      ...(nodeStatusesFromLatest ?? {}),
    };
    this.nodeStatusOverrides.forEach((status, nodeId) => {
      mergedNodeStatuses[nodeId] = status;
    });
      
    const candidate: RuntimeState = {
      status: statusFromLatest ?? 'running',
      currentRun,
      inputs: this.accInputs,
      outputs: this.accOutputs,
      nodeOutputs: nodeOutputsFromLatest ?? this.accOutputs,
      nodeStatuses: mergedNodeStatuses,
      history: mergedHistory.size
        ? Object.fromEntries(
          Array.from(mergedHistory.entries()).map(([nodeId, entries]) => [
            nodeId,
            Array.from(entries.values()),
          ])
        )
        : {},
      hashes: hashesFromLatest ?? {},
      hashTimestamps: hashTimestampsFromLatest ?? {},
      nodeDurations: nodeDurationsFromLatest ?? {},
      variables: this.latestSnapshot?.variables ?? this.initialRuntimeState.variables ?? {},
      events: this.latestSnapshot?.events ?? this.initialRuntimeState.events ?? [],
    };

    const repaired = repairRuntimeStatePorts({
      runtimeState: candidate,
      runNodes: await this.loadRunNodesForRuntimeRepair(),
    });

    return sanitizeRuntimeState(repaired.runtimeState);
  }
}
