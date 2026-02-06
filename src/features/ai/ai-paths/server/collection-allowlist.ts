import 'server-only';

const DEFAULT_COLLECTION_ALLOWLIST = [
  'products',
  'product_drafts',
  'product_categories',
  'product_tags',
  'catalogs',
  'image_files',
  'product_listings',
  'product_ai_jobs',
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

const toSnakeCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .replace(/__+/g, '_')
    .toLowerCase();

const pluralize = (value: string): string => {
  if (!value) return value;
  if (value.endsWith('s')) return value;
  if (value.endsWith('y') && !/[aeiou]y$/.test(value)) {
    return `${value.slice(0, -1)}ies`;
  }
  if (value.endsWith('x') || value.endsWith('ch') || value.endsWith('sh') || value.endsWith('z')) {
    return `${value}es`;
  }
  return `${value}s`;
};

const singularize = (value: string): string => {
  if (!value) return value;
  if (value.endsWith('ies') && value.length > 3) {
    return `${value.slice(0, -3)}y`;
  }
  if (
    value.endsWith('ses') ||
    value.endsWith('xes') ||
    value.endsWith('ches') ||
    value.endsWith('shes') ||
    value.endsWith('zes')
  ) {
    return value.slice(0, -2);
  }
  if (value.endsWith('s') && value.length > 1) {
    return value.slice(0, -1);
  }
  return value;
};

const buildCollectionCandidates = (collection: string): Set<string> => {
  const candidates = new Set<string>();
  if (!collection) return candidates;
  const trimmed = collection.trim();
  if (!trimmed) return candidates;
  const lower = normalizeCollectionName(trimmed);
  const snake = toSnakeCase(trimmed);
  candidates.add(lower);
  candidates.add(snake);
  candidates.add(pluralize(snake));
  candidates.add(singularize(snake));
  candidates.add(pluralize(lower));
  candidates.add(singularize(lower));
  return candidates;
};

type AllowlistConfig = {
  allowAll: boolean;
  allowed: Set<string>;
};

const buildAllowlist = (): AllowlistConfig => {
  const raw = process.env.AI_PATHS_DB_COLLECTION_ALLOWLIST;
  if (!raw || !raw.trim()) {
    return {
      allowAll: false,
      allowed: new Set(DEFAULT_COLLECTION_ALLOWLIST),
    };
  }

  const tokens = parseAllowlist(raw);
  const lowered = tokens.map((token: string) => normalizeCollectionName(token));
  const allowAll = lowered.includes('*') || lowered.includes('all');
  const includeDefault = lowered.includes('default');

  const allowed = new Set<string>();
  if (includeDefault) {
    DEFAULT_COLLECTION_ALLOWLIST.forEach((collection: string) =>
      allowed.add(normalizeCollectionName(collection))
    );
  }

  tokens.forEach((token: string) => {
    const normalized = normalizeCollectionName(token);
    if (normalized === '*' || normalized === 'all' || normalized === 'default') return;
    allowed.add(normalized);
  });

  if (!allowAll && allowed.size === 0) {
    DEFAULT_COLLECTION_ALLOWLIST.forEach((collection: string) =>
      allowed.add(normalizeCollectionName(collection))
    );
  }

  return { allowAll, allowed };
};

const allowlistConfig = buildAllowlist();

export const isCollectionAllowed = (collection: string): boolean => {
  if (!collection) return false;
  if (allowlistConfig.allowAll) return true;
  const candidates = buildCollectionCandidates(collection);
  for (const candidate of candidates) {
    if (allowlistConfig.allowed.has(candidate)) return true;
  }
  return false;
};

export const getCollectionAllowlist = (): string[] => {
  if (allowlistConfig.allowAll) return ['*'];
  return Array.from(allowlistConfig.allowed).sort((a, b) => a.localeCompare(b));
};
