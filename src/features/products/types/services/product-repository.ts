import type { ProductWithImages, ProductRecord } from '@/features/products/types';
import type {
  ProductCreateData,
  ProductUpdateData,
  ProductFiltersParsed,
} from '@/features/products/validations';

import type { Prisma } from '@prisma/client';

export type ProductFilters = Partial<ProductFiltersParsed>;

export type CreateProductInput = ProductCreateData;
export type UpdateProductInput = ProductUpdateData;

// Define a type for the transactional client, which will have the same methods as ProductRepository
// but operate within a transaction.
export type TransactionalProductRepository = {
  getProducts(filters: ProductFilters): Promise<ProductWithImages[]>;
  countProducts(filters: ProductFilters): Promise<number>;
  getProductById(id: string): Promise<ProductWithImages | null>;
  getProductBySku(sku: string): Promise<ProductRecord | null>;
  findProductByBaseId(baseProductId: string): Promise<ProductRecord | null>;
  createProduct(data: CreateProductInput): Promise<ProductRecord>;
  updateProduct(
    id: string,
    data: UpdateProductInput
  ): Promise<ProductRecord | null>;
  deleteProduct(id: string): Promise<ProductRecord | null>;
  duplicateProduct(id: string, sku: string): Promise<ProductRecord | null>;
  addProductImages(productId: string, imageFileIds: string[]): Promise<void>;
  replaceProductImages(productId: string, imageFileIds: string[]): Promise<void>;
  replaceProductCatalogs(
    productId: string,
    catalogIds: string[]
  ): Promise<void>;
  replaceProductCategory(
    productId: string,
    categoryId: string | null
  ): Promise<void>;
  replaceProductTags(
    productId: string,
    tagIds: string[]
  ): Promise<void>;
  replaceProductProducers(
    productId: string,
    producerIds: string[]
  ): Promise<void>;
  replaceProductNotes(
    productId: string,
    noteIds: string[]
  ): Promise<void>;
  removeProductImage(productId: string, imageFileId: string): Promise<void>;
  countProductsByImageFileId(imageFileId: string): Promise<number>;
};

export type ProductRepository = {
  getProducts(filters: ProductFilters): Promise<ProductWithImages[]>;
  countProducts(filters: ProductFilters): Promise<number>;
  getProductById(id: string): Promise<ProductWithImages | null>;
  getProductBySku(sku: string): Promise<ProductRecord | null>;
  findProductByBaseId(baseProductId: string): Promise<ProductRecord | null>;
  createProduct(data: CreateProductInput): Promise<ProductRecord>;
  updateProduct(
    id: string,
    data: UpdateProductInput
  ): Promise<ProductRecord | null>;
  deleteProduct(id: string): Promise<ProductRecord | null>;
  duplicateProduct(id: string, sku: string): Promise<ProductRecord | null>;
  addProductImages(productId: string, imageFileIds: string[]): Promise<void>;
  replaceProductImages(productId: string, imageFileIds: string[]): Promise<void>;
  replaceProductCatalogs(
    productId: string,
    catalogIds: string[]
  ): Promise<void>;
  replaceProductCategory(
    productId: string,
    categoryId: string | null
  ): Promise<void>;
  replaceProductTags(
    productId: string,
    tagIds: string[]
  ): Promise<void>;
  replaceProductProducers(
    productId: string,
    producerIds: string[]
  ): Promise<void>;
  replaceProductNotes(
    productId: string,
    noteIds: string[]
  ): Promise<void>;
  removeProductImage(productId: string, imageFileId: string): Promise<void>;
  countProductsByImageFileId(imageFileId: string): Promise<number>;
  // New transactional method
  createProductInTransaction: <T>(
    callback: (tx: TransactionalProductRepository & Prisma.TransactionClient) => Promise<T>
  ) => Promise<T>;
};
