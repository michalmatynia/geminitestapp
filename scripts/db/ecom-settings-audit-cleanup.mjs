import { MongoClient, ObjectId } from 'mongodb';

const ECOM_SETTINGS_COLLECTION = 'ecom_settings';
const GENERIC_SETTINGS_COLLECTION = 'settings';
const PROVIDER_SOURCE_COLLECTION = 'ecommerce_provider_settings';

const ECOMMERCE_SETTING_KEYS = [
  'fastcomet_storage_config_v1',
  'payment_shipping_provider_settings_v1',
];

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const dropGenericSettings = args.has('--drop-generic-settings');

const readEnv = (key, fallback = '') => {
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : fallback;
};

const redactUri = (value) =>
  value.replace(/(mongodb(?:\+srv)?:\/\/)([^@/\s]+)@/g, (_match, prefix, auth) => {
    const [username] = auth.split(':');
    return `${prefix}${username || '***'}:***@`;
  });

const configs = [
  {
    id: 'ecom_local',
    role: 'ecommerce-local',
    uri: readEnv('ECOM_MONGODB_LOCAL_URI', 'mongodb://127.0.0.1:27021/ecom_local'),
    dbName: readEnv('ECOM_MONGODB_LOCAL_DB', 'ecom_local'),
    writeEcomSettings: true,
    dropGenericSettings: true,
  },
  {
    id: 'products_cloud',
    role: 'ecommerce-cloud',
    uri: readEnv('ECOM_MONGODB_CLOUD_URI'),
    dbName: readEnv('ECOM_MONGODB_CLOUD_DB', 'products_db'),
    writeEcomSettings: true,
    dropGenericSettings: true,
  },
  {
    id: 'app_local',
    role: 'main-app-local',
    uri: readEnv('MONGODB_LOCAL_URI', 'mongodb://127.0.0.1:27017/app'),
    dbName: readEnv('MONGODB_LOCAL_DB', 'app'),
    writeEcomSettings: true,
    dropGenericSettings: false,
  },
].filter((config) => config.uri.length > 0 && config.dbName.length > 0);

const clients = [];

const toDate = (value) => {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) return parsed;
  }
  return null;
};

const objectIdTimestamp = (value) => {
  if (value instanceof ObjectId) return value.getTimestamp();
  if (typeof value === 'string' && ObjectId.isValid(value)) {
    return new ObjectId(value).getTimestamp();
  }
  return null;
};

const latestDate = (...values) => {
  const dates = values.map(toDate).filter(Boolean);
  if (dates.length === 0) return null;
  return dates.reduce((latest, value) => (value > latest ? value : latest), dates[0]);
};

const candidateTimestamp = (doc) =>
  latestDate(
    doc.updatedAt,
    doc.syncedAt,
    doc.lastPushedAt,
    doc.createdAt,
    objectIdTimestamp(doc._id)
  );

const keyFromDocument = (doc) => {
  if (typeof doc.key === 'string' && doc.key.trim().length > 0) return doc.key.trim();
  if (typeof doc._id === 'string' && doc._id.trim().length > 0) return doc._id.trim();
  return null;
};

const valueFromDocument = (doc) => {
  if (Object.prototype.hasOwnProperty.call(doc, 'value')) return doc.value;
  if (Object.prototype.hasOwnProperty.call(doc, 'settings')) return doc.settings;
  return undefined;
};

const normalizeCandidate = ({ config, collectionName, doc, key }) => {
  if (!doc) return null;
  const docKey = keyFromDocument(doc);
  if (docKey !== key) return null;
  const value = valueFromDocument(doc);
  if (value === undefined || value === null) return null;
  const timestamp = candidateTimestamp(doc) ?? new Date(0);
  return {
    key,
    value,
    timestamp,
    source: {
      db: config.id,
      role: config.role,
      collection: collectionName,
      id: String(doc._id ?? ''),
      updatedAt: toDate(doc.updatedAt)?.toISOString() ?? null,
      syncedAt: toDate(doc.syncedAt)?.toISOString() ?? null,
      lastPushedAt: toDate(doc.lastPushedAt)?.toISOString() ?? null,
    },
  };
};

const connectConfig = async (config) => {
  const client = new MongoClient(config.uri, {
    connectTimeoutMS: 10_000,
    serverSelectionTimeoutMS: 10_000,
  });
  await client.connect();
  clients.push(client);
  return {
    ...config,
    client,
    db: client.db(config.dbName),
  };
};

const collectionExists = async (db, collectionName) => {
  const found = await db.listCollections({ name: collectionName }, { nameOnly: true }).toArray();
  return found.length > 0;
};

const readCandidate = async (connected, collectionName, key) => {
  if (!(await collectionExists(connected.db, collectionName))) return null;
  const doc = await connected.db.collection(collectionName).findOne({
    $or: [{ key }, { _id: key }],
  });
  return normalizeCandidate({ config: connected, collectionName, doc, key });
};

