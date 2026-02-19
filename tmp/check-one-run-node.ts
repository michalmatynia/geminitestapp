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
    const runId = 'e25bc6b1-5474-4e21-a133-2b4851244ddd';
    const queryNode = await db.collection('ai_path_run_nodes').findOne({ runId, nodeId: 'node-query-params' });
    const updateNode = await db.collection('ai_path_run_nodes').findOne({ runId, nodeId: 'node-update-params' });
    const slim = {
      queryNode: queryNode
        ? {
            status: queryNode['status'],
            input: queryNode['input'],
            output: queryNode['output'],
            error: queryNode['error'],
          }
        : null,
      updateNode: updateNode
        ? {
            status: updateNode['status'],
            input: updateNode['input'],
            output: updateNode['output'],
            error: updateNode['error'],
          }
        : null,
    };
    console.log(JSON.stringify(slim, null, 2));
  } finally {
    await client.close();
  }
}

void main();
