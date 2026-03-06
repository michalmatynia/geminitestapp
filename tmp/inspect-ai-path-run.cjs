#!/usr/bin/env node

const { MongoClient, ObjectId } = require('mongodb');

const runId = (process.argv[2] || '').trim();
if (!runId) {
  console.error('Usage: node tmp/inspect-ai-path-run.cjs <run-id>');
  process.exit(1);
}

const mongoUri = (process.env.MONGODB_URI || '').trim();
const dbName = (process.env.MONGODB_DB || 'app').trim();

if (!mongoUri) {
  console.error('MONGODB_URI is required.');
  process.exit(1);
}

const asRecord = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : null;

const normalizeId = (value) => {
  if (typeof value === 'string') return value.trim();
  if (value instanceof ObjectId) return value.toHexString();
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const toDateString = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const summarizeParameters = (value) => {
  if (!Array.isArray(value)) return { count: 0, sample: [] };
  return {
    count: value.length,
    sample: value.slice(0, 5).map((entry) => {
      const record = asRecord(entry) || {};
      return {
        parameterId: normalizeId(record.parameterId || record.id || record._id),
        attributeId: normalizeId(record.attributeId),
        value: typeof record.value === 'string' ? record.value : null,
        valuesByLanguage: asRecord(record.valuesByLanguage),
      };
    }),
  };
};

const main = async () => {
  const client = new MongoClient(mongoUri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });

  try {
    await client.connect();
    const db = client.db(dbName);

    const run = await db.collection('ai_path_runs').findOne(
      { $or: [{ id: runId }, { _id: runId }] },
      {
        projection: {
          _id: 1,
          id: 1,
          pathId: 1,
          pathName: 1,
          status: 1,
          entityId: 1,
          entityType: 1,
          errorMessage: 1,
          createdAt: 1,
          startedAt: 1,
          finishedAt: 1,
          triggerContext: 1,
          meta: 1,
          runtimeState: 1,
        },
      }
    );

    if (!run) {
      console.error(`Run not found: ${runId}`);
      process.exit(2);
    }

    const nodes = await db
      .collection('ai_path_run_nodes')
      .find(
        { runId },
        {
          projection: {
            _id: 1,
            nodeId: 1,
            nodeType: 1,
            nodeTitle: 1,
            status: 1,
            errorMessage: 1,
            inputs: 1,
            outputs: 1,
            createdAt: 1,
            finishedAt: 1,
          },
        }
      )
      .sort({ createdAt: 1 })
      .toArray();

    const events = await db
      .collection('ai_path_run_events')
      .find(
        { runId },
        {
          projection: {
            _id: 0,
            nodeId: 1,
            nodeType: 1,
            nodeTitle: 1,
            status: 1,
            level: 1,
            message: 1,
            metadata: 1,
            createdAt: 1,
          },
        }
      )
      .sort({ createdAt: 1 })
      .toArray();

    const byTitle = (needle) => (value) =>
      typeof value === 'string' && value.toLowerCase().includes(needle.toLowerCase());

    const dbUpdateNode =
      nodes.find(
        (node) =>
          node.nodeType === 'database' &&
          (byTitle('database update')(node.nodeTitle) || byTitle('desc + params')(node.nodeTitle))
      ) || null;
    const dbBundle = asRecord(dbUpdateNode && dbUpdateNode.outputs) || {};
    const bundle = asRecord(dbBundle.bundle) || {};
    const debugPayload = asRecord(dbBundle.debugPayload) || {};
    const dbResult = asRecord(dbBundle.result) || {};

    const triggerContext = asRecord(run.triggerContext) || {};
    const triggerContextEntity =
      asRecord(triggerContext.entity) ||
      asRecord(triggerContext.product) ||
      asRecord(triggerContext.bundle) ||
      {};

    const entityId =
      normalizeId(run.entityId) ||
      normalizeId(asRecord(run.meta)?.entityId) ||
      normalizeId(asRecord(asRecord(run.runtimeState)?.context)?.entityId) ||
      normalizeId(triggerContext.entityId) ||
      normalizeId(triggerContext.productId) ||
      normalizeId(triggerContextEntity.entityId) ||
      normalizeId(triggerContextEntity.productId) ||
      normalizeId(triggerContextEntity.id) ||
      normalizeId(asRecord(dbUpdateNode && dbUpdateNode.inputs)?.entityId) ||
      normalizeId(asRecord(asRecord(dbUpdateNode && dbUpdateNode.inputs)?.bundle)?.entityId) ||
      normalizeId(asRecord(asRecord(dbUpdateNode && dbUpdateNode.inputs)?.bundle)?.id);

    let product = null;
    if (entityId) {
      product = await db.collection('products').findOne(
        {
          $or: [
            { id: entityId },
            { _id: entityId },
            ...(ObjectId.isValid(entityId) ? [{ _id: new ObjectId(entityId) }] : []),
          ],
        },
        {
          projection: {
            _id: 1,
            id: 1,
            description_en: 1,
            description_pl: 1,
            parameters: 1,
            updatedAt: 1,
          },
        }
      );
    }

    const summary = {
      run: {
        id: normalizeId(run.id || run._id),
        pathId: normalizeId(run.pathId),
        pathName: run.pathName || null,
        status: run.status || null,
        entityId: entityId || null,
        entityType: run.entityType || null,
        errorMessage: run.errorMessage || null,
        createdAt: toDateString(run.createdAt),
        startedAt: toDateString(run.startedAt),
        finishedAt: toDateString(run.finishedAt),
      },
      nodes: nodes.map((node) => ({
        nodeId: normalizeId(node.nodeId),
        nodeType: node.nodeType || null,
        nodeTitle: node.nodeTitle || null,
        status: node.status || null,
        errorMessage: node.errorMessage || null,
        createdAt: toDateString(node.createdAt),
        finishedAt: toDateString(node.finishedAt),
      })),
      translationDbUpdate: dbUpdateNode
        ? {
            nodeId: normalizeId(dbUpdateNode.nodeId),
            nodeTitle: dbUpdateNode.nodeTitle || null,
            status: dbUpdateNode.status || null,
            errorMessage: dbUpdateNode.errorMessage || null,
            inputs: asRecord(dbUpdateNode.inputs) || {},
            bundle,
            debugPayload,
            result: dbResult,
          }
        : null,
      translationExtracts: nodes
        .filter((node) =>
          node.nodeType === 'regex' &&
          (byTitle('description')(node.nodeTitle) || byTitle('parameters')(node.nodeTitle))
        )
        .map((node) => ({
          nodeId: normalizeId(node.nodeId),
          nodeTitle: node.nodeTitle || null,
          status: node.status || null,
          inputs: asRecord(node.inputs) || {},
          outputs: asRecord(node.outputs) || {},
        })),
      triggerContext,
      product: product
        ? {
            id: normalizeId(product.id || product._id),
            updatedAt: toDateString(product.updatedAt),
            description_en: typeof product.description_en === 'string' ? product.description_en : null,
            description_pl: typeof product.description_pl === 'string' ? product.description_pl : null,
            parameters: summarizeParameters(product.parameters),
          }
        : null,
      recentEvents: events.slice(-15).map((event) => ({
        at: toDateString(event.createdAt),
        nodeId: normalizeId(event.nodeId),
        nodeType: event.nodeType || null,
        status: event.status || null,
        level: event.level || null,
        message: event.message || null,
      })),
    };

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await client.close().catch(() => {});
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
