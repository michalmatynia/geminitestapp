'use strict';
const { MongoClient } = require('mongodb');
(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'app');
  const doc = await db.collection('ai_paths_settings').findOne({ key: 'ai_paths_config_path_syr8f4' });
  if (!doc) { console.log('No stored config found'); await client.close(); return; }
  const cfg = JSON.parse(doc.value);
  const pNode = cfg.nodes.find(function(n) { return n.id === 'node-parser-params'; });
  const qNode = cfg.nodes.find(function(n) { return n.id === 'node-query-params'; });
  const catalogIdMapping = pNode && pNode.config && pNode.config.parser && pNode.config.parser.mappings
    ? pNode.config.parser.mappings.catalogId
    : null;
  const hasBundleEdge = cfg.edges.some(function(e) {
    return e.from === 'node-parser-params' && e.to === 'node-query-params' && e.fromPort === 'bundle' && e.toPort === 'bundle';
  });
  const queryTemplate = qNode && qNode.config && qNode.config.database && qNode.config.database.query
    ? qNode.config.database.query.queryTemplate
    : null;
  const willTriggerUpgrade = (
    typeof catalogIdMapping !== 'string' ||
    catalogIdMapping.trim() === ''
  );
  console.log(JSON.stringify({
    storedVersion: cfg.version,
    catalogIdMapping: catalogIdMapping,
    queryTemplate: queryTemplate,
    hasBundleEdgeToQuery: hasBundleEdge,
    willTriggerUpgradeAfterOurChange: willTriggerUpgrade,
  }, null, 2));
  await client.close();
})().catch(function(e) { console.error(e.message); process.exit(1); });
