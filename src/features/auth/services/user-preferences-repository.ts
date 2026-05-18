import 'server-only';

import { ObjectId } from 'mongodb';

import {
  type UserPreferences,
  type UserPreferencesUpdate as UserPreferencesData,
} from '@/shared/contracts/auth';
import type { JsonValue } from '@/shared/contracts/json';
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
  productListShowTriggerRunFeedback: boolean | null;
  productListAdvancedFilterPresets: UserPreferences['productListAdvancedFilterPresets'] | null;
  productListAppliedAdvancedFilter: string | null;
  productListAppliedAdvancedFilterPresetId: string | null;
  productListDraftIconColorMode: 'theme' | 'custom' | null;
  productListDraftIconColor: string | null;
  aiPathsActivePathId: string | null;
  imageStudioLastProjectId: string | null;
  caseResolverCaseListViewMode: 'hierarchy' | 'list' | null;
  caseResolverCaseListSortBy: | 'updated' | 'created' | 'happeningDate' | 'name' | 'status' | 'signature' | 'locked' | 'sent' | null;
  caseResolverCaseListSortOrder: 'asc' | 'desc' | null;
  caseResolverCaseListSearchScope: 'all' | 'name' | 'folder' | 'content' | null;
  caseResolverCaseListFiltersCollapsedByDefault: boolean | null;
  caseResolverCaseListShowNestedContent: boolean | null;
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
const USER_PREFERENCES_CACHE_TTL_MS = parsePositiveInt(process.env['USER_PREFERENCES_CACHE_TTL_MS'], 60_000);
const IMMUTABLE_FIELDS = new Set(['id', '_id', 'userId', 'createdAt', 'updatedAt']);

type CachedUserPreferences = { value: UserPreferencesRecord; fetchedAt: number; };
const userPreferencesCache = new Map<string, CachedUserPreferences>();
const userPreferencesInflight = new Map<string, Promise<UserPreferencesRecord>>();

const getCacheKey = (userId: string): string => String(toMongoId(userId));

const getCachedPrefs = (cacheKey: string): UserPreferencesRecord | null => {
  const cached = userPreferencesCache.get(cacheKey);
  if (cached === undefined) return null;
  if (Date.now() - cached.fetchedAt > USER_PREFERENCES_CACHE_TTL_MS) {
    userPreferencesCache.delete(cacheKey); return null;
  }
  return cached.value;
};

const setCachedPrefs = (cacheKey: string, value: UserPreferencesRecord): void => {
  userPreferencesCache.set(cacheKey, { value, fetchedAt: Date.now() });
};

export const peekUserPreferencesCache = (userId: string, options?: { allowStale?: boolean }): UserPreferencesRecord | null => {
  const key = getCacheKey(userId);
  if (options?.allowStale === true) {
    return userPreferencesCache.get(key)?.value ?? null;
  }
  return getCachedPrefs(key);
};

export const warmUserPreferencesCache = (userId: string): void => {
  void getUserPreferences(userId).catch(() => {});
};

export const invalidateUserPreferencesCache = (userId?: string): void => {
  if (userId !== undefined) {
    const key = getCacheKey(userId); userPreferencesCache.delete(key); userPreferencesInflight.delete(key);
    return;
  }
  userPreferencesCache.clear(); userPreferencesInflight.clear();
};

type ProductPrefs = Pick<UserPreferences, 'productListNameLocale' | 'productListCatalogFilter' | 'productListCurrencyCode' | 'productListPageSize' | 'productListThumbnailSource' | 'productListFiltersCollapsedByDefault' | 'productListShowTriggerRunFeedback' | 'productListAdvancedFilterPresets' | 'productListAppliedAdvancedFilter' | 'productListAppliedAdvancedFilterPresetId' | 'productListDraftIconColorMode' | 'productListDraftIconColor'>;
type CaseResolverPrefs = Pick<UserPreferences, 'caseResolverCaseListViewMode' | 'caseResolverCaseListSortBy' | 'caseResolverCaseListSortOrder' | 'caseResolverCaseListSearchScope' | 'caseResolverCaseListFiltersCollapsedByDefault' | 'caseResolverCaseListShowNestedContent'>;
type AdminMenuPrefs = Pick<UserPreferences, 'adminMenuCollapsed' | 'adminMenuFavorites' | 'adminMenuSectionColors' | 'adminMenuCustomEnabled' | 'adminMenuCustomNav'>;
type CmsPrefs = Pick<UserPreferences, 'cmsLastPageId' | 'cmsActiveDomainId' | 'cmsThemeOpenSections' | 'cmsThemeLogoWidth' | 'cmsThemeLogoUrl' | 'cmsPreviewEnabled' | 'cmsSlideshowPauseOnHoverInEditor'>;

