import 'server-only';

import type {
  AiPathRunNodeRecord,
  AiPathRunRecord,
  AiPathRunRepository,
  RuntimePortValues,
  RuntimeState,
} from '@/shared/contracts/ai-paths';
import {
  sanitizeRuntimeState,
} from '../path-run-executor.logic';
import { repairRuntimeStatePorts } from '@/features/ai/ai-paths/services/runtime-state-port-repair';

export class PathRunRuntimeStateManager {
  private latestSnapshot: RuntimeState | null = null;

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

  private async loadRunNodesForRuntimeRepair(): Promise<AiPathRunNodeRecord[]> {
    try {
      return await this.repo.listRunNodes(this.run.id);
    } catch {
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
      
    const candidate: RuntimeState = {
      status: statusFromLatest ?? 'running',
      currentRun,
      inputs: this.accInputs,
      outputs: this.accOutputs,
      nodeOutputs: nodeOutputsFromLatest ?? this.accOutputs,
      nodeStatuses: nodeStatusesFromLatest ?? {},
      history: historyFromLatest ?? {},
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
