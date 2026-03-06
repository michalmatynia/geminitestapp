import 'dotenv/config';

import { pathToFileURL } from 'node:url';

import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import {
  AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS,
  normalizeAiPathRunRuntimeKernelMetadataForCleanup,
  type AiPathRunRuntimeKernelMetadataChangedField,
} from '@/features/ai/ai-paths/services/path-run-runtime-kernel-metadata';
import { isObjectRecord } from '@/shared/utils/object-utils';
import {
  normalizeHistoricalRuntimeKernelParityStrategyCountsMeta,
  normalizeHistoricalRuntimeStateCompatibilityHistoryField,
} from './ai-paths-runtime-compatibility-normalization';

type CliOptions = {
  write: boolean;
  batchSize: number;
  sampleLimit: number;
  runLimit: number | null;
};

type CleanupSummary = {
  mode: 'dry-run' | 'write';
  scannedBatches: number;
  scannedRuns: number;
  runsWithRuntimeKernelMetadata: number;
  runsWithLegacyRuntimeTraceStrategyCounts: number;
  runsWithLegacyRuntimeStateHistory: number;
  affectedRuns: number;
  updateAttempts: number;
  updatesApplied: number;
  runtimeStateUpdatesApplied: number;
  changedFieldCounts: Record<AiPathRunRuntimeKernelMetadataChangedField, number>;
  sampleRunIds: string[];
  failures: Array<{ runId: string; message: string }>;
};

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
    batchSize: DEFAULT_BATCH_SIZE,
    sampleLimit: DEFAULT_SAMPLE_LIMIT,
    runLimit: null,
  };

  argv.forEach((arg) => {
    if (arg === '--write') {
      options.write = true;
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
      options.runLimit = parsePositiveInteger(arg.slice('--limit='.length));
    }
  });

  return options;
};

const buildChangedFieldCounts = (): Record<AiPathRunRuntimeKernelMetadataChangedField, number> => ({
  [AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelConfigMode]: 0,
  [AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelConfigNodeTypes]: 0,
  [AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelConfigCodeObjectResolverIds]: 0,
  [AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelConfigStrictNativeRegistry]: 0,
  [AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelMode]: 0,
  [AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelModeSource]: 0,
  [AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelNodeTypes]: 0,
  [AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelNodeTypesSource]: 0,
  [AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelCodeObjectResolverIds]: 0,
  [AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelStrictNativeRegistry]: 0,
  [AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeKernelStrictNativeRegistrySource]: 0,
  [AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeTraceKernelParityStrategyCounts]: 0,
});

const maybeCollectSample = (sampleRunIds: string[], sampleLimit: number, runId: string): void => {
  if (sampleRunIds.length >= sampleLimit) return;
  sampleRunIds.push(runId);
};

const hasRuntimeKernelMetadata = (meta: unknown): boolean => {
  if (!isObjectRecord(meta)) return false;
  const runtimeTrace = isObjectRecord(meta['runtimeTrace']) ? meta['runtimeTrace'] : null;
  return (
    isObjectRecord(meta['runtimeKernelConfig']) ||
    isObjectRecord(meta['runtimeKernel']) ||
    (runtimeTrace !== null && isObjectRecord(runtimeTrace['kernelParity']))
  );
};

const asErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error ?? 'Unknown error');

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  const repo = await getPathRunRepository();
  const summary: CleanupSummary = {
    mode: options.write ? 'write' : 'dry-run',
    scannedBatches: 0,
    scannedRuns: 0,
    runsWithRuntimeKernelMetadata: 0,
    runsWithLegacyRuntimeTraceStrategyCounts: 0,
    runsWithLegacyRuntimeStateHistory: 0,
    affectedRuns: 0,
    updateAttempts: 0,
    updatesApplied: 0,
    runtimeStateUpdatesApplied: 0,
    changedFieldCounts: buildChangedFieldCounts(),
    sampleRunIds: [],
    failures: [],
  };

  let offset = 0;
  while (true) {
    const page = await repo.listRuns({
      includeTotal: false,
      limit: options.batchSize,
      offset,
    });
    if (page.runs.length === 0) break;

    summary.scannedBatches += 1;
    offset += page.runs.length;

    for (const run of page.runs) {
      if (options.runLimit !== null && summary.scannedRuns >= options.runLimit) {
        console.log(JSON.stringify(summary, null, 2));
        return;
      }

      summary.scannedRuns += 1;
      const normalized = normalizeAiPathRunRuntimeKernelMetadataForCleanup(run.meta);
      const normalizedCompatibilityMeta = normalizeHistoricalRuntimeKernelParityStrategyCountsMeta(
        normalized.meta ?? run.meta
      );
      const normalizedRuntimeState = normalizeHistoricalRuntimeStateCompatibilityHistoryField(
        run.runtimeState
      );
      const metadataChanged =
        (normalized.changed && normalized.meta) || normalizedCompatibilityMeta.changed;
      const nextMeta = normalizedCompatibilityMeta.changed
        ? normalizedCompatibilityMeta.value
        : normalized.changed
          ? normalized.meta
          : null;
      if (hasRuntimeKernelMetadata(run.meta)) {
        summary.runsWithRuntimeKernelMetadata += 1;
      }
      if (normalizedCompatibilityMeta.changed) {
        summary.runsWithLegacyRuntimeTraceStrategyCounts += 1;
      }
      if (normalizedRuntimeState.changed) {
        summary.runsWithLegacyRuntimeStateHistory += 1;
      }
      if (!metadataChanged && !normalizedRuntimeState.changed) continue;

      summary.affectedRuns += 1;
      if (metadataChanged) {
        const metadataChangedFields = normalized.changedFields.slice();
        if (normalizedCompatibilityMeta.changed) {
          metadataChangedFields.push(
            AI_PATH_RUN_RUNTIME_KERNEL_METADATA_CHANGED_FIELDS.runtimeTraceKernelParityStrategyCounts
          );
        }
        metadataChangedFields.forEach((field) => {
          summary.changedFieldCounts[field] += 1;
        });
      }
      maybeCollectSample(summary.sampleRunIds, options.sampleLimit, run.id);

      if (!options.write) continue;

      summary.updateAttempts += 1;
      try {
        await repo.updateRun(run.id, {
          ...(metadataChanged ? { meta: nextMeta } : {}),
          ...(normalizedRuntimeState.changed ? { runtimeState: normalizedRuntimeState.value } : {}),
        });
        summary.updatesApplied += 1;
        if (normalizedRuntimeState.changed) {
          summary.runtimeStateUpdatesApplied += 1;
        }
      } catch (error) {
        summary.failures.push({
          runId: run.id,
          message: asErrorMessage(error),
        });
      }
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

const isEntrypoint =
  typeof process.argv[1] === 'string' &&
  process.argv[1].length > 0 &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntrypoint) {
  void main().catch((error) => {
    console.error('Failed to cleanup AI Paths runtime-kernel run metadata:', error);
    process.exit(1);
  });
}
