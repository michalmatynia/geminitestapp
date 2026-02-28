// Diagnoses run 919c4b6a-32bb-4302-9ac6-f42d4fcb50f9
// Product: ce5bba68-b82b-4f4b-948f-3aa81bb4a05a
'use strict';
const { MongoClient } = require('mongodb');
const { Client: PgClient } = require('pg');

const RUN_ID = '919c4b6a-32bb-4302-9ac6-f42d4fcb50f9';
const PRODUCT_ID = 'ce5bba68-b82b-4f4b-948f-3aa81bb4a05a';
const PATH_ID = 'path_syr8f4';
const SETTINGS_KEY = `ai_paths_config_${PATH_ID}`;

(async () => {
  const mongoUri = process.env.MONGODB_URI;
  const mongoDb = process.env.MONGODB_DB || 'app';
  const dbUrl = process.env.DATABASE_URL;
  if (!mongoUri) throw new Error('MONGODB_URI missing');

  const mongo = new MongoClient(mongoUri);
  await mongo.connect();
  const db = mongo.db(mongoDb);

  // ── 1. Stored path config ─────────────────────────────────────────────────
  const settingsDoc = await db.collection('ai_paths_settings').findOne({ key: SETTINGS_KEY });
  let storedVersion = null;
  let storedQueryTemplate = null;
  let hasBundleEdgeToQuery = false;
  let hasCatalogIdEdgeToQuery = false;
  let parserMappings = null;
  if (settingsDoc?.value) {
    try {
      const cfg = JSON.parse(settingsDoc.value);
      storedVersion = cfg?.version ?? null;
      const qNode = (cfg?.nodes ?? []).find((n) => n?.id === 'node-query-params');
      storedQueryTemplate = qNode?.config?.database?.query?.queryTemplate?.trim() ?? null;
      const pNode = (cfg?.nodes ?? []).find((n) => n?.id === 'node-parser-params');
      parserMappings = pNode?.config?.parser?.mappings ?? null;
      const edges = cfg?.edges ?? [];
      hasBundleEdgeToQuery = edges.some(
        (e) =>
          e.from === 'node-parser-params' &&
          e.to === 'node-query-params' &&
          e.fromPort === 'bundle' &&
          e.toPort === 'bundle'
      );
      hasCatalogIdEdgeToQuery = edges.some(
        (e) =>
          e.from === 'node-parser-params' &&
          e.to === 'node-query-params' &&
          e.fromPort === 'catalogId' &&
          e.toPort === 'catalogId'
      );
    } catch (e) {
      storedQueryTemplate = `PARSE ERROR: ${e.message}`;
    }
  } else {
    storedQueryTemplate = settingsDoc ? 'NO VALUE FIELD' : 'SETTINGS DOC NOT FOUND';
  }

  // ── 2. Product from MongoDB ───────────────────────────────────────────────
  const product = await db
    .collection('products')
    .findOne(
      { $or: [{ id: PRODUCT_ID }, { _id: PRODUCT_ID }] },
      { projection: { id: 1, title: 1, catalogId: 1, parameters: 1 } }
    );
  const catalogId = product?.catalogId ?? null;

  // ── 3. Catalog parameter definitions from MongoDB ─────────────────────────
  let paramDefCount = 0;
  let paramDefSample = [];
  if (catalogId) {
    paramDefCount = await db.collection('product_parameters').countDocuments({ catalogId });
    const defs = await db.collection('product_parameters').find({ catalogId }).limit(5).toArray();
    paramDefSample = defs.map((d) => ({
      id: d.id ?? d._id?.toString(),
      name: d.name ?? d.name_en ?? d.label ?? null,
    }));
  }

  await mongo.close();

  // ── 4. Run details from PostgreSQL ────────────────────────────────────────
  let runData = null;
  if (dbUrl) {
    const pg = new PgClient({ connectionString: dbUrl });
    await pg.connect();
    try {
      // Get the run record
      const runRes = await pg.query(
        `SELECT id, status, "pathId", "errorMessage", "createdAt", "finishedAt",
                "runtimeState"::text, graph::text, "entityId", "entityType", meta::text
         FROM "AiPathRun" WHERE id = $1 LIMIT 1`,
        [RUN_ID]
      );
      if (runRes.rows.length === 0) {
        // Try lowercase table name
        const runRes2 = await pg.query(
          `SELECT id, status, "pathId", "errorMessage", "createdAt", "finishedAt",
                  "runtimeState"::text, graph::text, "entityId", "entityType", meta::text
           FROM "ai_path_runs" WHERE id = $1 LIMIT 1`,
          [RUN_ID]
        );
        if (runRes2.rows.length > 0) runData = runRes2.rows[0];
      } else {
        runData = runRes.rows[0];
      }

      if (runData) {
        // Parse JSON fields
        const runtimeState = runData.runtimeState ? JSON.parse(runData.runtimeState) : null;
        const graphObj = runData.graph ? JSON.parse(runData.graph) : null;
        const metaObj = runData.meta ? JSON.parse(runData.meta) : null;

        const history = runtimeState?.history ?? null;
        const nodesSummary = {};
        if (history && typeof history === 'object') {
          for (const [nodeId, entries] of Object.entries(history)) {
            const arr = Array.isArray(entries) ? entries : [];
            const last = arr[arr.length - 1];
            nodesSummary[nodeId] = {
              entryCount: arr.length,
              lastType: last?.type ?? null,
              lastError: last?.error ?? null,
              outputPreview:
                last?.output !== undefined ? JSON.stringify(last.output).slice(0, 300) : null,
            };
          }
        }

        const runEdges = graphObj?.edges ?? [];
        const runHasBundleEdge = runEdges.some(
          (e) =>
            e.from === 'node-parser-params' &&
            e.to === 'node-query-params' &&
            e.fromPort === 'bundle' &&
            e.toPort === 'bundle'
        );
        const runQueryNode = (graphObj?.nodes ?? []).find((n) => n?.id === 'node-query-params');
        const runQueryTemplate =
          runQueryNode?.config?.database?.query?.queryTemplate?.trim() ?? null;

        runData = {
          id: runData.id,
          status: runData.status,
          pathId: runData.pathId,
          errorMessage: runData.errorMessage,
          createdAt: runData.createdAt,
          finishedAt: runData.finishedAt,
          entityId: runData.entityId,
          entityType: runData.entityType,
          metaSource: metaObj?.source ?? null,
          graphEdgeCount: runEdges.length,
          runHasBundleEdge,
          runQueryTemplate,
          nodesSummary,
        };
      }
    } catch (pgErr) {
      runData = { pgError: pgErr.message };
    } finally {
      await pg.end();
    }
  } else {
    runData = { note: 'DATABASE_URL not set — skipping PostgreSQL query' };
  }

  console.log(
    JSON.stringify(
      {
        storedPathConfig: {
          version: storedVersion,
          queryTemplate: storedQueryTemplate,
          hasBundleEdgeToQuery,
          hasCatalogIdEdgeToQuery,
          parserMappingsHasCatalogId: parserMappings ? 'catalogId' in parserMappings : null,
        },
        product: {
          id: product?.id ?? null,
          title: product?.title ?? null,
          catalogId,
          existingParameterCount: Array.isArray(product?.parameters)
            ? product.parameters.length
            : 'none',
        },
        catalogParamDefs: {
          catalogId,
          count: paramDefCount,
          sample: paramDefSample,
        },
        run: runData,
      },
      null,
      2
    )
  );
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
