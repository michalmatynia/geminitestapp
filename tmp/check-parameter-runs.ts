import 'dotenv/config';
import { getMongoDb } from '../src/shared/lib/db/mongo-client';

async function main(): Promise<void> {
  const db = await getMongoDb();
  const runs = await db
    .collection('ai_path_runs')
    .find({ pathId: 'path_syr8f4' })
    .sort({ startedAt: -1 })
    .limit(8)
    .project({
      _id: 0,
      runId: 1,
      status: 1,
      startedAt: 1,
      mode: 1,
      triggerEventId: 1,
      entityId: 1,
      simulationEntityId: 1,
    })
    .toArray();

  console.log('RUNS', JSON.stringify(runs, null, 2));

  const runIds = runs
    .map((run: Record<string, unknown>) => run['runId'])
    .filter((runId: unknown): runId is string => typeof runId === 'string');

  if (runIds.length === 0) {
    return;
  }

  const updateNodes = await db
    .collection('ai_path_run_nodes')
    .find({ runId: { $in: runIds }, nodeId: 'node-update-params' })
    .sort({ startedAt: -1 })
    .project({
      _id: 0,
      runId: 1,
      status: 1,
      startedAt: 1,
      output: 1,
      error: 1,
    })
    .toArray();

  console.log('UPDATE_NODES', JSON.stringify(updateNodes, null, 2));

  const events = await db
    .collection('ai_path_run_events')
    .find({
      runId: { $in: runIds },
      $or: [{ nodeId: 'node-update-params' }, { message: /update/i }],
    })
    .sort({ timestamp: -1 })
    .limit(40)
    .project({
      _id: 0,
      runId: 1,
      level: 1,
      nodeId: 1,
      message: 1,
      timestamp: 1,
      metadata: 1,
    })
    .toArray();

  console.log('EVENTS', JSON.stringify(events, null, 2));
}

void main();
