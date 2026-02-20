import type { BaseImportParameterImportSettings } from '@/features/integrations/types/base-import-parameter-import';
import type { 
  ProductParameterDto as ProductParameter,
  ProductParameterFiltersDto as ParameterFilters,
  ProductParameterCreateInputDto as ParameterCreateInput,
  ProductParameterUpdateInputDto as ParameterUpdateInput,
} from '@/shared/contracts/products';

export type ParameterRepository = {
  listParameters(filters: ParameterFilters): Promise<ProductParameter[]>;
  getParameterById(id: string): Promise<ProductParameter | null>;
  createParameter(data: ParameterCreateInput): Promise<ProductParameter>;
  updateParameter(id: string, data: ParameterUpdateInput): Promise<ProductParameter>;
  deleteParameter(id: string): Promise<void>;
  findByName(catalogId: string, name_en: string): Promise<ProductParameter | null>;
};
import type {
  ExtractedBaseParameterDto,
  BaseParameterImportSummaryDto,
  ApplyBaseParameterImportResultDto,
  ApplyBaseParameterImportInputDto,
} from '@/shared/contracts/integrations';

export type ExtractedBaseParameter = ExtractedBaseParameterDto;

export type BaseParameterImportSummary = BaseParameterImportSummaryDto;

export type ApplyBaseParameterImportInput = Omit<ApplyBaseParameterImportInputDto, 'settings'> & {
  parameterRepository: ParameterRepository;
  settings: BaseImportParameterImportSettings;
};

export type ApplyBaseParameterImportResult = ApplyBaseParameterImportResultDto;
