import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import type { ProductFormData, ProductDraft } from '@/shared/contracts/products/drafts';
import type {
  ProductParameter,
  ProductSimpleParameter,
} from '@/shared/contracts/products/parameters';
import type { ProductParameterValue, ProductWithImages } from '@/shared/contracts/products/product';
import type { ProductTitleTerm, ProductTitleTermType } from '@/shared/contracts/products/title-terms';

import {
  useParameters,
  useSimpleParameters,
  useTitleTerms,
} from '../hooks/useProductMetadataQueries';
import { mergeParameterDefinitions } from './ProductFormParameterDefinitions';
import {
  buildTitleTermLookup,
  isLinkedTitleTermType,
  mergeLinkedParameterValues,
  normalizeSourceParameterValues,
  resolveLinkedParameterValuesById,
  resolveStructuredLinkedTermValues,
  serializeParameterValues,
  type MergedParameterValuesResult,
} from './ProductFormParameterContext.utils';

type ParameterProviderDataArgs = {
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  selectedCatalogIds: string[];
};

type ParameterProviderData = {
  primaryCatalogId: string;
  parameterDefinitions: ProductParameter[];
  parametersLoading: boolean;
  baseParameterValues: ProductParameterValue[];
  setBaseParameterValues: Dispatch<SetStateAction<ProductParameterValue[]>>;
  currentStructuredName: string;
};

type MergedParameterData = {
  parameterValues: ProductParameterValue[];
  parameterValueIndexMap: number[];
};

type ParameterDefinitionQueryResult = Pick<
  ParameterProviderData,
  'parameterDefinitions' | 'parametersLoading'
>;

const resolveCurrentStructuredName = (
  watchedNameEn: unknown,
  product: ProductWithImages | undefined,
  draft: ProductDraft | null | undefined
): string => {
  if (typeof watchedNameEn === 'string') return watchedNameEn;
  return product?.name_en ?? draft?.name_en ?? '';
};

const collectReferencedParameterIds = (values: ProductParameterValue[]): Set<string> =>
  new Set(
    values
      .map((value: ProductParameterValue): string => value.parameterId.trim())
      .filter((parameterId: string): boolean => parameterId.length > 0)
  );

const filterReferencedDefinitions = <Definition extends { id: string }>(
  definitions: Definition[],
  referencedIds: ReadonlySet<string>
): Definition[] =>
  definitions.filter((definition: Definition): boolean => referencedIds.has(definition.id));

const useProductParameterDefinitionQueries = ({
  primaryCatalogId,
  sourceParameterValues,
}: {
  primaryCatalogId: string;
  sourceParameterValues: ProductParameterValue[];
}): ParameterDefinitionQueryResult => {
  const referencedParameterIds = useMemo(
    () => collectReferencedParameterIds(sourceParameterValues),
    [sourceParameterValues]
  );
  const shouldLoadReferencedParameterDefinitions = referencedParameterIds.size > 0;
  const parametersQuery = useParameters(primaryCatalogId);
  const simpleParametersQuery = useSimpleParameters(primaryCatalogId);
  const referencedParametersQuery = useParameters(undefined, {
    allowWithoutCatalog: true,
    enabled: shouldLoadReferencedParameterDefinitions,
  });
  const referencedSimpleParametersQuery = useSimpleParameters(undefined, {
    allowWithoutCatalog: true,
    enabled: shouldLoadReferencedParameterDefinitions,
  });
  const parameterDefinitions = useMemo(() => {
    const referencedParameters = filterReferencedDefinitions<ProductParameter>(
      referencedParametersQuery.data ?? [],
      referencedParameterIds
    );
    const referencedSimpleParameters = filterReferencedDefinitions<ProductSimpleParameter>(
      referencedSimpleParametersQuery.data ?? [],
      referencedParameterIds
    );

    return mergeParameterDefinitions({
      parameters: [...referencedParameters, ...(parametersQuery.data ?? [])],
      simpleParameters: [...referencedSimpleParameters, ...(simpleParametersQuery.data ?? [])],
      parameterValues: sourceParameterValues,
      fallbackCatalogId: primaryCatalogId,
    });
  }, [
    parametersQuery.data,
    primaryCatalogId,
    referencedParameterIds,
    referencedParametersQuery.data,
    referencedSimpleParametersQuery.data,
    simpleParametersQuery.data,
    sourceParameterValues,
  ]);

  return {
    parameterDefinitions,
    parametersLoading:
      parametersQuery.isLoading ||
      simpleParametersQuery.isLoading ||
      referencedParametersQuery.isLoading ||
      referencedSimpleParametersQuery.isLoading,
  };
};

