import type { 
  ProductParameterFiltersDto, 
  ProductParameterCreateInputDto, 
  ProductParameterUpdateInputDto 
} from '@/shared/contracts/products';
import type { 
  ProductParameter 
} from '@/shared/types/domain/products';

export type ParameterFilters = ProductParameterFiltersDto;

export type ParameterCreateInput = ProductParameterCreateInputDto;

export type ParameterUpdateInput = ProductParameterUpdateInputDto;

export type ParameterRepository = {
  listParameters(filters: ParameterFilters): Promise<ProductParameter[]>;
  getParameterById(id: string): Promise<ProductParameter | null>;
  createParameter(data: ParameterCreateInput): Promise<ProductParameter>;
  updateParameter(id: string, data: ParameterUpdateInput): Promise<ProductParameter>;
  deleteParameter(id: string): Promise<void>;
  findByName(catalogId: string, name_en: string): Promise<ProductParameter | null>;
};
