import type { 
  ProductTag 
} from '@/shared/types/domain/products';

export type TagFilters = {
  catalogId?: string;
  search?: string;
};

export type TagRepository = {
  listTags(filters: TagFilters): Promise<ProductTag[]>;
  getTagById(id: string): Promise<ProductTag | null>;
  createTag(data: { name: string; color?: string | null; catalogId: string }): Promise<ProductTag>;
  updateTag(id: string, data: { name?: string; color?: string | null }): Promise<ProductTag>;
  deleteTag(id: string): Promise<void>;
  findByName(catalogId: string, name: string): Promise<ProductTag | null>;
};
