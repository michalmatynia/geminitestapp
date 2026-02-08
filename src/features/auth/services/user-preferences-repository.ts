import 'server-only';

import { ObjectId } from 'mongodb';

import { operationFailedError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

const toMongoId = (id: string): ObjectId | string => {
  if (ObjectId.isValid(id) && id.length === 24) return new ObjectId(id);
  return id;
};

export type UserPreferencesData = {
  productListNameLocale?: string | null;
  productListCatalogFilter?: string | null;
  productListCurrencyCode?: string | null;
  productListPageSize?: number | null;
  productListThumbnailSource?: 'file' | 'link' | 'base64' | null;
  aiPathsActivePathId?: string | null;
  aiPathsExpandedGroups?: string[];
  aiPathsPaletteCollapsed?: boolean | null;
  aiPathsPathIndex?: JsonValue | null;
  aiPathsPathConfigs?: JsonValue | null;
  adminMenuCollapsed?: boolean | null;
  adminMenuFavorites?: string[] | null;
  adminMenuSectionColors?: Record<string, string> | null;
  adminMenuCustomEnabled?: boolean | null;
  adminMenuCustomNav?: JsonValue | null;
  cmsLastPageId?: string | null;
  cmsActiveDomainId?: string | null;
  cmsThemeOpenSections?: string[] | null;
  cmsThemeLogoWidth?: number | null;
  cmsThemeLogoUrl?: string | null;
  cmsPreviewEnabled?: boolean | null;
  cmsSlideshowPauseOnHoverInEditor?: boolean | null;
};

export type UserPreferences = {
  id: string;
  userId: string;
  productListNameLocale: string | null;
  productListCatalogFilter: string | null;
  productListCurrencyCode: string | null;
  productListPageSize: number | null;
  productListThumbnailSource: 'file' | 'link' | 'base64' | null;
  aiPathsActivePathId: string | null;
  aiPathsExpandedGroups: string[];
  aiPathsPaletteCollapsed: boolean | null;
  aiPathsPathIndex: JsonValue | null;
  aiPathsPathConfigs: JsonValue | null;
  adminMenuCollapsed: boolean | null;
  adminMenuFavorites: string[];
  adminMenuSectionColors: Record<string, string>;
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

type UserPreferencesDocument = {
  _id: string | ObjectId;
  userId: string;
  productListNameLocale: string | null;
  productListCatalogFilter: string | null;
  productListCurrencyCode: string | null;
  productListPageSize: number | null;
  productListThumbnailSource: 'file' | 'link' | 'base64' | null;
  aiPathsActivePathId: string | null;
  aiPathsExpandedGroups: string[];
  aiPathsPaletteCollapsed: boolean | null;
  aiPathsPathIndex: JsonValue | null;
  aiPathsPathConfigs: JsonValue | null;
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

const toUserPreferences = (doc: UserPreferencesDocument): UserPreferences => ({
  id: String(doc._id),
  userId: doc.userId,
  productListNameLocale: doc.productListNameLocale,
  productListCatalogFilter: doc.productListCatalogFilter,
  productListCurrencyCode: doc.productListCurrencyCode,
  productListPageSize: doc.productListPageSize,
  productListThumbnailSource: doc.productListThumbnailSource ?? 'file',
  aiPathsActivePathId: doc.aiPathsActivePathId ?? null,
  aiPathsExpandedGroups: doc.aiPathsExpandedGroups ?? [],
  aiPathsPaletteCollapsed: doc.aiPathsPaletteCollapsed ?? false,
  aiPathsPathIndex: doc.aiPathsPathIndex ?? null,
  aiPathsPathConfigs: doc.aiPathsPathConfigs ?? null,
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
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const defaultPreferences = (userId: string): Omit<UserPreferences, 'id' | 'createdAt' | 'updatedAt'> => ({
  userId,
  productListNameLocale: 'name_en',
  productListCatalogFilter: 'all',
  productListCurrencyCode: 'PLN',
  productListPageSize: 12,
  productListThumbnailSource: 'file',
  aiPathsActivePathId: null,
  aiPathsExpandedGroups: ['Triggers'],
  aiPathsPaletteCollapsed: false,
  aiPathsPathIndex: null,
  aiPathsPathConfigs: null,
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

/**
 * Get user preferences by user ID
 * Creates default preferences if they don't exist
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  if (!process.env["MONGODB_URI"]) {
    throw operationFailedError('MongoDB is not configured.');
  }
  const db = await getMongoDb();
  const doc = await db
    .collection<UserPreferencesDocument>(USER_PREFERENCES_COLLECTION)
    .findOne({ $or: [{ _id: toMongoId(userId) }, { userId }] });

  if (doc) {
    return toUserPreferences(doc);
  }

  const now = new Date();
  const document: UserPreferencesDocument = {
    _id: userId,
    ...defaultPreferences(userId),
    createdAt: now,
    updatedAt: now,
  };
  await db
    .collection<UserPreferencesDocument>(USER_PREFERENCES_COLLECTION)
    .insertOne(document);
  return toUserPreferences(document);
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  userId: string,
  data: Partial<UserPreferencesData>
): Promise<UserPreferences> {
  if (!process.env["MONGODB_URI"]) {
    throw operationFailedError('MongoDB is not configured.');
  }
  const db = await getMongoDb();
  const now = new Date();
  const insertDefaults = {
    _id: userId,
    ...defaultPreferences(userId),
    createdAt: now,
  } as Record<string, unknown>;
  for (const key of Object.keys(data)) {
    delete insertDefaults[key];
  }
  const result = await db
    .collection<UserPreferencesDocument>(USER_PREFERENCES_COLLECTION)
    .findOneAndUpdate(
      { $or: [{ _id: toMongoId(userId) }, { userId }] },
      {
        $set: {
          ...data,
          updatedAt: now,
        } as Record<string, unknown>,
        $setOnInsert: {
          ...insertDefaults,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

  if (result && 'value' in result && result.value) {
    return toUserPreferences(result.value as UserPreferencesDocument);
  }
  if (result && !('value' in result) && result) {
    return toUserPreferences(result as unknown as UserPreferencesDocument);
  }

  const fallbackDoc = await db
    .collection<UserPreferencesDocument>(USER_PREFERENCES_COLLECTION)
    .findOne({ $or: [{ _id: toMongoId(userId) }, { userId }] });

  if (!fallbackDoc) {
    throw operationFailedError('Failed to update preferences', undefined, {
      userId,
    });
  }

  return toUserPreferences(fallbackDoc);
}

/**
 * Get or create preferences for user
 */
export async function getOrCreatePreferences(userId: string): Promise<UserPreferences> {
  return getUserPreferences(userId);
}
