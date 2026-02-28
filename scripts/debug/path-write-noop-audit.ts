import 'dotenv/config';

import { collectNoopWriteFindings, dedupeRunIds } from './path-write-noop-utils';

type CliOptions = {
  runId?: string;
  pathId?: string;
  limit: number;
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    limit: 200,
  };
  argv.forEach((arg: string): void => {
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
    }
  });
  return options;
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const result = await collectNoopWriteFindings({
    ...(options.runId ? { runId: options.runId } : {}),
    ...(options.pathId ? { pathId: options.pathId } : {}),
    limit: options.limit,
  });
  const candidateRunIds = dedupeRunIds(result.findings);

  console.log(
    JSON.stringify(
      {
        mode: 'audit',
        filters: {
          runId: options.runId ?? null,
          pathId: options.pathId ?? null,
          limit: options.limit,
        },
        scannedRuns: result.scannedRuns,
        scannedNodes: result.scannedNodes,
        findingCount: result.findings.length,
        candidateRunIds,
        findings: result.findings,
      },
      null,
      2
    )
  );
}

void main().catch((error) => {
  console.error('path-write-noop-audit failed:', error);
  process.exit(1);
});
