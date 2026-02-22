import 'dotenv/config';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';

const runId = process.argv[2];
if (!runId) {
  console.error('Usage: inspect_run_runtime_state <runId>');
  process.exit(1);
}

async function main(): Promise<void> {
  const repo = await getPathRunRepository();
  const run = await repo.findRunById(runId);
  if (!run) {
    console.log(JSON.stringify({ runId, error: 'not_found' }, null, 2));
    return;
  }
  const runtimeState =
    run.runtimeState && typeof run.runtimeState === 'object'
      ? (run.runtimeState as Record<string, unknown>)
      : null;
  const history =
    runtimeState && runtimeState.history && typeof runtimeState.history === 'object'
      ? (runtimeState.history as Record<string, Array<Record<string, unknown>>>)
      : null;
  const historySummary = history
    ? Object.entries(history).map(([nodeId, entries]) => {
        const statuses = Array.isArray(entries)
          ? entries.map((entry) =>
              typeof entry.status === 'string'
                ? `${entry.status}${typeof entry.skipReason === 'string' ? `(${entry.skipReason})` : ''}`
                : 'unknown'
            )
          : [];
        return {
          nodeId,
          count: Array.isArray(entries) ? entries.length : 0,
          statuses,
        };
      })
    : [];

  console.log(
    JSON.stringify(
      {
        runId,
        pathId: run.pathId,
        status: run.status,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        hasRuntimeState: Boolean(runtimeState),
        historySummary,
      },
      null,
      2,
    ),
  );
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
