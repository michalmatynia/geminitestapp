import 'server-only';

import { Collection } from 'mongodb';
import { ProductDocument } from '../mongo-product-repository-mappers';
import {
  ProductFilters,
  ProductWithImages,
  ProductRepository,
  ProductRecord,
  ProductCreateInput,
  ProductUpdateInput,
  ProductImageRecord,
} from '@/shared/contracts/products';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { productCollectionName } from '../mongo-product-repository.helpers';

import { mongoProductReadImpl } from './read';
import { mongoProductWriteImpl } from './write';
import { mongoProductAssociationsImpl } from './associations';

let productIndexesEnsured: Promise<void> | null = null;

const ensureProductIndexes = async (): Promise<void> => {
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
    productIndexesEnsured = null;
    throw error;
  }
};

const getProductCollection = async (): Promise<Collection<ProductDocument>> => {
  await ensureProductIndexes();
  const db = await getMongoDb();
  return db.collection<ProductDocument>(productCollectionName);
};

export const mongoProductRepository: ProductRepository = {
  async getProducts(filters: ProductFilters): Promise<ProductWithImages[]> {
    return mongoProductReadImpl.getProducts(filters, getProductCollection);
  },

  async getProductIds(filters: ProductFilters): Promise<string[]> {
    return mongoProductReadImpl.getProductIds(filters, getProductCollection);
  },

  async countProducts(filters: ProductFilters): Promise<number> {
    return mongoProductReadImpl.countProducts(filters, getProductCollection);
  },

  async getProductsWithCount(
    filters: ProductFilters
  ): Promise<{ products: ProductWithImages[]; total: number }> {
    return mongoProductReadImpl.getProductsWithCount(filters, getProductCollection);
  },

  async getProductById(id: string): Promise<ProductWithImages | null> {
    return mongoProductReadImpl.getProductById(id, getProductCollection);
  },

  async getProductBySku(sku: string): Promise<ProductRecord | null> {
    return mongoProductReadImpl.getProductBySku(sku, getProductCollection);
  },

  async getProductsBySkus(skus: string[]): Promise<ProductRecord[]> {
    return mongoProductReadImpl.getProductsBySkus(skus, getProductCollection);
  },

  async findProductByBaseId(baseProductId: string): Promise<ProductRecord | null> {
    return mongoProductReadImpl.findProductByBaseId(baseProductId, getProductCollection);
  },

  async findProductsByBaseIds(baseIds: string[]): Promise<ProductRecord[]> {
    return mongoProductReadImpl.findProductsByBaseIds(baseIds, getProductCollection);
  },

  async createProduct(data: ProductCreateInput): Promise<ProductRecord> {
    return mongoProductWriteImpl.createProduct(data, getProductCollection);
  },

  async updateProduct(id: string, data: ProductUpdateInput): Promise<ProductRecord | null> {
    return mongoProductWriteImpl.updateProduct(id, data, getProductCollection);
  },

  async deleteProduct(id: string): Promise<ProductRecord | null> {
    return mongoProductWriteImpl.deleteProduct(id, getProductCollection);
  },

  async bulkCreateProducts(data: ProductCreateInput[]): Promise<number> {
    return mongoProductWriteImpl.bulkCreateProducts(data, (d: ProductCreateInput) =>
      this.createProduct(d)
    );
  },

  async duplicateProduct(id: string, sku: string): Promise<ProductRecord | null> {
    return mongoProductWriteImpl.duplicateProduct(
      id,
      sku,
      (pid: string) => this.getProductById(pid),
      (d: ProductCreateInput) => this.createProduct(d)
    );
  },

  async getProductImages(productId: string): Promise<ProductImageRecord[]> {
    return mongoProductAssociationsImpl.getProductImages(productId, getProductCollection);
  },

  async addProductImages(productId: string, imageFileIds: string[]): Promise<void> {
    return mongoProductAssociationsImpl.addProductImages(
      productId,
      imageFileIds,
      getProductCollection
    );
  },

  async replaceProductImages(productId: string, imageFileIds: string[]): Promise<void> {
    return mongoProductAssociationsImpl.replaceProductImages(
      productId,
      imageFileIds,
      getProductCollection
    );
  },

  async removeProductImage(productId: string, imageFileId: string): Promise<void> {
    return mongoProductAssociationsImpl.removeProductImage(
      productId,
      imageFileId,
      getProductCollection
    );
  },

  async countProductsByImageFileId(imageFileId: string): Promise<number> {
    return mongoProductAssociationsImpl.countProductsByImageFileId(
      imageFileId,
      getProductCollection
    );
  },

  async replaceProductCatalogs(productId: string, catalogIds: string[]): Promise<void> {
    return mongoProductAssociationsImpl.replaceProductCatalogs(
      productId,
      catalogIds,
      getProductCollection
    );
  },

  async replaceProductCategory(productId: string, categoryId: string | null): Promise<void> {
    return mongoProductAssociationsImpl.replaceProductCategory(
      productId,
      categoryId,
      getProductCollection
    );
  },

  async replaceProductTags(productId: string, tagIds: string[]): Promise<void> {
    return mongoProductAssociationsImpl.replaceProductTags(productId, tagIds, getProductCollection);
  },

  async replaceProductProducers(productId: string, producerIds: string[]): Promise<void> {
    return mongoProductAssociationsImpl.replaceProductProducers(
      productId,
      producerIds,
      getProductCollection
    );
  },

  async replaceProductNotes(productId: string, noteIds: string[]): Promise<void> {
    return mongoProductAssociationsImpl.replaceProductNotes(
      productId,
      noteIds,
      getProductCollection
    );
  },

  async bulkReplaceProductCatalogs(productIds: string[], catalogIds: string[]): Promise<void> {
    return mongoProductAssociationsImpl.bulkReplaceProductCatalogs(
      productIds,
      catalogIds,
      getProductCollection
    );
  },

  async bulkAddProductCatalogs(productIds: string[], catalogIds: string[]): Promise<void> {
    return mongoProductAssociationsImpl.bulkAddProductCatalogs(
      productIds,
      catalogIds,
      getProductCollection
    );
  },

  async bulkRemoveProductCatalogs(productIds: string[], catalogIds: string[]): Promise<void> {
    return mongoProductAssociationsImpl.bulkRemoveProductCatalogs(
      productIds,
      catalogIds,
      getProductCollection
    );
  },

  async createProductInTransaction<T>(callback: (tx: ProductRepository) => Promise<T>): Promise<T> {
    return callback(this);
  },
};
