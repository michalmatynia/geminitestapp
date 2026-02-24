import 'server-only';

import { ObjectId } from 'mongodb';

import {
  type UserPreferences,
  type UserPreferencesUpdate as UserPreferencesData,
  type JsonValue
} from '@/shared/contracts/auth';
import { operationFailedError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

const toMongoId = (id: string): ObjectId | string => {
  if (ObjectId.isValid(id) && id.length === 24) return new ObjectId(id);
  return id;
};

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

export type UserPreferencesRecord = UserPreferences;

type UserPreferencesDocument = {
  _id: string | ObjectId;
  userId: string;
  productListNameLocale: string | null;
  productListCatalogFilter: string | null;
  productListCurrencyCode: string | null;
  productListPageSize: number | null;
  productListThumbnailSource: 'file' | 'link' | 'base64' | null;
  productListFiltersCollapsedByDefault: boolean | null;
  productListAdvancedFilterPresets:
    UserPreferences['productListAdvancedFilterPresets'] | null;
  productListDraftIconColorMode: 'theme' | 'custom' | null;
  productListDraftIconColor: string | null;
  aiPathsActivePathId: string | null;
  imageStudioLastProjectId: string | null;
  caseResolverCaseListViewMode: 'hierarchy' | 'list' | null;
  caseResolverCaseListSortBy: 'updated' | 'created' | 'name' | null;
  caseResolverCaseListSortOrder: 'asc' | 'desc' | null;
  caseResolverCaseListSearchScope: 'all' | 'name' | 'folder' | 'content' | null;
  caseResolverCaseListFiltersCollapsedByDefault: boolean | null;
  adminMenuCollapsed: boolean | null;
  adminMenuFavorites: string[] | null;
  adminMenuSectionColors: Record<string, string> | null;
  adminMenuCustomEnabled: boolean | null;
  adminMenuCustomNav: JsonValue | null;
  cmsLastPageId: string | null;
  cmsActiveDomainId: string | null;
  cmsThemeOpenSections: string[];
  cmsThemeLogoWidth: number | null;
  cmsThemeLogoUrl: string | null;
  cmsPreviewEnabled: boolean | null;
  cmsSlideshowPauseOnHoverInEditor: boolean | null;
  createdAt: Date;
  updatedAt: Date;
};

const USER_PREFERENCES_COLLECTION = 'user_preferences';
const USER_PREFERENCES_CACHE_TTL_MS = parsePositiveInt(
  process.env['USER_PREFERENCES_CACHE_TTL_MS'],
  60_000
);
const IMMUTABLE_PREFERENCE_FIELDS = new Set([
  'id',
  '_id',
  'userId',
  'createdAt',
  'updatedAt',
]);

type CachedUserPreferences = {
  value: UserPreferencesRecord;
  fetchedAt: number;
};

const userPreferencesCache = new Map<string, CachedUserPreferences>();
const userPreferencesInflight = new Map<string, Promise<UserPreferencesRecord>>();

const getCanonicalPreferencesId = (userId: string): ObjectId | string =>
  toMongoId(userId);

const getUserPreferencesCacheKey = (userId: string): string =>
  String(getCanonicalPreferencesId(userId));

const getCachedUserPreferences = (cacheKey: string): UserPreferencesRecord | null => {
  const cached = userPreferencesCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() - cached.fetchedAt > USER_PREFERENCES_CACHE_TTL_MS) {
    userPreferencesCache.delete(cacheKey);
    return null;
  }
  return cached.value;
};

const setCachedUserPreferences = (cacheKey: string, value: UserPreferencesRecord): void => {
  userPreferencesCache.set(cacheKey, {
    value,
    fetchedAt: Date.now(),
  });
};

export const peekUserPreferencesCache = (
  userId: string,
  options?: { allowStale?: boolean }
): UserPreferencesRecord | null => {
  const cacheKey = getUserPreferencesCacheKey(userId);
  if (options?.allowStale) {
    return userPreferencesCache.get(cacheKey)?.value ?? null;
  }
  return getCachedUserPreferences(cacheKey);
};

export const warmUserPreferencesCache = (userId: string): void => {
  void getUserPreferences(userId).catch(() => {
    // no-op; warm-up must never throw
  });
};

