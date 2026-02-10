import 'server-only';

const DEFAULT_COLLECTION_ALLOWLIST = [
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
];

const parseAllowlist = (raw: string): string[] =>
  raw
    .split(/[,\\n]/)
    .map((value: string) => value.trim())
    .filter(Boolean);

const normalizeCollectionName = (value: string): string =>
  value.trim().toLowerCase();

type AllowlistConfig = {
  allowAll: boolean;
  allowed: Set<string>;
};

const buildAllowlist = (): AllowlistConfig => {
  const raw = process.env['AI_PATHS_DB_COLLECTION_ALLOWLIST'];
  if (!raw?.trim()) {
    return {
      allowAll: false,
      allowed: new Set(
        DEFAULT_COLLECTION_ALLOWLIST.map((collection: string) =>
          normalizeCollectionName(collection)
        )
      ),
    };
  }

  const tokens = parseAllowlist(raw);
  const lowered = tokens.map((token: string) => normalizeCollectionName(token));
  const allowAll = lowered.includes('*') || lowered.includes('all');
  const includeDefault = lowered.includes('default');

  const allowed = new Set<string>();
  if (includeDefault) {
    DEFAULT_COLLECTION_ALLOWLIST.forEach((collection: string) =>
      allowed.add(normalizeCollectionName(collection)),
    );
  }

  tokens.forEach((token: string) => {
    const normalized = normalizeCollectionName(token);
    if (normalized === '*' || normalized === 'all' || normalized === 'default')
      return;
    allowed.add(normalized);
  });

  if (!allowAll && allowed.size === 0) {
    DEFAULT_COLLECTION_ALLOWLIST.forEach((collection: string) =>
      allowed.add(normalizeCollectionName(collection)),
    );
  }

  return { allowAll, allowed };
};

const allowlistConfig = buildAllowlist();

export const isCollectionAllowed = (collection: string): boolean => {
  if (!collection) return false;
  if (allowlistConfig.allowAll) return true;
  return allowlistConfig.allowed.has(normalizeCollectionName(collection));
};

export const getCollectionAllowlist = (): string[] => {
  if (allowlistConfig.allowAll) return ['*'];
  return Array.from(allowlistConfig.allowed).sort((a, b) => a.localeCompare(b));
};
