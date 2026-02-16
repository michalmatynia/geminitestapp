import type { BaseImportParameterImportSettings } from '@/features/integrations/types/base-import-parameter-import';
import type { ProductParameterValue } from '@/features/products/types';
import type { ParameterRepository } from '@/features/products/types/services/parameter-repository';

import type { BaseProductRecord } from '../base-client';

export type ExtractedBaseParameter = {
  key: string;
  baseParameterId: string | null;
  namesByLanguage: Record<string, string>;
  valuesByLanguage: Record<string, string>;
};

export type BaseParameterImportSummary = {
  extracted: number;
  resolved: number;
  created: number;
  written: number;
};

export type ApplyBaseParameterImportInput = {
  record: BaseProductRecord;
  catalogId: string;
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
