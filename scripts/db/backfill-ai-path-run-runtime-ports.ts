import 'dotenv/config';

import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { repairRuntimeStatePorts } from '@/features/ai/ai-paths/services/runtime-state-port-repair';
import type { AiPathRunListOptions, AiPathRunRecord } from '@/shared/contracts/ai-paths';

type CliOptions = {
  write: boolean;
  windowDays: number;
  batchSize: number;
  sampleLimit: number;
  perPhaseRunLimit: number | null;
};

type PhaseConfig = {
  id: 'phase_1_recent_window' | 'phase_2_older_history';
  createdAfter?: string | undefined;
  createdBefore?: string | undefined;
};

type PhaseMetrics = {
  id: PhaseConfig['id'];
  createdAfter: string | null;
  createdBefore: string | null;
  scannedBatches: number;
  scannedRuns: number;
  processedRunDuplicates: number;
  runsWithRuntimeState: number;
  runtimeStateMissing: number;
  runsRepaired: number;
  runsUnchanged: number;
  updateAttempts: number;
  updatesApplied: number;
  portsAdded: {
    inputs: number;
    outputs: number;
    nodeOutputs: number;
    total: number;
  };
  sampleRunIds: string[];
  failures: Array<{ runId: string; message: string }>;
};

const DEFAULT_WINDOW_DAYS = 30;
const DEFAULT_BATCH_SIZE = 200;
const DEFAULT_SAMPLE_LIMIT = 25;

const parsePositiveInteger = (value: string): number | null => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.trunc(parsed);
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    write: false,
    windowDays: DEFAULT_WINDOW_DAYS,
    batchSize: DEFAULT_BATCH_SIZE,
    sampleLimit: DEFAULT_SAMPLE_LIMIT,
    perPhaseRunLimit: null,
  };

  argv.forEach((arg) => {
    if (arg === '--write') {
      options.write = true;
      return;
    }
    if (arg.startsWith('--window-days=')) {
      const parsed = parsePositiveInteger(arg.slice('--window-days='.length));
      if (parsed !== null) options.windowDays = parsed;
      return;
    }
    if (arg.startsWith('--batch=')) {
      const parsed = parsePositiveInteger(arg.slice('--batch='.length));
      if (parsed !== null) options.batchSize = parsed;
      return;
    }
    if (arg.startsWith('--sample=')) {
      const parsed = parsePositiveInteger(arg.slice('--sample='.length));
      if (parsed !== null) options.sampleLimit = parsed;
      return;
    }
    if (arg.startsWith('--limit=')) {
      const parsed = parsePositiveInteger(arg.slice('--limit='.length));
      options.perPhaseRunLimit = parsed;
    }
  });

  return options;
};

const toIso = (value: Date): string => value.toISOString();

const buildPhaseMetrics = (phase: PhaseConfig): PhaseMetrics => ({
  id: phase.id,
  createdAfter: phase.createdAfter ?? null,
  createdBefore: phase.createdBefore ?? null,
  scannedBatches: 0,
  scannedRuns: 0,
  processedRunDuplicates: 0,
  runsWithRuntimeState: 0,
  runtimeStateMissing: 0,
  runsRepaired: 0,
  runsUnchanged: 0,
  updateAttempts: 0,
  updatesApplied: 0,
  portsAdded: {
    inputs: 0,
    outputs: 0,
    nodeOutputs: 0,
    total: 0,
  },
  sampleRunIds: [],
  failures: [],
});

const asErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error ?? 'Unknown error');

const maybeCollectSample = (metrics: PhaseMetrics, runId: string, sampleLimit: number): void => {
  if (metrics.sampleRunIds.length >= sampleLimit) return;
  metrics.sampleRunIds.push(runId);
};

const listRunPage = async (args: {
  repo: Awaited<ReturnType<typeof getPathRunRepository>>;
  filters: Pick<AiPathRunListOptions, 'createdAfter' | 'createdBefore'>;
  offset: number;
  limit: number;
}): Promise<AiPathRunRecord[]> => {
  const { repo, filters, offset, limit } = args;
  const result = await repo.listRuns({
    ...filters,
    includeTotal: false,
    limit,
    offset,
  });
  return result.runs;
};

