import type { 
  ProductTagFiltersDto, 
  ProductTagCreateInputDto, 
  ProductTagUpdateInputDto 
} from '@/shared/contracts/products';
import type { 
  ProductTag 
} from '@/shared/contracts/products';

export type TagFilters = ProductTagFiltersDto;

export type TagRepository = {
  listTags(filters: TagFilters): Promise<ProductTag[]>;
  getTagById(id: string): Promise<ProductTag | null>;
  createTag(data: ProductTagCreateInputDto): Promise<ProductTag>;
  updateTag(id: string, data: ProductTagUpdateInputDto): Promise<ProductTag>;
  deleteTag(id: string): Promise<void>;
  findByName(catalogId: string, name: string): Promise<ProductTag | null>;
};