const getPref = <T>(value: T | null | undefined, defaultValue: T): T => {
  return value ?? defaultValue;
};

const toProductPreferences = (doc: UserPreferencesDocument): ProductPrefs => ({
  productListNameLocale: getPref(doc.productListNameLocale, 'name_en'),
  productListCatalogFilter: getPref(doc.productListCatalogFilter, 'all'),
  productListCurrencyCode: doc.productListCurrencyCode,
  productListPageSize: getPref(doc.productListPageSize, 12),
  productListThumbnailSource: getPref(doc.productListThumbnailSource, 'file'),
  productListFiltersCollapsedByDefault: getPref(doc.productListFiltersCollapsedByDefault, true),
  productListShowTriggerRunFeedback: getPref(doc.productListShowTriggerRunFeedback, true),
  productListAdvancedFilterPresets: getPref(doc.productListAdvancedFilterPresets, []),
  productListAppliedAdvancedFilter: getPref(doc.productListAppliedAdvancedFilter, null),
  productListAppliedAdvancedFilterPresetId: getPref(doc.productListAppliedAdvancedFilterPresetId, null),
  productListDraftIconColorMode: getPref(doc.productListDraftIconColorMode, 'theme'),
  productListDraftIconColor: getPref(doc.productListDraftIconColor, '#60a5fa'),
});

const toCaseResolverPreferences = (doc: UserPreferencesDocument): CaseResolverPrefs => ({
  caseResolverCaseListViewMode: getPref(doc.caseResolverCaseListViewMode, 'hierarchy'),
  caseResolverCaseListSortBy: getPref(doc.caseResolverCaseListSortBy, 'updated'),
  caseResolverCaseListSortOrder: getPref(doc.caseResolverCaseListSortOrder, 'desc'),
  caseResolverCaseListSearchScope: getPref(doc.caseResolverCaseListSearchScope, 'all'),
  caseResolverCaseListFiltersCollapsedByDefault: getPref(doc.caseResolverCaseListFiltersCollapsedByDefault, true),
  caseResolverCaseListShowNestedContent: getPref(doc.caseResolverCaseListShowNestedContent, true),
});

const toAdminMenuPreferences = (doc: UserPreferencesDocument): AdminMenuPrefs => ({
  adminMenuCollapsed: getPref(doc.adminMenuCollapsed, false),
  adminMenuFavorites: getPref(doc.adminMenuFavorites, []),
  adminMenuSectionColors: getPref(doc.adminMenuSectionColors, {}),
  adminMenuCustomEnabled: getPref(doc.adminMenuCustomEnabled, false),
  adminMenuCustomNav: getPref(doc.adminMenuCustomNav, []),
});

const toCmsPreferences = (doc: UserPreferencesDocument): CmsPrefs => ({
  cmsLastPageId: getPref(doc.cmsLastPageId, null),
  cmsActiveDomainId: getPref(doc.cmsActiveDomainId, null),
  cmsThemeOpenSections: getPref(doc.cmsThemeOpenSections, []),
  cmsThemeLogoWidth: getPref(doc.cmsThemeLogoWidth, null),
  cmsThemeLogoUrl: getPref(doc.cmsThemeLogoUrl, null),
  cmsPreviewEnabled: getPref(doc.cmsPreviewEnabled, null),
  cmsSlideshowPauseOnHoverInEditor: getPref(doc.cmsSlideshowPauseOnHoverInEditor, false),
});

