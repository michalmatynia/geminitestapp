'use strict';
const { MongoClient } = require('mongodb');

const PRODUCT_ID = 'ce5bba68-b82b-4f4b-948f-3aa81bb4a05a';

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'app');

  const p = await db.collection('products').findOne(
    { $or: [{ id: PRODUCT_ID }, { _id: PRODUCT_ID }] }
  );

  // Show the full catalogs array, categories array, and producers array
  console.log('catalogs:', JSON.stringify(p.catalogs, null, 2));
  console.log('categories:', JSON.stringify(p.categories, null, 2));
  console.log('parameters (current value):', JSON.stringify(p.parameters, null, 2));

  // Show a sample product that HAS a catalogId to understand the schema
  const sampleWithCatalogId = await db.collection('products').findOne({ catalogId: { $exists: true, $ne: null } });
  if (sampleWithCatalogId) {
    console.log('\nSample product WITH catalogId field:');
    console.log('  catalogId:', sampleWithCatalogId.catalogId);
    console.log('  catalogs:', JSON.stringify(sampleWithCatalogId.catalogs?.slice(0, 1)));
    console.log('  categories:', JSON.stringify(sampleWithCatalogId.categories?.slice(0, 1)));
  } else {
    console.log('\nNo products have a top-level catalogId field');
    // Show the shape of the catalogs array from another product
    const sampleWithCatalogs = await db.collection('products').findOne({ catalogs: { $exists: true, $not: { $size: 0 } } });
    if (sampleWithCatalogs) {
      console.log('\nSample product with catalogs array:');
      console.log('  catalogs:', JSON.stringify(sampleWithCatalogs.catalogs?.slice(0, 1)));
    }
  }

  // Check how product_parameters are keyed (what fields do they have?)
  const paramDef = await db.collection('product_parameters').findOne({});
  console.log('\nSample product_parameter doc keys:', paramDef ? Object.keys(paramDef) : 'none');
  if (paramDef) console.log('  full doc:', JSON.stringify(paramDef, null, 2));

  await client.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
