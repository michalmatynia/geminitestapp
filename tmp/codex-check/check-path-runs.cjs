const { MongoClient } = require('mongodb');

const PATH_IDS = ['path_65mv2p', 'path_syr8f4'];

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const db = client.db();
    const coll = db.collection('ai_path_runs');
    const now = Date.now();
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000);

    const out = {};
    for (const pathId of PATH_IDS) {
      const total = await coll.countDocuments({ pathId });
      const last24h = await coll.countDocuments({ pathId, createdAt: { $gte: dayAgo } });
      const latest = await coll
        .find(
          { pathId },
          {
            projection: {
              _id: 0,
              id: 1,
              status: 1,
              pathId: 1,
              createdAt: 1,
              startedAt: 1,
              finishedAt: 1,
              triggerEvent: 1,
              triggerNodeId: 1,
              userId: 1,
              meta: 1,
            },
          }
        )
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray();
      out[pathId] = { total, last24h, latest };
    }

    const queueStats = {
      queued: await coll.countDocuments({ status: 'queued' }),
      running: await coll.countDocuments({ status: 'running' }),
      paused: await coll.countDocuments({ status: 'paused' }),
    };

    console.log(JSON.stringify({ queueStats, paths: out }, null, 2));
  } finally {
    await client.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
