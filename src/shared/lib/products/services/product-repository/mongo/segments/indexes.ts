import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { type ProductDocument } from '../../mongo-product-repository-mappers';
import { productCollectionName } from '../../mongo-product-repository.helpers';

let productIndexesEnsured: Promise<void> | null = null;

export const ensureProductIndexes = async (): Promise<void> => {
  if (!productIndexesEnsured) {
    productIndexesEnsured = (async (): Promise<void> => {
      const db = await getMongoDb();
      const collection = db.collection<ProductDocument>(productCollectionName);
      await Promise.all([
        collection.createIndex({ createdAt: -1 }, { name: 'products_createdAt_desc' }),
        collection.createIndex({ updatedAt: -1 }, { name: 'products_updatedAt_desc' }),
        collection.createIndex({ sku: 1 }, { name: 'products_sku' }),
        collection.createIndex({ id: 1 }, { name: 'products_id' }),
        collection.createIndex({ baseProductId: 1 }, { name: 'products_baseProductId' }),
        collection.createIndex({ categoryId: 1 }, { name: 'products_categoryId' }),
        collection.createIndex({ 'catalogs.catalogId': 1 }, { name: 'products_catalogId' }),
        collection.createIndex({ name_en: 1 }, { name: 'products_name_en' }),
        collection.createIndex({ name_pl: 1 }, { name: 'products_name_pl' }),
        collection.createIndex({ name_de: 1 }, { name: 'products_name_de' }),
        collection.createIndex(
          { 'structuredTitle.size': 1 },
          { name: 'products_structuredTitle_size' }
        ),
        collection.createIndex(
          { 'structuredTitle.material': 1 },
          { name: 'products_structuredTitle_material' }
        ),
        collection.createIndex(
          { 'structuredTitle.theme': 1 },
          { name: 'products_structuredTitle_theme' }
        ),
        collection.createIndex(
          { 'catalogs.catalogId': 1, createdAt: -1 },
          { name: 'products_catalogId_createdAt' }
        ),
        collection.createIndex(
          { categoryId: 1, createdAt: -1 },
          { name: 'products_categoryId_createdAt' }
        ),
        collection.createIndex(
          { 'catalogs.catalogId': 1, categoryId: 1, createdAt: -1 },
          { name: 'products_catalogId_categoryId_createdAt' }
        ),
      ]);
    })();
  }
  try {
    await productIndexesEnsured;
  } catch (error) {
    void ErrorSystem.captureException(error);
    productIndexesEnsured = null;
    throw error;
  }
};