const processPhase = async (args: {
  repo: Awaited<ReturnType<typeof getPathRunRepository>>;
  phase: PhaseConfig;
  options: CliOptions;
  processedRunIds: Set<string>;
}): Promise<PhaseMetrics> => {
  const { repo, phase, options, processedRunIds } = args;
  const metrics = buildPhaseMetrics(phase);
  let offset = 0;

  while (true) {
    const runs = await listRunPage({
      repo,
      filters: {
        ...(phase.createdAfter ? { createdAfter: phase.createdAfter } : {}),
        ...(phase.createdBefore ? { createdBefore: phase.createdBefore } : {}),
      },
      offset,
      limit: options.batchSize,
    });
    if (runs.length === 0) break;
    metrics.scannedBatches += 1;
    offset += runs.length;

    for (const listEntry of runs) {
      if (options.perPhaseRunLimit !== null && metrics.scannedRuns >= options.perPhaseRunLimit) {
        return metrics;
      }
      metrics.scannedRuns += 1;

      const runId = listEntry.id;
      if (processedRunIds.has(runId)) {
        metrics.processedRunDuplicates += 1;
        continue;
      }
      processedRunIds.add(runId);

      let run: AiPathRunRecord | null = null;
      try {
        run = await repo.findRunById(runId);
      } catch (error) {
        metrics.failures.push({ runId, message: `findRunById failed: ${asErrorMessage(error)}` });
        continue;
      }
      if (!run) {
        metrics.failures.push({ runId, message: 'Run not found during backfill lookup.' });
        continue;
      }
      if (!run.runtimeState || typeof run.runtimeState !== 'object') {
        metrics.runtimeStateMissing += 1;
        continue;
      }
      metrics.runsWithRuntimeState += 1;

      let runNodes = [];
      try {
        runNodes = await repo.listRunNodes(runId);
      } catch (error) {
        metrics.failures.push({ runId, message: `listRunNodes failed: ${asErrorMessage(error)}` });
        continue;
      }

      const repair = repairRuntimeStatePorts({
        runtimeState: run.runtimeState,
        runNodes,
      });
      if (!repair.changed) {
        metrics.runsUnchanged += 1;
        continue;
      }

      metrics.runsRepaired += 1;
      metrics.portsAdded.inputs += repair.counts.inputs;
      metrics.portsAdded.outputs += repair.counts.outputs;
      metrics.portsAdded.nodeOutputs += repair.counts.nodeOutputs;
      metrics.portsAdded.total += repair.counts.total;
      maybeCollectSample(metrics, runId, options.sampleLimit);

      if (!options.write) continue;

      metrics.updateAttempts += 1;
      try {
        await repo.updateRun(runId, {
          runtimeState: repair.runtimeState as Record<string, unknown>,
        });
        metrics.updatesApplied += 1;
      } catch (error) {
        metrics.failures.push({ runId, message: `updateRun failed: ${asErrorMessage(error)}` });
      }
    }
  }

  return metrics;
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const repo = await getPathRunRepository();
  const now = new Date();
  const cutoff = new Date(now.getTime() - options.windowDays * 24 * 60 * 60 * 1000);
  const cutoffIso = toIso(cutoff);

  const processedRunIds = new Set<string>();
  const phase1 = await processPhase({
    repo,
    phase: {
      id: 'phase_1_recent_window',
      createdAfter: cutoffIso,
    },
    options,
    processedRunIds,
  });
  const phase2 = await processPhase({
    repo,
    phase: {
      id: 'phase_2_older_history',
      createdBefore: cutoffIso,
    },
    options,
    processedRunIds,
  });

  const totals = {
    scannedRuns: phase1.scannedRuns + phase2.scannedRuns,
    runsWithRuntimeState: phase1.runsWithRuntimeState + phase2.runsWithRuntimeState,
    runtimeStateMissing: phase1.runtimeStateMissing + phase2.runtimeStateMissing,
    runsRepaired: phase1.runsRepaired + phase2.runsRepaired,
    runsUnchanged: phase1.runsUnchanged + phase2.runsUnchanged,
    updateAttempts: phase1.updateAttempts + phase2.updateAttempts,
    updatesApplied: phase1.updatesApplied + phase2.updatesApplied,
    portsAdded: {
      inputs: phase1.portsAdded.inputs + phase2.portsAdded.inputs,
      outputs: phase1.portsAdded.outputs + phase2.portsAdded.outputs,
      nodeOutputs: phase1.portsAdded.nodeOutputs + phase2.portsAdded.nodeOutputs,
      total: phase1.portsAdded.total + phase2.portsAdded.total,
    },
    failures: phase1.failures.length + phase2.failures.length,
    uniqueRunsProcessed: processedRunIds.size,
  };

  console.log(
    JSON.stringify(
      {
        mode: options.write ? 'write' : 'dry-run',
        startedAt: toIso(now),
        completedAt: toIso(new Date()),
        config: {
          windowDays: options.windowDays,
          batchSize: options.batchSize,
          sampleLimit: options.sampleLimit,
          perPhaseRunLimit: options.perPhaseRunLimit,
          phase1CutoffIso: cutoffIso,
          phase2AutoContinuation: true,
        },
        phases: [phase1, phase2],
        totals,
      },
      null,
      2
    )
  );
}

void main().catch((error) => {
  console.error('Failed to backfill AI Path run runtime ports:', error);
  process.exit(1);
});
