import 'dotenv/config';

import { collectNoopWriteFindings, dedupeRunIds } from './path-write-noop-utils';
import {
  collectJsonIntegrityFindings,
  dedupeRunIdsFromJsonIntegrityFindings,
} from './path-json-integrity-utils';

type CliOptions = {
  runId?: string;
  pathId?: string;
  limit: number;
  maxApply: number;
  apply: boolean;
  mode: 'noop-write' | 'json-integrity';
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    limit: 200,
    maxApply: 50,
    apply: false,
    mode: 'noop-write',
  };

  argv.forEach((arg: string): void => {
    if (arg === '--apply') {
      options.apply = true;
      return;
    }
    if (arg.startsWith('--run=')) {
      const runId = arg.slice('--run='.length).trim();
      if (runId.length > 0) options.runId = runId;
      return;
    }
    if (arg.startsWith('--path=')) {
      const pathId = arg.slice('--path='.length).trim();
      if (pathId.length > 0) options.pathId = pathId;
      return;
    }
    if (arg.startsWith('--limit=')) {
      const parsed = Number.parseInt(arg.slice('--limit='.length), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.limit = parsed;
      }
      return;
    }
    if (arg.startsWith('--max=')) {
      const parsed = Number.parseInt(arg.slice('--max='.length), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.maxApply = parsed;
      }
      return;
    }
    if (arg.startsWith('--mode=')) {
      const mode = arg.slice('--mode='.length).trim().toLowerCase();
      options.mode = mode === 'json-integrity' ? 'json-integrity' : 'noop-write';
    }
  });

  return options;
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  let scannedRuns = 0;
  let scannedNodes = 0;
  let findingCount = 0;
  let candidateRunIds: string[] = [];

  if (options.mode === 'json-integrity') {
    const diagnostics = await collectJsonIntegrityFindings({
      ...(options.runId ? { runId: options.runId } : {}),
      ...(options.pathId ? { pathId: options.pathId } : {}),
      limit: options.limit,
    });
    scannedRuns = diagnostics.scannedRuns;
    scannedNodes = diagnostics.scannedNodes;
    findingCount = diagnostics.findings.length;
    candidateRunIds = dedupeRunIdsFromJsonIntegrityFindings(diagnostics.findings).slice(
      0,
      options.maxApply
    );
  } else {
    const diagnostics = await collectNoopWriteFindings({
      ...(options.runId ? { runId: options.runId } : {}),
      ...(options.pathId ? { pathId: options.pathId } : {}),
      limit: options.limit,
    });
    scannedRuns = diagnostics.scannedRuns;
    scannedNodes = diagnostics.scannedNodes;
    findingCount = diagnostics.findings.length;
    candidateRunIds = dedupeRunIds(diagnostics.findings).slice(0, options.maxApply);
  }

  const manualRestartRequiredRunIds = [...candidateRunIds];
  const failed: Array<{ runId: string; error: string }> = [];

  if (options.apply) {
    for (const runId of candidateRunIds) {
      failed.push({
        runId,
        error:
          'AI Paths is forward-only. This diagnostic script can no longer replay runs; start a fresh run manually.',
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: options.apply ? 'apply' : 'dry-run',
        filters: {
          mode: options.mode,
          runId: options.runId ?? null,
          pathId: options.pathId ?? null,
          limit: options.limit,
          maxApply: options.maxApply,
        },
        scannedRuns,
        scannedNodes,
        findingCount,
        candidateRunIds,
        manualRestartRequiredCount: manualRestartRequiredRunIds.length,
        manualRestartRequiredRunIds,
        failedCount: failed.length,
        failed,
      },
      null,
      2
    )
  );
}

void main().catch((error) => {
  console.error('path-write-noop-repair failed:', error);
  process.exit(1);
});
