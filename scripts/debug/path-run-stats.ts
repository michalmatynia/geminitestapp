import 'dotenv/config';

import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';

const pathId = process.argv[2] ?? 'path_65mv2p';

async function main(): Promise<void> {
  const repo = await getPathRunRepository();
  const [queueStats, recentForPath, recentQueued, recentFailed] = await Promise.all([
    repo.getQueueStats(),
    repo.listRuns({ pathId, limit: 10, offset: 0 }),
    repo.listRuns({ statuses: ['queued', 'running', 'paused'], limit: 20, offset: 0 }),
    repo.listRuns({ pathId, statuses: ['failed'], limit: 10, offset: 0 }),
  ]);

  console.log(
    JSON.stringify(
      {
        pathId,
        queueStats,
        recentForPath: {
          total: recentForPath.total,
          runs: recentForPath.runs.map((run) => ({
            id: run.id,
            status: run.status,
            triggerEvent: run.triggerEvent,
            errorMessage: run.errorMessage,
            createdAt: run.createdAt,
            updatedAt: run.updatedAt,
            startedAt: run.startedAt,
            finishedAt: run.finishedAt,
            pathName: run.pathName,
            userId: run.userId,
          })),
        },
        activeRuns: {
          total: recentQueued.total,
          runs: recentQueued.runs.map((run) => ({
            id: run.id,
            pathId: run.pathId,
            status: run.status,
            createdAt: run.createdAt,
            userId: run.userId,
          })),
        },
        recentFailedForPath: {
          total: recentFailed.total,
          runs: recentFailed.runs.map((run) => ({
            id: run.id,
            status: run.status,
            errorMessage: run.errorMessage,
            createdAt: run.createdAt,
            updatedAt: run.updatedAt,
          })),
        },
      },
      null,
      2,
    ),
  );
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('path-run-stats failed:', error);
    process.exit(1);
  });