export const invalidateUserPreferencesCache = (userId?: string): void => {
  if (userId) {
    const cacheKey = getUserPreferencesCacheKey(userId);
    userPreferencesCache.delete(cacheKey);
    userPreferencesInflight.delete(cacheKey);
    return;
  }
  userPreferencesCache.clear();
  userPreferencesInflight.clear();
};

const toUserPreferences = (doc: UserPreferencesDocument): UserPreferencesRecord => ({
  id: String(doc._id),
  userId: doc.userId,
  productListNameLocale: doc.productListNameLocale ?? 'name_en',
  productListCatalogFilter: doc.productListCatalogFilter ?? 'all',
  productListCurrencyCode: doc.productListCurrencyCode,
  productListPageSize: doc.productListPageSize ?? 12,
  productListThumbnailSource: doc.productListThumbnailSource ?? 'file',
  productListFiltersCollapsedByDefault: doc.productListFiltersCollapsedByDefault ?? false,
  productListAdvancedFilterPresets: doc.productListAdvancedFilterPresets ?? [],
  productListDraftIconColorMode: doc.productListDraftIconColorMode ?? 'theme',
  productListDraftIconColor: doc.productListDraftIconColor ?? '#60a5fa',
  aiPathsActivePathId: doc.aiPathsActivePathId ?? null,
  imageStudioLastProjectId: doc.imageStudioLastProjectId ?? null,
  caseResolverCaseListViewMode: doc.caseResolverCaseListViewMode ?? 'hierarchy',
  caseResolverCaseListSortBy: doc.caseResolverCaseListSortBy ?? 'updated',
  caseResolverCaseListSortOrder: doc.caseResolverCaseListSortOrder ?? 'desc',
  caseResolverCaseListSearchScope: doc.caseResolverCaseListSearchScope ?? 'all',
  caseResolverCaseListFiltersCollapsedByDefault:
    doc.caseResolverCaseListFiltersCollapsedByDefault ?? true,
  adminMenuCollapsed: doc.adminMenuCollapsed ?? false,
  adminMenuFavorites: doc.adminMenuFavorites ?? [],
  adminMenuSectionColors: doc.adminMenuSectionColors ?? {},
  adminMenuCustomEnabled: doc.adminMenuCustomEnabled ?? false,
  adminMenuCustomNav: doc.adminMenuCustomNav ?? [],
  cmsLastPageId: doc.cmsLastPageId ?? null,
  cmsActiveDomainId: doc.cmsActiveDomainId ?? null,
  cmsThemeOpenSections: doc.cmsThemeOpenSections ?? [],
  cmsThemeLogoWidth: doc.cmsThemeLogoWidth ?? null,
  cmsThemeLogoUrl: doc.cmsThemeLogoUrl ?? null,
  cmsPreviewEnabled: doc.cmsPreviewEnabled ?? null,
  cmsSlideshowPauseOnHoverInEditor: doc.cmsSlideshowPauseOnHoverInEditor ?? false,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

const defaultPreferences = (
  userId: string
): Omit<UserPreferencesRecord, 'id' | 'createdAt' | 'updatedAt'> => ({
  userId,
  productListNameLocale: 'name_en',
  productListCatalogFilter: 'all',
  productListCurrencyCode: 'PLN',
  productListPageSize: 12,
  productListThumbnailSource: 'file',
  productListFiltersCollapsedByDefault: false,
  productListAdvancedFilterPresets: [],
  productListDraftIconColorMode: 'theme',
  productListDraftIconColor: '#60a5fa',
  aiPathsActivePathId: null,
  imageStudioLastProjectId: null,
  caseResolverCaseListViewMode: 'hierarchy',
  caseResolverCaseListSortBy: 'updated',
  caseResolverCaseListSortOrder: 'desc',
  caseResolverCaseListSearchScope: 'all',
  caseResolverCaseListFiltersCollapsedByDefault: true,
  adminMenuCollapsed: false,
  adminMenuFavorites: [],
  adminMenuSectionColors: {},
  adminMenuCustomEnabled: false,
  adminMenuCustomNav: [],
  cmsLastPageId: null,
  cmsActiveDomainId: null,
  cmsThemeOpenSections: [],
  cmsThemeLogoWidth: null,
  cmsThemeLogoUrl: null,
  cmsPreviewEnabled: false,
  cmsSlideshowPauseOnHoverInEditor: false,
});

const sanitizeUserPreferencesUpdateData = (
  data: Partial<UserPreferencesData>
): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {};
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined) return;
    if (IMMUTABLE_PREFERENCE_FIELDS.has(key)) return;
    sanitized[key] = value;
  });
  return sanitized;
};

