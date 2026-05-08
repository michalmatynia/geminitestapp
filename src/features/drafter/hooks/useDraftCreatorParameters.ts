'use client';

import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react';

import { mergeParameterDefinitions } from '@/features/products/context/ProductFormParameterDefinitions';
import {
  buildTitleTermLookup,
  isLinkedTitleTermType,
  mergeLinkedParameterValues,
  resolveLinkedParameterValuesById,
  resolveStructuredLinkedTermValues,
} from '@/features/products/context/ProductFormParameterContext.utils';
import { useTitleTerms } from '@/features/products/hooks/useProductMetadataQueries';
import type { ProductParameter, ProductSimpleParameter } from '@/shared/contracts/products/parameters';
import type { ProductParameterValue } from '@/shared/contracts/products/product';
import type { ProductTitleTerm, ProductTitleTermType } from '@/shared/contracts/products/title-terms';

type UseDraftCreatorParametersInput = {
  metadataParameters: ProductParameter[];
  metadataSimpleParameters: ProductSimpleParameter[];
  nameEn: string;
  selectedCatalogIds: string[];
};

type UseDraftCreatorParametersResult = {
  addParameterValue: () => void;
  parameterDefinitions: ProductParameter[];
  parameterValues: ProductParameterValue[];
  removeParameterValue: (index: number) => void;
  setParameterValues: Dispatch<SetStateAction<ProductParameterValue[]>>;
  updateParameterId: (index: number, parameterId: string) => void;
  updateParameterValue: (index: number, value: string) => void;
};

type DraftParameterDefinitionsInput = Pick<
  UseDraftCreatorParametersInput,
  'metadataParameters' | 'metadataSimpleParameters'
> & {
  baseParameterValues: ProductParameterValue[];
  primaryCatalogId: string;
};

type MergedDraftParameterValuesInput = {
  baseParameterValues: ProductParameterValue[];
  nameEn: string;
  parameterDefinitions: ProductParameter[];
};

type DraftParameterValueActionsInput = {
  parameterValueIndexMap: number[];
  setBaseParameterValues: Dispatch<SetStateAction<ProductParameterValue[]>>;
};

const CATALOG_AGNOSTIC_TITLE_TERM_OPTIONS = { allowWithoutCatalog: true } as const;

const useDraftLinkedTitleTermQueries = (): {
  materialTermsQuery: ReturnType<typeof useTitleTerms>;
  sizeTermsQuery: ReturnType<typeof useTitleTerms>;
  themeTermsQuery: ReturnType<typeof useTitleTerms>;
} => ({
  sizeTermsQuery: useTitleTerms(undefined, 'size', CATALOG_AGNOSTIC_TITLE_TERM_OPTIONS),
  materialTermsQuery: useTitleTerms(
    undefined,
    'material',
    CATALOG_AGNOSTIC_TITLE_TERM_OPTIONS
  ),
  themeTermsQuery: useTitleTerms(undefined, 'theme', CATALOG_AGNOSTIC_TITLE_TERM_OPTIONS),
});

const resolveBaseParameterIndex = (index: number, parameterValueIndexMap: number[]): number =>
  parameterValueIndexMap[index] ?? index;

const updateBaseParameterValueAt = (
  values: ProductParameterValue[],
  index: number,
  parameterValueIndexMap: number[],
  updater: (entry: ProductParameterValue) => ProductParameterValue
): ProductParameterValue[] => {
  const baseIndex = resolveBaseParameterIndex(index, parameterValueIndexMap);
  if (baseIndex < 0) return values;

  const current = values[baseIndex];
  if (current === undefined) return values;

  const next = [...values];
  next[baseIndex] = updater(current);
  return next;
};

const useDraftParameterDefinitions = ({
  baseParameterValues,
  metadataParameters,
  metadataSimpleParameters,
  primaryCatalogId,
}: DraftParameterDefinitionsInput): ProductParameter[] =>
  useMemo(
    () =>
      mergeParameterDefinitions({
        parameters: metadataParameters,
        simpleParameters: metadataSimpleParameters,
        parameterValues: baseParameterValues,
        fallbackCatalogId: primaryCatalogId,
      }),
    [baseParameterValues, metadataParameters, metadataSimpleParameters, primaryCatalogId]
  );

