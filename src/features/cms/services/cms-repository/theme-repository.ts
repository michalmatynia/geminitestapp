import { randomUUID } from 'crypto';
import type { Filter } from 'mongodb';
import type { 
  CmsTheme, 
  CmsThemeColors, 
  CmsThemeTypography, 
  CmsThemeSpacing, 
  CreateCmsThemeDto as CmsThemeCreateInput, 
  UpdateCmsThemeDto as CmsThemeUpdateInput 
} from '@/shared/contracts/cms';
import { databaseError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/cms-builder-mongo-client';
import { removeUndefined } from '@/shared/utils/object-utils';

const themesCollection = 'cms_themes';

const buildIdFilter = <T extends { id: string }>(id: string): Filter<T> => {
  const filter: Filter<T> = { id } as unknown as Filter<T>;
  return filter;
};

interface ThemeDocument {
  id: string;
  name: string;
  colors: CmsThemeColors;
  typography: CmsThemeTypography;
  spacing: CmsThemeSpacing;
  customCss?: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const mapThemeDocument = (doc: ThemeDocument): CmsTheme => ({
  id: doc.id,
  name: doc.name,
  colors: doc.colors,
  typography: doc.typography,
  spacing: doc.spacing,
  isDefault: doc.isDefault || false,
  ...(doc.customCss !== undefined && doc.customCss !== null && doc.customCss !== '' ? { customCss: doc.customCss } : {}),
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

export const themeRepository = {
  async getThemeById(id: string): Promise<CmsTheme | null> {
    try {
      const db = await getMongoDb();
      const doc = await db.collection<ThemeDocument>(themesCollection).findOne(buildIdFilter<ThemeDocument>(id));
      return doc ? mapThemeDocument(doc) : null;
    } catch (error) {
      throw databaseError(`Failed to retrieve theme: ${id}`, error, {
        collection: themesCollection,
        themeId: id,
      });
    }
  },

  async createTheme(data: CmsThemeCreateInput): Promise<CmsTheme> {
    try {
      const db = await getMongoDb();
      const id = randomUUID();
      const doc: ThemeDocument = {
        id,
        name: data.name,
        colors: data.colors,
        typography: data.typography,
        spacing: data.spacing,
        customCss: data.customCss ?? null,
        isDefault: data.isDefault || false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.collection<ThemeDocument>(themesCollection).insertOne(doc);
      return mapThemeDocument(doc);
    } catch (error) {
      throw databaseError(`Failed to create theme: ${data.name}`, error, {
        collection: themesCollection,
        themeName: data.name,
      });
    }
  },

  async updateTheme(id: string, data: CmsThemeUpdateInput): Promise<CmsTheme | null> {
    try {
      const db = await getMongoDb();
      const update = removeUndefined({
        name: data.name,
        colors: data.colors,
        typography: data.typography,
        spacing: data.spacing,
        customCss: data.customCss,
        isDefault: data.isDefault,
        updatedAt: new Date(),
      });

      const result = await db
        .collection<ThemeDocument>(themesCollection)
        .findOneAndUpdate(buildIdFilter<ThemeDocument>(id), { $set: update }, { returnDocument: 'after' });
      
      return result ? mapThemeDocument(result) : null;
    } catch (error) {
      throw databaseError(`Failed to update theme: ${id}`, error, {
        collection: themesCollection,
        themeId: id,
      });
    }
  },

  async deleteTheme(id: string): Promise<CmsTheme | null> {
    try {
      const db = await getMongoDb();
      const doc = await db.collection<ThemeDocument>(themesCollection).findOneAndDelete(buildIdFilter<ThemeDocument>(id));
      return doc ? mapThemeDocument(doc) : null;
    } catch (error) {
      throw databaseError(`Failed to delete theme: ${id}`, error, {
        collection: themesCollection,
        themeId: id,
      });
    }
  },

  async getDefaultTheme(): Promise<CmsTheme | null> {
    try {
      const db = await getMongoDb();
      const filter: Filter<ThemeDocument> = { isDefault: true };
      const doc = await db.collection<ThemeDocument>(themesCollection).findOne(filter);
      return doc ? mapThemeDocument(doc) : null;
    } catch (error) {
      throw databaseError('Failed to retrieve default theme.', error, {
        collection: themesCollection,
      });
    }
  },

  async setDefaultTheme(id: string): Promise<void> {
    try {
      const db = await getMongoDb();
      const filter: Filter<ThemeDocument> = { isDefault: true };
      await db.collection<ThemeDocument>(themesCollection).updateMany(filter, { $set: { isDefault: false } });
      await db.collection<ThemeDocument>(themesCollection).updateOne(buildIdFilter<ThemeDocument>(id), { $set: { isDefault: true } });
    } catch (error) {
      throw databaseError(`Failed to set default theme: ${id}`, error, {
        collection: themesCollection,
        themeId: id,
      });
    }
  },
};
