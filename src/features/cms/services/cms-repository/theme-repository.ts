import { randomUUID } from 'crypto';
import type { Filter } from 'mongodb';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type { 
  CmsTheme, 
  CmsThemeColors, 
  CmsThemeTypography, 
  CmsThemeSpacing, 
  CreateCmsThemeDto as CmsThemeCreateInput, 
  UpdateCmsThemeDto as CmsThemeUpdateInput 
} from '@/shared/contracts/cms';
import { buildIdFilter, removeUndefined } from '../utils';

const themesCollection = 'cms_themes';

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
  ...(doc.customCss ? { customCss: doc.customCss } : {}),
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

export const themeRepository = {
  async getThemeById(id: string): Promise<CmsTheme | null> {
    const db = await getMongoDb();
    const doc = await db.collection<ThemeDocument>(themesCollection).findOne(buildIdFilter<ThemeDocument>(id) as Filter<ThemeDocument>);
    return doc ? mapThemeDocument(doc) : null;
  },

  async createTheme(data: CmsThemeCreateInput): Promise<CmsTheme> {
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
  },

  async updateTheme(id: string, data: CmsThemeUpdateInput): Promise<CmsTheme | null> {
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
      .findOneAndUpdate(buildIdFilter<ThemeDocument>(id) as Filter<ThemeDocument>, { $set: update }, { returnDocument: 'after' });
    
    return result ? mapThemeDocument(result) : null;
  },

  async deleteTheme(id: string): Promise<CmsTheme | null> {
    const db = await getMongoDb();
    const doc = await db.collection<ThemeDocument>(themesCollection).findOneAndDelete(buildIdFilter<ThemeDocument>(id) as Filter<ThemeDocument>);
    return doc ? mapThemeDocument(doc) : null;
  },

  async getDefaultTheme(): Promise<CmsTheme | null> {
    const db = await getMongoDb();
    const doc = await db.collection<ThemeDocument>(themesCollection).findOne({ isDefault: true } as Filter<ThemeDocument>);
    return doc ? mapThemeDocument(doc) : null;
  },

  async setDefaultTheme(id: string): Promise<void> {
    const db = await getMongoDb();
    await db.collection<ThemeDocument>(themesCollection).updateMany({ isDefault: true } as Filter<ThemeDocument>, { $set: { isDefault: false } });
    await db.collection<ThemeDocument>(themesCollection).updateOne(buildIdFilter<ThemeDocument>(id) as Filter<ThemeDocument>, { $set: { isDefault: true } });
  },
};