const toUserPreferences = (doc: UserPreferencesDocument): UserPreferencesRecord => ({
  id: String(doc._id),
  userId: doc.userId,
  ...toProductPreferences(doc),
  ...toCaseResolverPreferences(doc),
  ...toAdminMenuPreferences(doc),
  ...toCmsPreferences(doc),
  aiPathsActivePathId: doc.aiPathsActivePathId ?? null,
  imageStudioLastProjectId: doc.imageStudioLastProjectId ?? null,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

const sanitizeUpdate = (data: Partial<UserPreferencesData>): Record<string, unknown> => {
  const s: Record<string, unknown> = {};
  Object.entries(data).forEach(([k, v]) => { if (v !== undefined && !IMMUTABLE_FIELDS.has(k)) s[k] = v; });
  return s;
};

const isPrefsDoc = (v: unknown): v is UserPreferencesDocument => {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const r = v as Record<string, unknown>;
  return typeof r['userId'] === 'string' && r['createdAt'] instanceof Date && r['updatedAt'] instanceof Date;
};

export async function getUserPreferences(userId: string): Promise<UserPreferencesRecord> {
  const mongoUri = process.env['MONGODB_URI'];
  if (typeof mongoUri !== 'string' || mongoUri.length === 0) throw operationFailedError('MongoDB is not configured.');
  const id = toMongoId(userId); const key = getCacheKey(userId);
  const cached = getCachedPrefs(key); if (cached !== null) return cached;
  const inflight = userPreferencesInflight.get(key); if (inflight !== undefined) return inflight;

  const promise = (async (): Promise<UserPreferencesRecord> => {
    const db = await getMongoDb(); const col = db.collection<UserPreferencesDocument>(USER_PREFERENCES_COLLECTION);
    const doc = await col.findOne({ _id: id });
    if (doc !== null) { const norm = toUserPreferences(doc); setCachedPrefs(key, norm); return norm; }
    const now = new Date(); const document: UserPreferencesDocument = { _id: id, ...defaultPreferences(userId), createdAt: now, updatedAt: now };
    await col.insertOne(document); const norm = toUserPreferences(document); setCachedPrefs(key, norm); return norm;
  })().finally(() => { userPreferencesInflight.delete(key); });

  userPreferencesInflight.set(key, promise); return promise;
}

const defaultPreferences = (userId: string): Omit<UserPreferencesRecord, 'id' | 'createdAt' | 'updatedAt'> => ({
  userId,
  productListNameLocale: 'name_en',
  productListCatalogFilter: 'all',
  productListCurrencyCode: 'PLN',
  productListPageSize: 12,
  productListThumbnailSource: 'file',
  productListFiltersCollapsedByDefault: true,
  productListShowTriggerRunFeedback: true,
  productListAdvancedFilterPresets: [],
  productListAppliedAdvancedFilter: null,
  productListAppliedAdvancedFilterPresetId: null,
  productListDraftIconColorMode: 'theme',
  productListDraftIconColor: '#60a5fa',
  aiPathsActivePathId: null,
  imageStudioLastProjectId: null,
  caseResolverCaseListViewMode: 'hierarchy',
  caseResolverCaseListSortBy: 'updated',
  caseResolverCaseListSortOrder: 'desc',
  caseResolverCaseListSearchScope: 'all',
  caseResolverCaseListFiltersCollapsedByDefault: true,
  caseResolverCaseListShowNestedContent: true,
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

const getFinalUpdateDoc = (id: string | ObjectId, userId: string, setData: Record<string, unknown>, now: Date): { $set: Record<string, unknown>; $setOnInsert?: Record<string, unknown>; } => {
  const insertDefaults: Record<string, unknown> = { _id: id, ...defaultPreferences(userId), createdAt: now };
  for (const k of Object.keys(setData)) {
    delete insertDefaults[k];
  }
  const updateDoc: { $set: Record<string, unknown>; $setOnInsert?: Record<string, unknown>; } = {
    $set: { ...setData, updatedAt: now }
  };
  if (Object.keys(insertDefaults).length > 0) {
    updateDoc.$setOnInsert = { ...insertDefaults };
  }
  return updateDoc;
};

export async function updateUserPreferences(userId: string, data: Partial<UserPreferencesData>): Promise<UserPreferencesRecord> {
  const mongoUri = process.env['MONGODB_URI'];
  if (typeof mongoUri !== 'string' || mongoUri.length === 0) throw operationFailedError('MongoDB is not configured.');
  const key = getCacheKey(userId);
  const db = await getMongoDb();
  const col = db.collection<UserPreferencesDocument>(USER_PREFERENCES_COLLECTION);
  const id = toMongoId(userId);
  const now = new Date();
  
  const setData = sanitizeUpdate(data);
  const updateDoc = getFinalUpdateDoc(id, userId, setData, now);
  
  const res = await col.findOneAndUpdate({ _id: id }, updateDoc, { upsert: true, returnDocument: 'after' });
  const updated = res && typeof res === 'object' && 'value' in res ? (res.value as UserPreferencesDocument | null) : (res as UserPreferencesDocument | null);
  
  if (isPrefsDoc(updated)) {
    const norm = toUserPreferences(updated);
    setCachedPrefs(key, norm);
    return norm;
  }
  
  const fallback = await col.findOne({ _id: id });
  if (fallback === null) {
    throw operationFailedError('Failed to update preferences', undefined, { userId });
  }
  const norm = toUserPreferences(fallback);
  setCachedPrefs(key, norm);
  return norm;
}

export async function getOrCreatePreferences(userId: string): Promise<UserPreferencesRecord> {
  return getUserPreferences(userId);
}
