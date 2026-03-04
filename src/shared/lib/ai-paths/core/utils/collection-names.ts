import type {
  AiNode,
  PathConfig,
} from '@/shared/contracts/ai-paths';

const CANONICAL_COLLECTION_NAMES = new Set<string>([
  'products',
  'product_drafts',
  'product_categories',
  'product_parameters',
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
  product_parameter: 'product_parameters',
  productparameter: 'product_parameters',
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

export type AiPathsCollectionAliasIssue = {
  nodeId: string;
  location: 'database.query.collection';
  value: string;
  canonical: string;
};

export const findPathConfigCollectionAliasIssues = (
  pathConfig: Pick<PathConfig, 'nodes'>
): AiPathsCollectionAliasIssue[] =>
  (pathConfig.nodes ?? []).flatMap((node: AiNode): AiPathsCollectionAliasIssue[] => {
    const databaseConfig = node.config?.database;
    if (!databaseConfig || typeof databaseConfig !== 'object') return [];
    const query = databaseConfig.query;
    if (!query || typeof query.collection !== 'string') return [];
    const canonical = canonicalizeAiPathsCollectionName(query.collection);
    if (canonical === query.collection) return [];
    return [
      {
        nodeId: node.id,
        location: 'database.query.collection',
        value: query.collection,
        canonical,
      },
    ];
  });