const readCounts = async (connected) => {
  const result = {};
  for (const collectionName of [
    GENERIC_SETTINGS_COLLECTION,
    ECOM_SETTINGS_COLLECTION,
    PROVIDER_SOURCE_COLLECTION,
  ]) {
    result[collectionName] = (await collectionExists(connected.db, collectionName))
      ? await connected.db.collection(collectionName).countDocuments()
      : null;
  }
  return result;
};

const selectCanonicalSettings = async (connectedConfigs) => {
  const selections = [];
  for (const key of ECOMMERCE_SETTING_KEYS) {
    const candidates = [];
    for (const connected of connectedConfigs) {
      for (const collectionName of [
        ECOM_SETTINGS_COLLECTION,
        GENERIC_SETTINGS_COLLECTION,
        PROVIDER_SOURCE_COLLECTION,
      ]) {
        const candidate = await readCandidate(connected, collectionName, key);
        if (candidate !== null) candidates.push(candidate);
      }
    }
    candidates.sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime());
    selections.push({
      key,
      selected: candidates[0] ?? null,
      candidates: candidates.map((candidate) => ({
        key: candidate.key,
        timestamp: candidate.timestamp.toISOString(),
        source: candidate.source,
      })),
    });
  }
  return selections;
};

const ensureEcomSettingsIndex = async (connected) => {
  await connected.db
    .collection(ECOM_SETTINGS_COLLECTION)
    .createIndex({ key: 1 }, { background: true, name: 'ecom_settings_key' });
};

const writeSelectedSetting = async (connected, selection, now) => {
  if (selection.selected === null) return null;
  await ensureEcomSettingsIndex(connected);
  const result = await connected.db.collection(ECOM_SETTINGS_COLLECTION).updateOne(
    { key: selection.key },
    {
      $set: {
        key: selection.key,
        value: selection.selected.value,
        source: selection.selected.source.role,
        sourceCollection: selection.selected.source.collection,
        sourceDb: selection.selected.source.db,
        sourceUpdatedAt: selection.selected.timestamp,
        syncedAt: now,
        updatedAt: selection.selected.timestamp,
      },
      $setOnInsert: {
        _id: selection.key,
        createdAt: now,
      },
    },
    { upsert: true }
  );
  return {
    db: connected.id,
    key: selection.key,
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    upsertedCount: result.upsertedCount,
  };
};

const dropGenericSettingsCollection = async (connected) => {
  if (!connected.dropGenericSettings) return null;
  if (!(await collectionExists(connected.db, GENERIC_SETTINGS_COLLECTION))) {
    return {
      db: connected.id,
      dropped: false,
      countBefore: 0,
      reason: 'collection-missing',
    };
  }
  const countBefore = await connected.db.collection(GENERIC_SETTINGS_COLLECTION).countDocuments();
  if (apply && dropGenericSettings) {
    await connected.db.collection(GENERIC_SETTINGS_COLLECTION).drop();
  }
  return {
    db: connected.id,
    dropped: apply && dropGenericSettings,
    countBefore,
  };
};

const run = async () => {
  const connectedConfigs = await Promise.all(configs.map(connectConfig));
  const countsBefore = Object.fromEntries(
    await Promise.all(
      connectedConfigs.map(async (connected) => [connected.id, await readCounts(connected)])
    )
  );
  const selections = await selectCanonicalSettings(connectedConfigs);
  const now = new Date();
  const writes = [];
  if (apply) {
    for (const connected of connectedConfigs.filter((config) => config.writeEcomSettings)) {
      for (const selection of selections) {
        const result = await writeSelectedSetting(connected, selection, now);
        if (result !== null) writes.push(result);
      }
    }
  }
  const drops = [];
  for (const connected of connectedConfigs) {
    const result = await dropGenericSettingsCollection(connected);
    if (result !== null) drops.push(result);
  }
  const countsAfter = Object.fromEntries(
    await Promise.all(
      connectedConfigs.map(async (connected) => [connected.id, await readCounts(connected)])
    )
  );

  return {
    mode: apply ? 'apply' : 'dry-run',
    dropGenericSettingsRequested: dropGenericSettings,
    targets: connectedConfigs.map((config) => ({
      id: config.id,
      role: config.role,
      dbName: config.dbName,
      uri: redactUri(config.uri),
    })),
    countsBefore,
    selections: selections.map((selection) => ({
      key: selection.key,
      selected:
        selection.selected === null
          ? null
          : {
              timestamp: selection.selected.timestamp.toISOString(),
              source: selection.selected.source,
            },
      candidates: selection.candidates,
    })),
    writes,
    drops,
    countsAfter,
  };
};

try {
  const report = await run();
  console.log(JSON.stringify(report, null, 2));
} finally {
  await Promise.all(clients.map((client) => client.close().catch(() => undefined)));
}