const useAdoptSourceParameterValues = ({
  sourceParameterValues,
  sourceParameterValuesKey,
  adoptedParameterValuesKeyRef,
  setBaseParameterValues,
}: {
  sourceParameterValues: ProductParameterValue[];
  sourceParameterValuesKey: string;
  adoptedParameterValuesKeyRef: MutableRefObject<string>;
  setBaseParameterValues: Dispatch<SetStateAction<ProductParameterValue[]>>;
}): void => {
  const adoptedKeyRef = adoptedParameterValuesKeyRef;
  useEffect(() => {
    const previousAdoptedKey = adoptedKeyRef.current;
    if (sourceParameterValuesKey === previousAdoptedKey) return;

    setBaseParameterValues((current) => {
      const currentKey = serializeParameterValues(current);
      if (currentKey !== previousAdoptedKey) return current;
      adoptedKeyRef.current = sourceParameterValuesKey;
      return sourceParameterValues;
    });
  }, [adoptedKeyRef, setBaseParameterValues, sourceParameterValues, sourceParameterValuesKey]);
};

export function useProductFormParameterProviderData({
  product,
  draft,
  selectedCatalogIds,
}: ParameterProviderDataArgs): ParameterProviderData {
  const primaryCatalogId = selectedCatalogIds[0] ?? '';
  const formContext = useFormContext<ProductFormData>();
  const sourceParameterValues = useMemo(
    () => normalizeSourceParameterValues(product?.parameters ?? draft?.parameters),
    [draft?.parameters, product?.parameters]
  );
  const { parameterDefinitions, parametersLoading } = useProductParameterDefinitionQueries({
    primaryCatalogId,
    sourceParameterValues,
  });
  const sourceParameterValuesKey = useMemo(
    () => serializeParameterValues(sourceParameterValues),
    [sourceParameterValues]
  );
  const [baseParameterValues, setBaseParameterValues] = useState(sourceParameterValues);
  const adoptedParameterValuesKeyRef = useRef(sourceParameterValuesKey);
  const watchedNameEn = useWatch({ control: formContext.control, name: 'name_en' });
  useAdoptSourceParameterValues({
    sourceParameterValues,
    sourceParameterValuesKey,
    adoptedParameterValuesKeyRef,
    setBaseParameterValues,
  });

  return {
    primaryCatalogId,
    parameterDefinitions,
    parametersLoading,
    baseParameterValues,
    setBaseParameterValues,
    currentStructuredName: resolveCurrentStructuredName(watchedNameEn, product, draft),
  };
}

export function useMergedProductParameterValues({
  primaryCatalogId,
  parameterDefinitions,
  baseParameterValues,
  currentStructuredName,
}: Pick<
  ParameterProviderData,
  'primaryCatalogId' | 'parameterDefinitions' | 'baseParameterValues' | 'currentStructuredName'
>): MergedParameterData {
  const sizeTermsQuery = useTitleTerms(primaryCatalogId, 'size');
  const materialTermsQuery = useTitleTerms(primaryCatalogId, 'material');
  const themeTermsQuery = useTitleTerms(primaryCatalogId, 'theme');
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
    (): Record<ProductTitleTermType, string> =>
      resolveStructuredLinkedTermValues(currentStructuredName),
    [currentStructuredName]
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
    (): MergedParameterValuesResult =>
      mergeLinkedParameterValues({
        baseValues: baseParameterValues,
        linkedParameterIds,
        linkedParameters,
        resolvedLinkedValuesById,
      }),
    [baseParameterValues, linkedParameterIds, linkedParameters, resolvedLinkedValuesById]
  );

  return {
    parameterValues: mergedParameterValues.values,
    parameterValueIndexMap: mergedParameterValues.baseIndexByValueIndex,
  };
}
