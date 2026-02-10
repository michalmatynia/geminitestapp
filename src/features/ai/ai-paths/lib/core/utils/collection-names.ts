import type {
  AiNode,
  DatabaseConfig,
  DbQueryConfig,
  DbSchemaConfig,
  PathConfig,
} from '@/shared/types/domain/ai-paths';

const CANONICAL_COLLECTION_NAMES = new Set<string>([
  'products',
  'product_drafts',
  'product_categories',
  'product_category_assignments',
  'product_tags',
  'product_tag_assignments',
  'catalogs',
  'image_files',
  'product_listings',
  'product_ai_jobs',
  'product_producer_assignments',
  'integrations',
  'integration_connections',
  'settings',
  'users',
  'user_preferences',
  'languages',
  'system_logs',
  'notes',
  'tags',
  'categories',
  'notebooks',
  'noteFiles',
  'themes',
  'chatbot_sessions',
  'auth_security_attempts',
  'auth_security_profiles',
  'auth_login_challenges',
]);

const COLLECTION_NAME_ALIASES: Record<string, string> = {
  product_draft: 'product_drafts',
  productdraft: 'product_drafts',
  product_category: 'product_categories',
  productcategory: 'product_categories',
  product_category_assignment: 'product_category_assignments',
  productcategoryassignment: 'product_category_assignments',
  product_tag: 'product_tags',
  producttag: 'product_tags',
  product_tag_assignment: 'product_tag_assignments',
  producttagassignment: 'product_tag_assignments',
  catalog: 'catalogs',
  imagefile: 'image_files',
  image_file: 'image_files',
  product_listing: 'product_listings',
  productlisting: 'product_listings',
  product_ai_job: 'product_ai_jobs',
  productaijob: 'product_ai_jobs',
  product_producer_assignment: 'product_producer_assignments',
  productproducerassignment: 'product_producer_assignments',
  integration: 'integrations',
  integration_connection: 'integration_connections',
  integrationconnection: 'integration_connections',
  setting: 'settings',
  user: 'users',
  userpreference: 'user_preferences',
  language: 'languages',
  system_log: 'system_logs',
  systemlog: 'system_logs',
  note: 'notes',
  tag: 'tags',
  category: 'categories',
  notebook: 'notebooks',
  note_file: 'noteFiles',
  note_files: 'noteFiles',
  notefile: 'noteFiles',
  notefiles: 'noteFiles',
  theme: 'themes',
  chatbot_session: 'chatbot_sessions',
  chatbotsession: 'chatbot_sessions',
  auth_security_attempt: 'auth_security_attempts',
  authsecurityattempt: 'auth_security_attempts',
  auth_security_profile: 'auth_security_profiles',
  authsecurityprofile: 'auth_security_profiles',
  auth_login_challenge: 'auth_login_challenges',
  authloginchallenge: 'auth_login_challenges',
};

const normalizeCollectionAliasKey = (value: string): string =>
  value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .replace(/__+/g, '_')
    .toLowerCase();

export const canonicalizeAiPathsCollectionName = (collection: string): string => {
  const trimmed = typeof collection === 'string' ? collection.trim() : '';
  if (!trimmed) return collection;

  if (CANONICAL_COLLECTION_NAMES.has(trimmed)) {
    return trimmed;
  }

  const normalizedKey = normalizeCollectionAliasKey(trimmed);
  const aliasTarget = COLLECTION_NAME_ALIASES[normalizedKey];
  if (aliasTarget) {
    return aliasTarget;
  }

  if (CANONICAL_COLLECTION_NAMES.has(normalizedKey)) {
    return normalizedKey;
  }

  return trimmed;
};

const migrateDbQueryConfig = (
  query: DbQueryConfig | undefined
): { query: DbQueryConfig | undefined; changed: boolean } => {
  if (!query) return { query, changed: false };
  const collection = canonicalizeAiPathsCollectionName(query.collection);
  if (collection === query.collection) {
    return { query, changed: false };
  }
  return {
    query: {
      ...query,
      collection,
    },
    changed: true,
  };
};

const migrateDbSchemaConfig = (
  schemaConfig: DbSchemaConfig | undefined
): { schemaConfig: DbSchemaConfig | undefined; changed: boolean } => {
  if (!schemaConfig || !Array.isArray(schemaConfig.collections)) {
    return { schemaConfig, changed: false };
  }

  let changed = false;
  const collections = schemaConfig.collections.map((collection: string): string => {
    const canonical = canonicalizeAiPathsCollectionName(collection);
    if (canonical !== collection) changed = true;
    return canonical;
  });

  if (!changed) {
    return { schemaConfig, changed: false };
  }

  return {
    schemaConfig: {
      ...schemaConfig,
      collections,
    },
    changed: true,
  };
};

