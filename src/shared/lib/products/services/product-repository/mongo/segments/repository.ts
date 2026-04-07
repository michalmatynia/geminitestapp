import { ProductFilters, ProductRepository } from '@/shared/contracts/products/drafts';
import { ProductWithImages, ProductRecord, ProductImageRecord } from '@/shared/contracts/products/product';
import { ProductCreateInput, ProductUpdateInput } from '@/shared/contracts/products/io';

import { mongoProductAssociationsImpl } from '../associations';
import { mongoProductReadImpl } from '../read';
import { mongoProductWriteImpl } from '../write';
import { getProductCollection } from './collection';

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
