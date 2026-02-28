import 'dotenv/config';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';

const pathId = process.argv[2] ?? 'path_65mv2p';

async function main(): Promise<void> {
  const repo = await getPathRunRepository();
  const list = await repo.listRuns({ pathId, limit: 1, offset: 0 });
  const run = list.runs[0];
  if (!run) {
    console.log(JSON.stringify({ pathId, error: 'no_runs' }, null, 2));
    return;
  }
  const nodes = await repo.listRunNodes(run.id);
  const events = await repo.listRunEvents(run.id, { limit: 500 });

  const nodeSummary = nodes.map((node) => {
    const start = node.startedAt ? new Date(node.startedAt).getTime() : null;
    const end = node.finishedAt ? new Date(node.finishedAt).getTime() : null;
    return {
      nodeId: node.nodeId,
      nodeTitle: node.nodeTitle,
      nodeType: node.nodeType,
      status: node.status,
      attempt: node.attempt,
      durationMs: start !== null && end !== null ? Math.max(end - start, 0) : null,
      startedAt: node.startedAt,
      finishedAt: node.finishedAt,
      errorMessage: node.errorMessage ?? null,
    };
  });

  const warningEvents = events
    .filter((event) => event.level === 'warning' || event.level === 'warn')
    .map((event) => ({
      id: event.id,
      level: event.level,
      message: event.message,
      nodeId: event.nodeId,
      nodeType: event.nodeType,
      createdAt: event.createdAt,
      metadata: event.metadata,
    }));

  const nodeStatusEvents = events
    .filter((event) => event.nodeId)
    .map((event) => ({
      createdAt: event.createdAt,
      nodeId: event.nodeId,
      status: event.status,
      level: event.level,
      message: event.message,
      metadata: event.metadata,
    }));

  console.log(
    JSON.stringify(
      {
        pathId,
        run: {
          id: run.id,
          status: run.status,
          createdAt: run.createdAt,
          startedAt: run.startedAt,
          finishedAt: run.finishedAt,
          errorMessage: run.errorMessage,
        },
        nodeSummary,
        warningEvents,
        nodeStatusEvents,
      },
      null,
      2
    )
  );
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
