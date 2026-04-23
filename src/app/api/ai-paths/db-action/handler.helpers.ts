import { ObjectId } from 'mongodb';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export type DbProvider = 'mongodb';
export type DbActionRequestedProvider = 'auto' | DbProvider | undefined;

export type ProviderResolutionErrorCode =
  | 'provider_not_configured'
  | 'action_not_supported';

export class ProviderResolutionError extends Error {
  public readonly code: ProviderResolutionErrorCode;
  public readonly provider: DbProvider;

  constructor(code: ProviderResolutionErrorCode, provider: DbProvider, message: string) {
    super(message);
    this.name = 'ProviderResolutionError';
    this.code = code;
    this.provider = provider;
  }
}

export const isProviderResolutionError = (error: unknown): error is ProviderResolutionError =>
  error instanceof ProviderResolutionError;

export const withProviderPayload = (
  provider: DbProvider,
  requestedProvider: DbActionRequestedProvider,
  payload: Record<string, unknown>
): Record<string, unknown> => ({
  ...payload,
  requestedProvider: requestedProvider ?? 'auto',
  resolvedProvider: provider,
});

export const expandFilter = (
  filter: Record<string, unknown>,
  collection: string
): Record<string, unknown> => {
  const normalizedCollection = collection.trim().toLowerCase();
  if (normalizedCollection !== 'products' && normalizedCollection !== 'product_drafts') {
    return filter;
  }

  const keys = Object.keys(filter);
  if (keys.length === 1 && keys[0] === 'id' && typeof filter['id'] === 'string') {
    const id = filter['id'];
    return {
      $or: [{ id }, { _id: id }],
    };
  }

  return filter;
};

export const coerceQuery = (value: unknown): Record<string, unknown> => {
  if (value === null || value === undefined) return {};
  if (typeof value === 'string') {
    if (value.trim() === '') return {};
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch (error) {
      void ErrorSystem.captureException(error);
      return {};
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

export const looksLikeObjectId = (value: string): boolean => /^[0-9a-fA-F]{24}$/.test(value);

export const normalizeObjectId = (
  query: Record<string, unknown>,
  idType?: string
): Record<string, unknown> => {
  if (idType !== 'objectId') return query;
  const next = { ...query };
  const idValue = next['_id'];
  if (typeof idValue === 'string' && looksLikeObjectId(idValue)) {
    next['_id'] = new ObjectId(idValue);
  }
  return next;
};

export const normalizeUpdateDoc = (update: unknown): Record<string, unknown> | unknown[] | null => {
  if (Array.isArray(update)) return update as unknown[];
  if (update !== null && typeof update === 'object') {
    const casted = update as Record<string, unknown>;
    const keys = Object.keys(casted);
    if (keys.some((key: string) => key.startsWith('$'))) {
      return casted;
    }
    return { $set: casted };
  }
  return null;
};

// Collections edited through the internal AI-paths DB action route should receive
// an `updatedAt` stamp whenever a document mutation is applied.
export const AUTO_UPDATED_AT_COLLECTIONS = new Set<string>([
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
  'notefiles',
  'themes',
  'chatbot_sessions',
  'auth_security_attempts',
  'auth_security_profiles',
  'auth_login_challenges',
]);

export const shouldAutoStampUpdatedAt = (collection: string): boolean =>
  AUTO_UPDATED_AT_COLLECTIONS.has(collection.trim().toLowerCase());

export const applyUpdatedAtToUpdateDoc = (
  update: Record<string, unknown> | unknown[],
  now: Date
): Record<string, unknown> | unknown[] => {
  if (Array.isArray(update)) {
    return [...update, { $set: { updatedAt: now } }];
  }

  const hasOperator = Object.keys(update).some((key: string): boolean => key.startsWith('$'));
  if (!hasOperator) {
    return { ...update, updatedAt: now };
  }

  const nextUpdate = { ...update };
  const existingSetRaw = nextUpdate['$set'];
  const existingSet =
    existingSetRaw !== undefined && existingSetRaw !== null && typeof existingSetRaw === 'object' && !Array.isArray(existingSetRaw)
      ? (existingSetRaw as Record<string, unknown>)
      : {};

  nextUpdate['$set'] = { ...existingSet, updatedAt: now };
  return nextUpdate;
};

export const applyUpdatedAtToReplacement = (
  replacement: Record<string, unknown>,
  now: Date
): Record<string, unknown> => ({
  ...replacement,
  updatedAt: now,
});

export const normalizeReplaceDoc = (update: unknown): Record<string, unknown> | null => {
  if (update !== null && typeof update === 'object' && !Array.isArray(update)) {
    const casted = update as Record<string, unknown>;
    const keys = Object.keys(casted);
    if (keys.some((key: string) => key.startsWith('$'))) {
      return null;
    }
    return casted;
  }
  return null;
};

export const extractFlatUpdates = (update: unknown): Record<string, unknown> | null => {
  if (update !== null && typeof update === 'object' && !Array.isArray(update)) {
    const casted = update as Record<string, unknown>;
    const keys = Object.keys(casted);
    if (!keys.some((key: string) => key.startsWith('$'))) {
      return casted;
    }
  }
  return null;
};
