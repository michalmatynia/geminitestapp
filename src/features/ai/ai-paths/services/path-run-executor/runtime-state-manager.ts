import 'server-only';

import { repairRuntimeStatePorts } from '@/features/ai/ai-paths/services/runtime-state-port-repair';
import { reconcileRuntimeState } from '@/features/ai/ai-paths/runtime/state-reconciler';
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

export interface PathRunRuntimeStateManagerParams {
  run: AiPathRunRecord;
  initialRuntimeState: RuntimeState;
  accInputs: Record<string, RuntimePortValues>;
  accOutputs: Record<string, RuntimePortValues>;
  repo: AiPathRunRepository;
  resolvedRunStartedAt: string;
}

const MAX_HISTORY_ENTRIES_PER_NODE = 50;

export class PathRunRuntimeStateManager {
  private latestSnapshot: RuntimeState | null = null;
  private historyEntriesByNode = new Map<string, RuntimeHistoryEntry[]>();
  private nodeStatusOverrides = new Map<string, RuntimeState['nodeStatuses'][string]>();
  private memoizedSnapshot: RuntimeState | null = null;
  private isDirty = true;

  constructor(private params: PathRunRuntimeStateManagerParams) {}

  setLatestSnapshot(snapshot: RuntimeState | null): void {
    this.latestSnapshot = snapshot;
    this.isDirty = true;
  }

  appendHistoryEntry(nodeId: string, entry: RuntimeHistoryEntry): void {
    const entries = this.historyEntriesByNode.get(nodeId) ?? [];
    entries.push(entry);
    if (entries.length > MAX_HISTORY_ENTRIES_PER_NODE) {
      entries.shift();
    }
    this.historyEntriesByNode.set(nodeId, entries);
    this.isDirty = true;
  }

  setNodeStatus(nodeId: string, status: RuntimeState['nodeStatuses'][string]): void {
    this.nodeStatusOverrides.set(nodeId, status);
    this.isDirty = true;
  }

  private async loadRunNodesForRuntimeRepair(): Promise<AiPathRunNodeRecord[]> {
    try {
      return await this.params.repo.listRunNodes(this.params.run.id);
    } catch (error) {
      void ErrorSystem.captureException(error);
      return [];
    }
  }

  async buildCurrentRuntimeStateSnapshot(): Promise<RuntimeState> {
    if (!this.isDirty && this.memoizedSnapshot) {
      return this.memoizedSnapshot;
    }

    const currentRun = {
      ...this.params.run,
      status: 'running' as const,
      startedAt: this.params.resolvedRunStartedAt,
    };

    const localUpdate: Partial<RuntimeState> = {
      inputs: this.params.accInputs,
      outputs: this.params.accOutputs,
      nodeStatuses: Object.fromEntries(this.nodeStatusOverrides),
      history: Object.fromEntries(this.historyEntriesByNode),
    };

    const updates: Partial<RuntimeState>[] = [];
    if (this.latestSnapshot) {
      updates.push(this.latestSnapshot);
    }
    updates.push(localUpdate);

    const reconciled = reconcileRuntimeState(this.params.initialRuntimeState, updates);

    const candidate: RuntimeState = {
      ...reconciled,
      currentRun,
    };

    const repaired = repairRuntimeStatePorts({
      runtimeState: candidate,
      runNodes: await this.loadRunNodesForRuntimeRepair(),
    });

    this.memoizedSnapshot = sanitizeRuntimeState(repaired.runtimeState);
    this.isDirty = false;
    return this.memoizedSnapshot;
  }
}