/**
 * Get user preferences by user ID
 * Creates default preferences if they don't exist
 */
export async function getUserPreferences(userId: string): Promise<UserPreferencesRecord> {
  if (!process.env['MONGODB_URI']) {
    throw operationFailedError('MongoDB is not configured.');
  }
  const canonicalId = getCanonicalPreferencesId(userId);
  const cacheKey = getUserPreferencesCacheKey(userId);
  const cached = getCachedUserPreferences(cacheKey);
  if (cached) return cached;

  const inflight = userPreferencesInflight.get(cacheKey);
  if (inflight) return inflight;

  const loadPromise = (async (): Promise<UserPreferencesRecord> => {
    const db = await getMongoDb();
    const collection = db.collection<UserPreferencesDocument>(USER_PREFERENCES_COLLECTION);
    const doc = await collection.findOne({ _id: canonicalId });

    if (doc) {
      const normalized = toUserPreferences(doc);
      setCachedUserPreferences(cacheKey, normalized);
      return normalized;
    }

    const now = new Date();
    const document: UserPreferencesDocument = {
      _id: canonicalId,
      ...defaultPreferences(userId),
      createdAt: now,
      updatedAt: now,
    };
    await collection.insertOne(document);
    const normalized = toUserPreferences(document);
    setCachedUserPreferences(cacheKey, normalized);
    return normalized;
  })().finally(() => {
    userPreferencesInflight.delete(cacheKey);
  });

  userPreferencesInflight.set(cacheKey, loadPromise);
  return loadPromise;
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  userId: string,
  data: Partial<UserPreferencesData>
): Promise<UserPreferencesRecord> {
  if (!process.env['MONGODB_URI']) {
    throw operationFailedError('MongoDB is not configured.');
  }
  const cacheKey = getUserPreferencesCacheKey(userId);
  const db = await getMongoDb();
  const collection = db.collection<UserPreferencesDocument>(USER_PREFERENCES_COLLECTION);
  const canonicalId = getCanonicalPreferencesId(userId);
  const now = new Date();
  const setData = sanitizeUserPreferencesUpdateData(data);
  const insertDefaults = {
    _id: canonicalId,
    ...defaultPreferences(userId),
    createdAt: now,
  } as Record<string, unknown>;
  for (const key of Object.keys(setData)) {
    delete insertDefaults[key];
  }
  const updateDoc: {
    $set: Record<string, unknown>;
    $setOnInsert?: Record<string, unknown>;
  } = {
    $set: {
      ...setData,
      updatedAt: now,
    },
  };
  if (Object.keys(insertDefaults).length > 0) {
    updateDoc.$setOnInsert = {
      ...insertDefaults,
    };
  }
  const result = await collection.findOneAndUpdate(
    { _id: canonicalId },
    updateDoc,
    { upsert: true, returnDocument: 'after' }
  );

  if (result && 'value' in result && result.value) {
    const normalized = toUserPreferences(result.value as UserPreferencesDocument);
    setCachedUserPreferences(cacheKey, normalized);
    return normalized;
  }
  if (result && !('value' in result) && result) {
    const normalized = toUserPreferences(result as unknown as UserPreferencesDocument);
    setCachedUserPreferences(cacheKey, normalized);
    return normalized;
  }

  const fallbackDoc = await collection.findOne({ _id: canonicalId });

  if (!fallbackDoc) {
    throw operationFailedError('Failed to update preferences', undefined, {
      userId,
    });
  }

  const normalized = toUserPreferences(fallbackDoc);
  setCachedUserPreferences(cacheKey, normalized);
  return normalized;
}

/**
 * Get or create preferences for user
 */
export async function getOrCreatePreferences(
  userId: string
): Promise<UserPreferencesRecord> {
  return getUserPreferences(userId);
}
