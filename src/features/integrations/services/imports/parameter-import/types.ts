import type { BaseImportParameterImportSettings } from '@/features/integrations/types/base-import-parameter-import';
import type { ProductParameterValue } from '@/features/products/types';
import type { ParameterRepository } from '@/features/products/types/services/parameter-repository';
import type {
  ExtractedBaseParameterDto,
  BaseParameterImportSummaryDto,
} from '@/shared/contracts/integrations';

import type { BaseProductRecord } from '../base-client';

export type ExtractedBaseParameter = ExtractedBaseParameterDto;

export type BaseParameterImportSummary = BaseParameterImportSummaryDto;

export type ApplyBaseParameterImportInput = {
  record: BaseProductRecord;
  catalogId: string;
  connectionId?: string | null;
  inventoryId?: string | null;
  parameterRepository: ParameterRepository;
  existingValues: ProductParameterValue[];
  catalogLanguageCodes: string[];
  defaultLanguageCode?: string | null;
  settings: BaseImportParameterImportSettings;
  templateMappings: Array<{ sourceKey: string; targetField: string }>;
};

export type ApplyBaseParameterImportResult = {
  applied: boolean;
  parameters: ProductParameterValue[];
  summary: BaseParameterImportSummary;
};
