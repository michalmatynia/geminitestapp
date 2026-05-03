import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductParameterValue } from '@/shared/contracts/products/product';

export type CatalogLanguageOption = {
  code: string;
  label: string;
};

export type ParameterValueInferenceRunRow = {
  rowIndex: number;
  parameter: ProductParameter;
  languageCode: string;
  languageLabel: string;
  currentValue: string;
  optionLabels: string[];
};

export type ParameterValueInferenceTrackedRun = {
  runId: string;
  parameterId: string;
  languageCode: string;
  selectorType: ProductParameter['selectorType'];
  optionLabels: string[];
  fallbackValue: string | null;
};

export type ParameterValueInferenceAppliedResult = {
  runId: string;
  parameterId: string;
  rowIndex: number;
  value: string;
};

export type RunParameterValueInference = (
  row: ParameterValueInferenceRunRow
) => Promise<ParameterValueInferenceAppliedResult>;

export type ParameterSequenceState = {
  status: 'idle' | 'running' | 'completed' | 'failed';
  current: number;
  total: number;
  currentLabel: string | null;
  error: string | null;
};

export type ParameterValueInferTriggerProps = {
  selectedParameter: ProductParameter | null;
  inferenceRows: ParameterValueInferenceRunRow[];
  disabled: boolean;
  runParameterValueInference: RunParameterValueInference;
};

export type ParameterSequenceInferenceToggleProps = {
  rowIndex: number;
  selectedParameter: ProductParameter | null;
  isExcluded: boolean;
  disabled: boolean;
  onToggle: (rowIndex: number, isExcluded: boolean) => void;
};

export type ParameterValueInferenceLaunchConfig = {
  triggerButton: AiTriggerButtonRecord;
  values: ProductFormData & Record<string, unknown>;
  imageLinks: string[];
};

export type ParameterValueSnapshotUpdate = {
  parameterId: string;
  languageCode: string;
  value: string;
};

export type ParameterValueRowsSnapshot = ProductParameterValue[];

export type ProductFormParametersViewModel = {
  selectedCatalogIds: string[];
  parameters: ProductParameter[];
  parametersLoading: boolean;
  parameterValues: ProductParameterValue[];
  catalogLanguages: CatalogLanguageOption[];
  activeParameterLanguage: CatalogLanguageOption;
  resolvedActiveParameterLanguageTab: string;
  setActiveParameterLanguageTab: (value: string) => void;
  hasParameterValueByLanguage: Record<string, boolean>;
  selectedIds: string[];
  preferredLocale: string;
  parameterById: Map<string, ProductParameter>;
  primaryLanguageCode: string;
  sequenceState: ParameterSequenceState;
  sequenceStatusMessage: string | null;
  isSequenceRunning: boolean;
  eligibleSequenceRows: ParameterValueInferenceRunRow[];
  addParameterValue: () => void;
  updateParameterId: (index: number, parameterId: string) => void;
  updateParameterValueByLanguage: (
    index: number,
    languageCode: string,
    nextValue: string
  ) => void;
  removeParameterValue: (index: number) => void;
  toggleParameterSequenceExclusion: (rowIndex: number, isExcluded: boolean) => void;
  runParameterValueInference: RunParameterValueInference;
  handleRunParameterSequence: () => Promise<void>;
};
