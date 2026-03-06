import 'dotenv/config';

import { pathToFileURL } from 'node:url';

import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import {
  normalizeAiPathRunRuntimeKernelMetadata,
  type AiPathRunRuntimeKernelMetadataChangedField,
} from '@/features/ai/ai-paths/services/path-run-runtime-kernel-metadata';
import { isObjectRecord } from '@/shared/utils/object-utils';

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
  affectedRuns: number;
  updateAttempts: number;
  updatesApplied: number;
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
  'runtimeKernelConfig.mode': 0,
  'runtimeKernelConfig.nodeTypes': 0,
  'runtimeKernelConfig.codeObjectResolverIds': 0,
  'runtimeKernelConfig.strictNativeRegistry': 0,
  'runtimeKernel.mode': 0,
  'runtimeKernel.modeSource': 0,
  'runtimeKernel.nodeTypes': 0,
  'runtimeKernel.nodeTypesSource': 0,
  'runtimeKernel.codeObjectResolverIds': 0,
  'runtimeKernel.strictNativeRegistry': 0,
  'runtimeKernel.strictNativeRegistrySource': 0,
});

const maybeCollectSample = (sampleRunIds: string[], sampleLimit: number, runId: string): void => {
  if (sampleRunIds.length >= sampleLimit) return;
  sampleRunIds.push(runId);
};

const hasRuntimeKernelMetadata = (meta: unknown): boolean => {
  if (!isObjectRecord(meta)) return false;
  return isObjectRecord(meta['runtimeKernelConfig']) || isObjectRecord(meta['runtimeKernel']);
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
    affectedRuns: 0,
    updateAttempts: 0,
    updatesApplied: 0,
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
      if (!hasRuntimeKernelMetadata(run.meta)) continue;
      summary.runsWithRuntimeKernelMetadata += 1;

      const normalized = normalizeAiPathRunRuntimeKernelMetadata(run.meta);
      if (!normalized.changed || !normalized.meta) continue;

      summary.affectedRuns += 1;
      normalized.changedFields.forEach((field) => {
        summary.changedFieldCounts[field] += 1;
      });
      maybeCollectSample(summary.sampleRunIds, options.sampleLimit, run.id);

      if (!options.write) continue;

      summary.updateAttempts += 1;
      try {
        await repo.updateRun(run.id, {
          meta: normalized.meta,
        });
        summary.updatesApplied += 1;
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
