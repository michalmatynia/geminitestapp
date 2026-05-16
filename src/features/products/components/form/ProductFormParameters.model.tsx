'use client';

import { useMemo, useState } from 'react';

import { useProductFormMetadata } from '@/features/products/context/ProductFormMetadataContext';
import { useProductFormParameters } from '@/features/products/context/ProductFormParameterContext';
import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductParameterValue } from '@/shared/contracts/products/product';

import { getParameterLanguageValue } from './ProductFormParameters.helpers';
import { useParameterValueInferenceRunner } from './ProductFormParameters.inference';
import { useProductParameterLanguageState } from './ProductFormParameters.language-state';
import {
  INITIAL_SEQUENCE_STATE,
  useParameterSequence,
} from './ProductFormParameters.sequence';
import type {
  ParameterSequenceState,
  ProductFormParametersViewModel,
} from './ProductFormParameters.types';

type ProductFormParametersModelParts = Omit<
  ProductFormParametersViewModel,
  | 'activeParameterLanguage'
  | 'catalogLanguages'
  | 'handleRunParameterSequence'
  | 'isSequenceRunning'
  | 'preferredLocale'
  | 'primaryLanguageCode'
  | 'resolvedActiveParameterLanguageTab'
  | 'sequenceState'
  | 'sequenceStatusMessage'
  | 'setActiveParameterLanguageTab'
  | 'toggleParameterSequenceExclusion'
  | 'eligibleSequenceRows'
> & {
  languageState: ReturnType<typeof useProductParameterLanguageState>;
  sequence: ReturnType<typeof useParameterSequence>;
};

const buildSelectedIds = (parameterValues: ProductParameterValue[]): string[] =>
  parameterValues
    .map((entry: ProductParameterValue) => entry.parameterId)
    .filter((parameterId: string): boolean => parameterId.length > 0);

const buildParameterById = (
  parameters: ProductParameter[]
): Map<string, ProductParameter> => {
  const map = new Map<string, ProductParameter>();
  parameters.forEach((parameter: ProductParameter) => {
    map.set(parameter.id, parameter);
  });
  return map;
};

const buildHasParameterValueByLanguage = (args: {
  languageTabValues: string[];
  parameterValues: ProductParameterValue[];
  primaryLanguageCode: string;
}): Record<string, boolean> => {
  const result: Record<string, boolean> = {};
  args.languageTabValues.forEach((languageCode: string) => {
    result[languageCode] = args.parameterValues.some(
      (entry: ProductParameterValue): boolean =>
        getParameterLanguageValue(entry, languageCode, args.primaryLanguageCode).trim().length > 0
    );
  });
  return result;
};

const buildProductFormParametersViewModel = (
  parts: ProductFormParametersModelParts
): ProductFormParametersViewModel => {
  const { languageState, sequence, ...modelParts } = parts;
  return {
    ...modelParts,
    catalogLanguages: languageState.catalogLanguages,
    activeParameterLanguage: languageState.activeParameterLanguage,
    resolvedActiveParameterLanguageTab: languageState.resolvedActiveParameterLanguageTab,
    setActiveParameterLanguageTab: languageState.setActiveParameterLanguageTab,
    preferredLocale: languageState.activeParameterLanguage.code,
    primaryLanguageCode: languageState.primaryLanguageCode,
    sequenceState: sequence.sequenceState,
    sequenceStatusMessage: sequence.sequenceStatusMessage,
    isSequenceRunning: sequence.isSequenceRunning,
    eligibleSequenceRows: sequence.eligibleSequenceRows,
    toggleParameterSequenceExclusion: sequence.toggleParameterSequenceExclusion,
    handleRunParameterSequence: sequence.handleRunParameterSequence,
  };
};

export const useProductFormParametersModel = (): ProductFormParametersViewModel => {
  const {
    parameters,
    parametersLoading,
    parameterValues,
    addParameterValue,
    updateParameterId,
    updateParameterValueByLanguage,
    updateParameterInferenceSkip,
    removeParameterValue,
  } = useProductFormParameters();
  const { selectedCatalogIds, filteredLanguages } = useProductFormMetadata();
  const languageState = useProductParameterLanguageState(filteredLanguages);
  const [sequenceState, setSequenceState] = useState<ParameterSequenceState>(
    INITIAL_SEQUENCE_STATE
  );
  const selectedIds = useMemo(() => buildSelectedIds(parameterValues), [parameterValues]);
  const parameterById = useMemo(() => buildParameterById(parameters), [parameters]);
  const hasParameterValueByLanguage = useMemo(
    () =>
      buildHasParameterValueByLanguage({
        languageTabValues: languageState.languageTabValues,
        parameterValues,
        primaryLanguageCode: languageState.primaryLanguageCode,
      }),
    [languageState.languageTabValues, languageState.primaryLanguageCode, parameterValues]
  );
  const runParameterValueInference = useParameterValueInferenceRunner({
    parameterValues,
    sequenceStatus: sequenceState.status,
    updateParameterValueByLanguage,
  });
  const sequence = useParameterSequence({
    sequenceState,
    setSequenceState,
    parameterValues,
    parameterById,
    activeParameterLanguage: languageState.activeParameterLanguage,
    primaryLanguageCode: languageState.primaryLanguageCode,
    preferredLocale: languageState.activeParameterLanguage.code,
    runParameterValueInference,
    updateParameterInferenceSkip,
  });

  return buildProductFormParametersViewModel({
    selectedCatalogIds,
    parameters,
    parametersLoading,
    parameterValues,
    hasParameterValueByLanguage,
    selectedIds,
    parameterById,
    addParameterValue,
    updateParameterId,
    updateParameterValueByLanguage,
    removeParameterValue,
    runParameterValueInference,
    languageState,
    sequence,
  });
};
