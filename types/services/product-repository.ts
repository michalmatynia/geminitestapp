import type { ProductWithImages, ProductRecord } from "@/types";
import type {
  ProductCreateData,
  ProductUpdateData,
} from "@/lib/validations/product";

export type ProductFilters = {
  search?: string;
  sku?: string;
  minPrice?: string;
  maxPrice?: string;
  startDate?: string;
  endDate?: string;
  page?: string;
  pageSize?: string;
  catalogId?: string;
};

export type CreateProductInput = ProductCreateData;
export type UpdateProductInput = ProductUpdateData;

export type ProductRepository = {
  getProducts(filters: ProductFilters): Promise<ProductWithImages[]>;
  countProducts(filters: ProductFilters): Promise<number>;
  getProductById(id: string): Promise<ProductWithImages | null>;
  findProductByBaseId(baseProductId: string): Promise<ProductRecord | null>;
  createProduct(data: CreateProductInput): Promise<ProductRecord>;
  updateProduct(
    id: string,
    data: UpdateProductInput
  ): Promise<ProductRecord | null>;
  deleteProduct(id: string): Promise<ProductRecord | null>;
  duplicateProduct(id: string, sku: string): Promise<ProductRecord | null>;
  addProductImages(productId: string, imageFileIds: string[]): Promise<void>;
  replaceProductCatalogs(
    productId: string,
    catalogIds: string[]
  ): Promise<void>;
  removeProductImage(productId: string, imageFileId: string): Promise<void>;
  countProductsByImageFileId(imageFileId: string): Promise<number>;
};
