import type { BaseImportParameterImportSettings } from '@/features/integrations/types/base-import-parameter-import';
import type { ProductParameterValue } from '@/features/products/types';
import type { ParameterRepository } from '@/features/products/types/services/parameter-repository';
import type {
  ExtractedBaseParameterDto,
  BaseParameterImportSummaryDto,
  ApplyBaseParameterImportResultDto,
  ApplyBaseParameterImportInputDto,
} from '@/shared/contracts/integrations';

import type { BaseProductRecord } from '../base-client';

export type ExtractedBaseParameter = ExtractedBaseParameterDto;

export type BaseParameterImportSummary = BaseParameterImportSummaryDto;

export type ApplyBaseParameterImportInput = Omit<ApplyBaseParameterImportInputDto, 'settings'> & {
  parameterRepository: ParameterRepository;
  settings: BaseImportParameterImportSettings;
};

export type ApplyBaseParameterImportResult = ApplyBaseParameterImportResultDto;