const useMergedDraftParameterValues = ({
  baseParameterValues,
  nameEn,
  parameterDefinitions,
}: MergedDraftParameterValuesInput): {
  parameterValueIndexMap: number[];
  parameterValues: ProductParameterValue[];
} => {
  const { materialTermsQuery, sizeTermsQuery, themeTermsQuery } =
    useDraftLinkedTitleTermQueries();
  const linkedParameters = useMemo(
    () =>
      parameterDefinitions.filter((parameter) =>
        isLinkedTitleTermType(parameter.linkedTitleTermType)
      ),
    [parameterDefinitions]
  );
  const linkedParameterIds = useMemo(
    () => new Set(linkedParameters.map((parameter) => parameter.id)),
    [linkedParameters]
  );
  const structuredLinkedTermValues = useMemo(
    (): Record<ProductTitleTermType, string> => resolveStructuredLinkedTermValues(nameEn),
    [nameEn]
  );
  const titleTermLookups = useMemo(
    (): Record<ProductTitleTermType, Map<string, ProductTitleTerm>> => ({
      size: buildTitleTermLookup(sizeTermsQuery.data),
      material: buildTitleTermLookup(materialTermsQuery.data),
      theme: buildTitleTermLookup(themeTermsQuery.data),
    }),
    [materialTermsQuery.data, sizeTermsQuery.data, themeTermsQuery.data]
  );
  const resolvedLinkedValuesById = useMemo(
    () =>
      resolveLinkedParameterValuesById({
        linkedParameters,
        structuredLinkedTermValues,
        titleTermLookups,
      }),
    [linkedParameters, structuredLinkedTermValues, titleTermLookups]
  );
  const mergedParameterValues = useMemo(
    () =>
      mergeLinkedParameterValues({
        baseValues: baseParameterValues,
        linkedParameterIds,
        linkedParameters,
        resolvedLinkedValuesById,
      }),
    [baseParameterValues, linkedParameterIds, linkedParameters, resolvedLinkedValuesById]
  );

  return {
    parameterValueIndexMap: mergedParameterValues.baseIndexByValueIndex,
    parameterValues: mergedParameterValues.values,
  };
};

const useDraftParameterValueActions = ({
  parameterValueIndexMap,
  setBaseParameterValues,
}: DraftParameterValueActionsInput): Pick<
  UseDraftCreatorParametersResult,
  'addParameterValue' | 'removeParameterValue' | 'updateParameterId' | 'updateParameterValue'
> => {
  const addParameterValue = useCallback((): void => {
    setBaseParameterValues((current): ProductParameterValue[] => [
      ...current,
      { parameterId: '', value: '' },
    ]);
  }, [setBaseParameterValues]);
  const updateParameterId = useCallback((index: number, parameterId: string): void => {
    setBaseParameterValues((current): ProductParameterValue[] =>
      updateBaseParameterValueAt(
        current,
        index,
        parameterValueIndexMap,
        (entry): ProductParameterValue => ({ ...entry, parameterId })
      )
    );
  }, [parameterValueIndexMap, setBaseParameterValues]);
  const updateParameterValue = useCallback((index: number, value: string): void => {
    setBaseParameterValues((current): ProductParameterValue[] =>
      updateBaseParameterValueAt(
        current,
        index,
        parameterValueIndexMap,
        (entry): ProductParameterValue => ({ ...entry, value })
      )
    );
  }, [parameterValueIndexMap, setBaseParameterValues]);
  const removeParameterValue = useCallback((index: number): void => {
    const baseIndex = resolveBaseParameterIndex(index, parameterValueIndexMap);
    if (baseIndex < 0) return;
    setBaseParameterValues((current): ProductParameterValue[] =>
      current.filter((_entry, entryIndex): boolean => entryIndex !== baseIndex)
    );
  }, [parameterValueIndexMap, setBaseParameterValues]);

  return { addParameterValue, removeParameterValue, updateParameterId, updateParameterValue };
};

export function useDraftCreatorParameters({
  metadataParameters,
  metadataSimpleParameters,
  nameEn,
  selectedCatalogIds,
}: UseDraftCreatorParametersInput): UseDraftCreatorParametersResult {
  const [baseParameterValues, setBaseParameterValues] = useState<ProductParameterValue[]>([]);
  const primaryCatalogId = selectedCatalogIds[0] ?? '';
  const parameterDefinitions = useDraftParameterDefinitions({
    baseParameterValues,
    metadataParameters,
    metadataSimpleParameters,
    primaryCatalogId,
  });
  const { parameterValueIndexMap, parameterValues } = useMergedDraftParameterValues({
    baseParameterValues,
    nameEn,
    parameterDefinitions,
  });
  const actions = useDraftParameterValueActions({
    parameterValueIndexMap,
    setBaseParameterValues,
  });

  return {
    ...actions,
    parameterDefinitions,
    parameterValues,
    setParameterValues: setBaseParameterValues,
  };
}
