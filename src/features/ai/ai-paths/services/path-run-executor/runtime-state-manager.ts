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

export class PathRunRuntimeStateManager {
  private latestSnapshot: RuntimeState | null = null;
  private historyEntriesByNode = new Map<string, RuntimeHistoryEntry[]>();
  private nodeStatusOverrides = new Map<string, RuntimeState['nodeStatuses'][string]>();

  constructor(private params: PathRunRuntimeStateManagerParams) {}

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
      return await this.params.repo.listRunNodes(this.params.run.id);
    } catch (error) {
      void ErrorSystem.captureException(error);
      return [];
    }
  }

  async buildCurrentRuntimeStateSnapshot(): Promise<RuntimeState> {
    const currentRun = {
      ...this.params.run,
      status: 'running' as const,
      startedAt: this.params.resolvedRunStartedAt,
    };

    // The partial update from our local tracking
    const localUpdate: Partial<RuntimeState> = {
      inputs: this.params.accInputs,
      outputs: this.params.accOutputs,
      nodeStatuses: Object.fromEntries(this.nodeStatusOverrides),
      history: Object.fromEntries(this.historyEntriesByNode),
    };

    // Reconcile the initial state with the latest engine snapshot (if any) and our local updates
    const updates: Partial<RuntimeState>[] = [];
    if (this.latestSnapshot) {
      updates.push(this.latestSnapshot);
    }
    updates.push(localUpdate);

    const reconciled = reconcileRuntimeState(this.params.initialRuntimeState, updates);

    // Ensure the currentRun is correctly set
    const candidate: RuntimeState = {
      ...reconciled,
      currentRun,
    };

    const repaired = repairRuntimeStatePorts({
      runtimeState: candidate,
      runNodes: await this.loadRunNodesForRuntimeRepair(),
    });

    return sanitizeRuntimeState(repaired.runtimeState);
  }
}
