import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductParameterValue } from '@/shared/contracts/products/product';
import type { ProductTitleTerm, ProductTitleTermType } from '@/shared/contracts/products/title-terms';
import {
  buildTitleTermLookup,
  isLinkedTitleTermType,
  mergeLinkedParameterValues,
  resolveLinkedParameterValuesById,
  resolveStructuredLinkedTermValues,
} from '@/features/products/context/ProductFormParameterContext.utils';

type ResolveDraftLinkedTitleTermParameterValuesInput = {
  existingParameterValues: ProductParameterValue[];
  materialTerms: ProductTitleTerm[];
  nameEn: string;
  parameters: ProductParameter[];
  sizeTerms: ProductTitleTerm[];
  themeTerms: ProductTitleTerm[];
};

export const resolveDraftLinkedTitleTermParameterValues = ({
  existingParameterValues,
  materialTerms,
  nameEn,
  parameters,
  sizeTerms,
  themeTerms,
}: ResolveDraftLinkedTitleTermParameterValuesInput): ProductParameterValue[] => {
  const linkedParameters = parameters.filter((parameter) =>
    isLinkedTitleTermType(parameter.linkedTitleTermType)
  );
  const linkedParameterIds = new Set(linkedParameters.map((parameter) => parameter.id));
  const structuredValues = resolveStructuredLinkedTermValues(nameEn);
  const lookups: Record<ProductTitleTermType, Map<string, ProductTitleTerm>> = {
    size: buildTitleTermLookup(sizeTerms),
    material: buildTitleTermLookup(materialTerms),
    theme: buildTitleTermLookup(themeTerms),
  };

  return mergeLinkedParameterValues({
    baseValues: existingParameterValues,
    linkedParameterIds,
    linkedParameters,
    resolvedLinkedValuesById: resolveLinkedParameterValuesById({
      linkedParameters,
      structuredLinkedTermValues: structuredValues,
      titleTermLookups: lookups,
    }),
  }).values;
};
