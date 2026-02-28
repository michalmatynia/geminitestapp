'use strict';
const { MongoClient } = require('mongodb');

const PRODUCT_ID = 'ce5bba68-b82b-4f4b-948f-3aa81bb4a05a';

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'app');

  const p = await db
    .collection('products')
    .findOne({ $or: [{ id: PRODUCT_ID }, { _id: PRODUCT_ID }] });

  if (!p) {
    console.log(JSON.stringify({ error: 'Product not found' }));
    await client.close();
    return;
  }

  // Show all top-level keys
  const summary = {};
  for (const k of Object.keys(p)) {
    const v = p[k];
    if (v === null || v === undefined) {
      summary[k] = null;
    } else if (typeof v === 'string') {
      summary[k] = v.slice(0, 120);
    } else if (Array.isArray(v)) {
      summary[k] = `[Array(${v.length})]`;
    } else if (typeof v === 'object') {
      summary[k] = Object.keys(v);
    } else {
      summary[k] = v;
    }
  }
  console.log(JSON.stringify(summary, null, 2));

  // Also show what's in product_parameters for any catalogId we can find
  const catalogId = p.catalogId || p.catalog_id || p.catalog?.id || null;
  if (catalogId) {
    const defs = await db.collection('product_parameters').find({ catalogId }).limit(3).toArray();
    const count = await db.collection('product_parameters').countDocuments({ catalogId });
    console.log(
      JSON.stringify(
        {
          foundCatalogId: catalogId,
          paramDefCount: count,
          sample: defs.slice(0, 2).map((d) => ({ id: d.id, name: d.name })),
        },
        null,
        2
      )
    );
  } else {
    // Check if product_parameters collection exists at all
    const anyDefs = await db.collection('product_parameters').find({}).limit(3).toArray();
    const totalDefs = await db.collection('product_parameters').countDocuments({});
    console.log(
      JSON.stringify(
        {
          noCatalogIdOnProduct: true,
          totalParamDefs: totalDefs,
          sampleDefs: anyDefs.map((d) => ({ id: d.id, catalogId: d.catalogId, name: d.name })),
        },
        null,
        2
      )
    );
  }

  await client.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
