import 'dotenv/config';
import { MongoClient } from 'mongodb';

const uri = process.env['MONGODB_URI'];
if (!uri) {
  throw new Error('MONGODB_URI is missing');
}
const dbName = process.env['MONGODB_DB'] || 'app';

const projectRun = (doc: Record<string, unknown>) => ({
  id: doc['id'] ?? doc['runId'] ?? doc['_id'],
  runId: doc['runId'] ?? null,
  status: doc['status'] ?? null,
  entityId: doc['entityId'] ?? null,
  simulationEntityId: doc['simulationEntityId'] ?? null,
  startedAt: doc['startedAt'] ?? null,
  mode: doc['mode'] ?? null,
  triggerEventId: doc['triggerEventId'] ?? null,
});

async function main(): Promise<void> {
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const db = client.db(dbName);
    const runs = (await db
      .collection('ai_path_runs')
      .find({ pathId: 'path_syr8f4' })
      .sort({ startedAt: -1 })
      .limit(6)
      .toArray()) as Array<Record<string, unknown>>;

    console.log('RUNS', JSON.stringify(runs.map(projectRun), null, 2));

    const runIds = runs
      .map((run) => run['id'] ?? run['runId'])
      .filter((value): value is string => typeof value === 'string');

    console.log('RUN_IDS', JSON.stringify(runIds, null, 2));

    if (runIds.length === 0) return;

    const updateNodes = (await db
      .collection('ai_path_run_nodes')
      .find({ runId: { $in: runIds }, nodeId: 'node-update-params' })
      .sort({ startedAt: -1 })
      .toArray()) as Array<Record<string, unknown>>;

    const slimNodes = updateNodes.map((node) => ({
      runId: node['runId'] ?? null,
      status: node['status'] ?? null,
      startedAt: node['startedAt'] ?? null,
      error: node['error'] ?? null,
      output: node['output'] ?? null,
    }));
    console.log('UPDATE_NODES', JSON.stringify(slimNodes, null, 2));

    const events = (await db
      .collection('ai_path_run_events')
      .find({
        runId: { $in: runIds },
        $or: [{ nodeId: 'node-update-params' }, { message: /update/i }],
      })
      .sort({ timestamp: -1 })
      .limit(40)
      .toArray()) as Array<Record<string, unknown>>;

    const slimEvents = events.map((event) => ({
      runId: event['runId'] ?? null,
      nodeId: event['nodeId'] ?? null,
      level: event['level'] ?? null,
      message: event['message'] ?? null,
      timestamp: event['timestamp'] ?? null,
      metadata: event['metadata'] ?? null,
    }));
    console.log('EVENTS', JSON.stringify(slimEvents, null, 2));
  } finally {
    await client.close();
  }
}

void main();
