import { MongoClient } from 'mongodb';

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'app';
  if (!uri) throw new Error('No MONGODB_URI');

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const ids = [
    '1e008a44-264b-4cae-9bd8-d7f57f6ce86f',
    '19562fbf-1b35-441f-ad5f-e65c8f6d484c',
    '7e81a992-b3b3-4004-85c5-06fc174b8bf0',
  ];

  for (const id of ids) {
    const run = await db.collection('ai_path_runs').findOne({ $or: [{ id }, { _id: id }] });

    console.log(
      '\nRUN',
      id,
      run
        ? {
            status: run['status'],
            pathId: run['pathId'],
            pathName: run['pathName'],
            entityId: run['entityId'],
            entityType: run['entityType'],
            errorMessage: run['errorMessage'],
            createdAt: run['createdAt'],
            meta: run['meta'],
          }
        : null
    );

    const nodes = await db
      .collection('ai_path_run_nodes')
      .find({ runId: id })
      .sort({ createdAt: 1 })
      .toArray();

    console.log('nodes', nodes.length);
    for (const node of nodes) {
      const nodeId = String(node['nodeId'] ?? '');
      if (!nodeId.includes('query') && !nodeId.includes('update') && !nodeId.includes('regex')) {
        continue;
      }
      const outputs = (node['outputs'] ?? {}) as Record<string, unknown>;
      const inputs = (node['inputs'] ?? {}) as Record<string, unknown>;
      const inputSummary: Record<string, unknown> = {};
      for (const key of ['context', 'result', 'value', 'bundle', 'entityId', 'entityType']) {
        if (Object.prototype.hasOwnProperty.call(inputs, key)) {
          inputSummary[key] = inputs[key];
        }
      }
      const outputSummary: Record<string, unknown> = {};
      for (const key of ['result', 'bundle', 'value']) {
        if (Object.prototype.hasOwnProperty.call(outputs, key)) {
          outputSummary[key] = outputs[key];
        }
      }
      console.log(' node', nodeId, node['status'], 'err=', node['errorMessage'] ?? null);
      console.log('  inputs', JSON.stringify(inputSummary).slice(0, 4000));
      console.log('  outputs', JSON.stringify(outputSummary).slice(0, 4000));
    }

    const events = await db
      .collection('ai_path_run_events')
      .find({ runId: id })
      .sort({ createdAt: 1 })
      .toArray();

    console.log('events', events.length);
    const relevant = events.filter((event) => {
      const message = String(event['message'] ?? '').toLowerCase();
      const metadataText = JSON.stringify(event['metadata'] ?? {}).toLowerCase();
      return (
        message.includes('parameter') ||
        message.includes('catalog') ||
        message.includes('query') ||
        metadataText.includes('parameter') ||
        metadataText.includes('catalog') ||
        metadataText.includes('definitions') ||
        metadataText.includes('query')
      );
    });

    for (const event of relevant.slice(-60)) {
      console.log(' event', event['level'], event['message']);
      if (event['metadata']) {
        console.log('  md', JSON.stringify(event['metadata']).slice(0, 4000));
      }
    }
  }

  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
