const { MongoClient } = require('mongodb');

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');

  const client = new MongoClient(uri);
  await client.connect();
  try {
    const db = client.db();
    const coll = db.collection('ai_paths_settings');
    const docs = await coll
      .find({ key: { $regex: '^ai_paths_config_' } }, { projection: { key: 1, value: 1 } })
      .toArray();

    const nowIso = new Date().toISOString();
    const ops = [];
    let invalidJson = 0;

    for (const doc of docs) {
      let parsed;
      try {
        parsed = JSON.parse(doc.value);
      } catch {
        invalidJson += 1;
        continue;
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;
      if (parsed.executionMode === 'server') continue;

      const next = {
        ...parsed,
        executionMode: 'server',
        updatedAt: nowIso,
      };

      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { value: JSON.stringify(next), updatedAt: new Date() } },
        },
      });
    }

    let modifiedCount = 0;
    if (ops.length > 0) {
      const result = await coll.bulkWrite(ops);
      modifiedCount = result.modifiedCount || 0;
    }

    console.log(
      JSON.stringify(
        {
          totalPathConfigs: docs.length,
          updatedToServerMode: modifiedCount,
          skippedInvalidJson: invalidJson,
        },
        null,
        2
      )
    );
  } finally {
    await client.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