const migrateSchemaSnapshotCollections = (
  databaseConfig: DatabaseConfig
): { schemaSnapshot: DatabaseConfig['schemaSnapshot']; changed: boolean } => {
  const snapshot = databaseConfig.schemaSnapshot;
  if (!snapshot) return { schemaSnapshot: snapshot, changed: false };

  let changed = false;
  const collections = snapshot.collections.map((collection) => {
    const canonical = canonicalizeAiPathsCollectionName(collection.name);
    if (canonical !== collection.name) changed = true;
    return canonical === collection.name ? collection : { ...collection, name: canonical };
  });

  const sources = snapshot.sources
    ? Object.fromEntries(
      Object.entries(snapshot.sources).map(([provider, source]) => {
        if (!source) return [provider, source];
        const sourceCollections = source.collections.map((collection) => {
          const canonical = canonicalizeAiPathsCollectionName(collection.name);
          if (canonical !== collection.name) changed = true;
          return canonical === collection.name ? collection : { ...collection, name: canonical };
        });
        return [
          provider,
          changed
            ? {
              ...source,
              collections: sourceCollections,
            }
            : source,
        ];
      })
    )
    : snapshot.sources;

  if (!changed) {
    return { schemaSnapshot: snapshot, changed: false };
  }

  return {
    schemaSnapshot: {
      ...snapshot,
      collections,
      ...(sources ? { sources } : {}),
    },
    changed: true,
  };
};

export const migrateDatabaseConfigCollections = (
  databaseConfig: DatabaseConfig | undefined
): { databaseConfig: DatabaseConfig | undefined; changed: boolean } => {
  if (!databaseConfig) return { databaseConfig, changed: false };

  let changed = false;
  let nextDatabaseConfig: DatabaseConfig = databaseConfig;

  const queryResult = migrateDbQueryConfig(databaseConfig.query);
  if (queryResult.changed) {
    changed = true;
    nextDatabaseConfig = {
      ...nextDatabaseConfig,
      query: queryResult.query,
    };
  }

  const snapshotResult = migrateSchemaSnapshotCollections(nextDatabaseConfig);
  if (snapshotResult.changed) {
    changed = true;
    nextDatabaseConfig = {
      ...nextDatabaseConfig,
      schemaSnapshot: snapshotResult.schemaSnapshot,
    };
  }

  return {
    databaseConfig: nextDatabaseConfig,
    changed,
  };
};

const migrateNodeCollections = (node: AiNode): { node: AiNode; changed: boolean } => {
  if (!node.config) return { node, changed: false };

  let changed = false;
  let nextConfig = { ...node.config };

  const dbQueryResult = migrateDbQueryConfig(nextConfig.dbQuery);
  if (dbQueryResult.changed) {
    changed = true;
    nextConfig = {
      ...nextConfig,
      dbQuery: dbQueryResult.query!,
    };
  }

  const pollDbQueryResult = migrateDbQueryConfig(nextConfig.poll?.dbQuery);
  if (pollDbQueryResult.changed && nextConfig.poll) {
    changed = true;
    nextConfig = {
      ...nextConfig,
      poll: {
        ...nextConfig.poll,
        dbQuery: pollDbQueryResult.query!,
      },
    };
  }

  const databaseResult = migrateDatabaseConfigCollections(nextConfig.database);
  if (databaseResult.changed) {
    changed = true;
    nextConfig = {
      ...nextConfig,
      database: databaseResult.databaseConfig!,
    };
  }

  const schemaResult = migrateDbSchemaConfig(nextConfig.db_schema);
  if (schemaResult.changed) {
    changed = true;
    nextConfig = {
      ...nextConfig,
      db_schema: schemaResult.schemaConfig!,
    };
  }

  if (!changed) {
    return { node, changed: false };
  }

  return {
    node: {
      ...node,
      config: nextConfig,
    },
    changed: true,
  };
};

export const migratePathConfigCollections = (
  config: PathConfig
): { config: PathConfig; changed: boolean } => {
  let changed = false;
  const nodes = config.nodes.map((node: AiNode): AiNode => {
    const result = migrateNodeCollections(node);
    if (result.changed) changed = true;
    return result.node;
  });

  if (!changed) {
    return { config, changed: false };
  }

  return {
    config: {
      ...config,
      nodes,
    },
    changed: true,
  };
};
