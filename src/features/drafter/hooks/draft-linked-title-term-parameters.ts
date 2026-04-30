import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductParameterValue } from '@/shared/contracts/products/product';
import type { ProductTitleTerm, ProductTitleTermType } from '@/shared/contracts/products/title-terms';
import {
  normalizeTitleTermName,
  splitStructuredProductName,
} from '@/shared/lib/products/title-terms';

type ResolveDraftLinkedTitleTermParameterValuesInput = {
  existingParameterValues: ProductParameterValue[];
  materialTerms: ProductTitleTerm[];
  nameEn: string;
  parameters: ProductParameter[];
  sizeTerms: ProductTitleTerm[];
  themeTerms: ProductTitleTerm[];
};

const normalizeParameterId = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const resolveStructuredLinkedTermValues = (
  value: string
): Record<ProductTitleTermType, string> => {
  const segments = splitStructuredProductName(value);
  return {
    size: segments[1] ?? '',
    material: segments[2] ?? '',
    theme: segments[4] ?? '',
  };
};

const buildTitleTermLookup = (terms: ProductTitleTerm[]): Map<string, ProductTitleTerm> => {
  const lookup = new Map<string, ProductTitleTerm>();
  terms.forEach((term) => {
    const key = normalizeTitleTermName(term.name_en);
    if (key.length === 0 || lookup.has(key)) return;
    lookup.set(key, term);
  });
  return lookup;
};

const resolveTermLookup = (
  type: ProductTitleTermType,
  lookups: Record<ProductTitleTermType, Map<string, ProductTitleTerm>>
): Map<string, ProductTitleTerm> => lookups[type];

const resolveLinkedParameterValue = (
  parameterId: string,
  term: ProductTitleTerm
): ProductParameterValue => ({
  parameterId,
  value: term.name_en,
  valuesByLanguage: {
    en: term.name_en,
    pl: term.name_pl !== null && term.name_pl !== '' ? term.name_pl : term.name_en,
  },
});

export const resolveDraftLinkedTitleTermParameterValues = ({
  existingParameterValues,
  materialTerms,
  nameEn,
  parameters,
  sizeTerms,
  themeTerms,
}: ResolveDraftLinkedTitleTermParameterValuesInput): ProductParameterValue[] => {
  const linkedParameters = parameters.filter((parameter) => Boolean(parameter.linkedTitleTermType));
  const linkedParameterIds = new Set(linkedParameters.map((parameter) => parameter.id));
  if (linkedParameterIds.size === 0) return existingParameterValues;

  const skippedLinkedParameterIds = new Set(
    existingParameterValues
      .filter((entry) => {
        const parameterId = normalizeParameterId(entry.parameterId);
        return linkedParameterIds.has(parameterId) && entry.skipParameterInference === true;
      })
      .map((entry) => normalizeParameterId(entry.parameterId))
  );
  const manualParameterValues = existingParameterValues.filter((entry) => {
    const parameterId = normalizeParameterId(entry.parameterId);
    return !linkedParameterIds.has(parameterId) || entry.skipParameterInference === true;
  });
  const structuredValues = resolveStructuredLinkedTermValues(nameEn);
  const lookups: Record<ProductTitleTermType, Map<string, ProductTitleTerm>> = {
    size: buildTitleTermLookup(sizeTerms),
    material: buildTitleTermLookup(materialTerms),
    theme: buildTitleTermLookup(themeTerms),
  };
  const linkedValues = linkedParameters
    .map((parameter): ProductParameterValue | null => {
      if (skippedLinkedParameterIds.has(parameter.id)) return null;
      const linkedType = parameter.linkedTitleTermType;
      if (linkedType === null) return null;
      const lookupKey = normalizeTitleTermName(structuredValues[linkedType]);
      if (lookupKey.length === 0) return null;
      const term = resolveTermLookup(linkedType, lookups).get(lookupKey);
      return term !== undefined ? resolveLinkedParameterValue(parameter.id, term) : null;
    })
    .filter((entry): entry is ProductParameterValue => entry !== null);

  return [...manualParameterValues, ...linkedValues];
};
