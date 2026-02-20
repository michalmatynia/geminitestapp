import type { 
  CreateProductCategoryDto, 
  UpdateProductCategoryDto,
  ProductCategoryFiltersDto,
  ProductCategoryDto as ProductCategory,
  ProductCategoryWithChildrenDto as ProductCategoryWithChildren
} from '@/shared/contracts/products';

export type CategoryFilters = ProductCategoryFiltersDto;

export type CategoryRepository = {
  listCategories(filters: CategoryFilters): Promise<ProductCategory[]>;
  getCategoryTree(catalogId?: string): Promise<ProductCategoryWithChildren[]>;
  getCategoryById(id: string): Promise<ProductCategory | null>;
  getCategoryWithChildren(id: string): Promise<ProductCategoryWithChildren | null>;
  createCategory(data: CreateProductCategoryDto): Promise<ProductCategory>;
  updateCategory(id: string, data: UpdateProductCategoryDto): Promise<ProductCategory>;
  deleteCategory(id: string): Promise<void>;
  findByName(catalogId: string, name: string, parentId?: string | null): Promise<ProductCategory | null>;
  isDescendant(categoryId: string, targetId: string): Promise<boolean>;
};
