import type { 
  ProductParameter 
} from '@/shared/types/domain/products';

export type ParameterFilters = {
  catalogId?: string;
  search?: string;
};

export type ParameterRepository = {
  listParameters(filters: ParameterFilters): Promise<ProductParameter[]>;
  getParameterById(id: string): Promise<ProductParameter | null>;
  createParameter(data: { name_en: string; name_pl?: string | null; name_de?: string | null; catalogId: string }): Promise<ProductParameter>;
  updateParameter(id: string, data: { name_en?: string; name_pl?: string | null; name_de?: string | null }): Promise<ProductParameter>;
  deleteParameter(id: string): Promise<void>;
  findByName(catalogId: string, name_en: string): Promise<ProductParameter | null>;
};
