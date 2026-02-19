import 'dotenv/config';
import { MongoClient } from 'mongodb';

const uri = process.env['MONGODB_URI'];
if (!uri) throw new Error('MONGODB_URI missing');
const dbName = process.env['MONGODB_DB'] || 'app';

async function main(): Promise<void> {
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const db = client.db(dbName);
    const runIds = [
      'e25bc6b1-5474-4e21-a133-2b4851244ddd',
      '7e81a992-b3b3-4004-85c5-06fc174b8bf0',
      'ff9c84b0-cd1c-4ed2-ae8c-1f49ed328a01',
    ];

    const nodes = (await db
      .collection('ai_path_run_nodes')
      .find({ runId: { $in: runIds }, nodeId: { $in: ['node-query-params', 'node-update-params'] } })
      .sort({ startedAt: -1 })
      .toArray()) as Array<Record<string, unknown>>;

    const slimNodes = nodes.map((node) => ({
      runId: node['runId'],
      nodeId: node['nodeId'],
      status: node['status'],
      error: node['error'],
      input: node['input'],
      output: node['output'],
    }));
    console.log(JSON.stringify(slimNodes, null, 2));

    const events = (await db
      .collection('ai_path_run_events')
      .find({ runId: { $in: runIds } })
      .sort({ createdAt: -1 })
      .limit(80)
      .toArray()) as Array<Record<string, unknown>>;

    const filtered = events
      .filter((event) => {
        const nodeId = event['nodeId'];
        const message = typeof event['message'] === 'string' ? event['message'] : '';
        return nodeId === 'node-query-params' || nodeId === 'node-update-params' || message.toLowerCase().includes('query') || message.toLowerCase().includes('update') || message.toLowerCase().includes('parameter inference');
      })
      .map((event) => ({
        runId: event['runId'],
        nodeId: event['nodeId'],
        level: event['level'],
        message: event['message'],
        metadata: event['metadata'],
      }));

    console.log('EVENTS', JSON.stringify(filtered, null, 2));
  } finally {
    await client.close();
  }
}

void main();
