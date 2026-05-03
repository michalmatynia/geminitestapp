import type { MutableRefObject } from 'react';
import type { UseFormGetValues, UseFormSetValue } from 'react-hook-form';

import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type {
  ProductValidationInstanceScope,
  ProductValidationPattern,
} from '@/shared/contracts/products/validation';

import type { ProductFormGeneralWatchedValues } from './ProductFormGeneral.types';

export type CompiledProductValidationPattern = {
  pattern: ProductValidationPattern;
  compiledRegex: RegExp | null;
};

export type ProductFormGeneralFormatterRefs = {
  sequenceGroupDebounceRef: MutableRefObject<Record<string, number>>;
  formatterLoopGuardRef: MutableRefObject<{
    recentSignatures: string[];
    cycleHits: number;
  }>;
};

export type ProductFormGeneralFormatterInput = ProductFormGeneralFormatterRefs & {
  validatorEnabled: boolean;
  formatterEnabled: boolean;
  validationInstanceScope: ProductValidationInstanceScope;
  compiledPatterns: CompiledProductValidationPattern[];
  latestProductValues: Record<string, unknown> | null;
  watchedValues: ProductFormGeneralWatchedValues;
  focusedFieldName: string | null;
  getValues: UseFormGetValues<ProductFormData>;
  setValue: UseFormSetValue<ProductFormData>;
};

export type FormatterRuntime = ProductFormGeneralFormatterRefs & {
  currentValues: Record<string, unknown>;
  latestProductValues: Record<string, unknown> | null;
  validationInstanceScope: ProductValidationInstanceScope;
  orderedPatterns: ProductValidationPattern[];
  sequenceGroupCounts: Map<string, number>;
  compiledRegexByPatternId: Map<string, RegExp | null>;
  focusedFieldName: string | null;
  readSequenceGroupDebounce: (key: string) => number;
  setSequenceGroupDebounce: (key: string, value: number) => void;
};

export type FormatterFieldUpdate = {
  fieldName: keyof ProductFormData;
  fieldValue: ProductFormData[keyof ProductFormData];
};

export type ReplacementPatternExecutionResult = {
  candidateValue: string;
  matched: boolean;
  replaced: boolean;
};
