import 'server-only';

import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type { ProductParameterValue } from '@/shared/contracts/products/product';

import {
  renderScrapeTemplateParameterValues,
  type ScrapeTemplateValues,
} from './product-scrape-template-renderer';
import {
  buildScrapeTemplateLinkedParameterValues,
  type ScrapeTemplateLinkedParameterMetadata,
} from './product-scrape-template-linked-parameters';

type ScrapeTemplateParameterFieldInput = {
  linkedParameterMetadata: ScrapeTemplateLinkedParameterMetadata | null | undefined;
  parameters: ProductDraft['parameters'];
  renderedNameEn: string | null | undefined;
  values: ScrapeTemplateValues;
};

export type ScrapeTemplateParameterField = {
  parameters?: ProductParameterValue[];
};

const hasItems = <T,>(value: T[] | null | undefined): value is T[] =>
  Array.isArray(value) && value.length > 0;

const hasParameterValueContent = (parameter: ProductParameterValue): boolean => {
  const directValue = typeof parameter.value === 'string' ? parameter.value.trim() : '';
  if (directValue.length > 0) return true;
  return (
    parameter.valuesByLanguage !== undefined &&
    Object.values(parameter.valuesByLanguage).some((value) => value.trim().length > 0)
  );
};

const mergeRenderedAndLinkedParameters = (
  renderedParameters: ProductParameterValue[],
  linkedParameters: ProductParameterValue[]
): ProductParameterValue[] => {
  if (renderedParameters.length === 0) return linkedParameters;
  if (linkedParameters.length === 0) return renderedParameters;

  const linkedById = new Map<string, ProductParameterValue>(
    linkedParameters.map((parameter) => [parameter.parameterId, parameter])
  );
  const usedIds = new Set<string>();
  const merged = renderedParameters.map((parameter) => {
    usedIds.add(parameter.parameterId);
    if (hasParameterValueContent(parameter)) return parameter;
    const linkedParameter = linkedById.get(parameter.parameterId);
    if (linkedParameter === undefined) return parameter;
    return {
      ...linkedParameter,
      ...(parameter.skipParameterInference === true ? { skipParameterInference: true } : {}),
    };
  });

  linkedParameters.forEach((parameter) => {
    if (!usedIds.has(parameter.parameterId)) merged.push(parameter);
  });

  return merged;
};

export const buildScrapeTemplateParameterField = ({
  linkedParameterMetadata,
  parameters,
  renderedNameEn,
  values,
}: ScrapeTemplateParameterFieldInput): ScrapeTemplateParameterField => {
  const renderedParameters = hasItems(parameters)
    ? renderScrapeTemplateParameterValues(parameters, values)
    : [];
  const linkedParameters = buildScrapeTemplateLinkedParameterValues({
    metadata: linkedParameterMetadata,
    renderedNameEn,
  });
  const parametersPayload = mergeRenderedAndLinkedParameters(
    renderedParameters,
    linkedParameters
  );
  return parametersPayload.length > 0 ? { parameters: parametersPayload } : {};
};
