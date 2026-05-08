import 'server-only';

import type {
  ProductParameter,
  ProductSimpleParameter,
} from '@/shared/contracts/products/parameters';
import type { ProductParameterValue } from '@/shared/contracts/products/product';
import type { ProductTitleTerm, ProductTitleTermType } from '@/shared/contracts/products/title-terms';
import { getParameterRepository } from '@/shared/lib/products/services/parameter-repository';
import { listSimpleParameters } from '@/shared/lib/products/services/simple-parameter-service';
import { getTitleTermRepository } from '@/shared/lib/products/services/title-term-repository';
import {
  normalizeTitleTermName,
  resolveStructuredProductTitleTermValues,
} from '@/shared/lib/products/title-terms';

type LinkedParameterDefinition = {
  id: string;
  linkedTitleTermType: ProductTitleTermType;
};

export type ScrapeTemplateLinkedParameterMetadata = {
  parameters: LinkedParameterDefinition[];
  titleTermsByType: Record<ProductTitleTermType, ProductTitleTerm[]>;
};

const emptyMetadata = (): ScrapeTemplateLinkedParameterMetadata => ({
  parameters: [],
  titleTermsByType: {
    size: [],
    material: [],
    theme: [],
  },
});

const isLinkedParameterDefinition = (
  parameter: ProductParameter
): parameter is ProductParameter & { linkedTitleTermType: ProductTitleTermType } =>
  parameter.linkedTitleTermType === 'size' ||
  parameter.linkedTitleTermType === 'material' ||
  parameter.linkedTitleTermType === 'theme';

const isLinkedSimpleParameterDefinition = (
  parameter: ProductSimpleParameter
): parameter is ProductSimpleParameter & { linkedTitleTermType: ProductTitleTermType } =>
  parameter.linkedTitleTermType === 'size' ||
  parameter.linkedTitleTermType === 'material' ||
  parameter.linkedTitleTermType === 'theme';

const buildLinkedParameterDefinitions = async (): Promise<LinkedParameterDefinition[]> => {
  const parameterRepository = await getParameterRepository();
  const parameters = (await parameterRepository.listParameters({}))
    .filter(isLinkedParameterDefinition)
    .map((parameter) => ({
      id: parameter.id,
      linkedTitleTermType: parameter.linkedTitleTermType,
    }));
  const simpleParameters = (await listSimpleParameters({ catalogId: null }))
    .filter(isLinkedSimpleParameterDefinition)
    .map((parameter) => ({
      id: parameter.id,
      linkedTitleTermType: parameter.linkedTitleTermType,
    }));
  const byId = new Map<string, LinkedParameterDefinition>();
  [...simpleParameters, ...parameters].forEach((parameter) => {
    byId.set(parameter.id, parameter);
  });
  return Array.from(byId.values());
};

export const loadScrapeTemplateLinkedParameterMetadata =
  async (): Promise<ScrapeTemplateLinkedParameterMetadata> => {
    const parameters = await buildLinkedParameterDefinitions();

    if (parameters.length === 0) return emptyMetadata();

    const titleTermRepository = await getTitleTermRepository();
    const [size, material, theme] = await Promise.all([
      titleTermRepository.listTitleTerms({ type: 'size' }),
      titleTermRepository.listTitleTerms({ type: 'material' }),
      titleTermRepository.listTitleTerms({ type: 'theme' }),
    ]);

    return {
      parameters,
      titleTermsByType: {
        size,
        material,
        theme,
      },
    };
  };

const findTitleTerm = (
  terms: ProductTitleTerm[],
  value: string
): ProductTitleTerm | null => {
  const lookupKey = normalizeTitleTermName(value);
  if (lookupKey.length === 0) return null;
  return terms.find((term) => normalizeTitleTermName(term.name_en) === lookupKey) ?? null;
};

const buildLocalizedValues = (
  term: ProductTitleTerm | null
): Record<string, string> | undefined => {
  if (term === null) return undefined;
  return {
    en: term.name_en,
    pl: term.name_pl !== null && term.name_pl.trim().length > 0 ? term.name_pl : term.name_en,
  };
};

const buildLinkedParameterValue = (
  parameter: LinkedParameterDefinition,
  renderedNameEn: string,
  metadata: ScrapeTemplateLinkedParameterMetadata
): ProductParameterValue | null => {
  const linkedType = parameter.linkedTitleTermType;
  const structuredValues = resolveStructuredProductTitleTermValues(renderedNameEn);
  const value = structuredValues[linkedType]?.trim() ?? '';
  if (value.length === 0) return null;

  const term = findTitleTerm(metadata.titleTermsByType[linkedType], value);
  const resolvedValue = term?.name_en ?? value;
  const valuesByLanguage = buildLocalizedValues(term);

  return {
    parameterId: parameter.id,
    value: resolvedValue,
    ...(valuesByLanguage !== undefined ? { valuesByLanguage } : {}),
  };
};

export const buildScrapeTemplateLinkedParameterValues = ({
  metadata,
  renderedNameEn,
}: {
  metadata: ScrapeTemplateLinkedParameterMetadata | null | undefined;
  renderedNameEn: string | null | undefined;
}): ProductParameterValue[] => {
  if (metadata === null || metadata === undefined) return [];
  if (typeof renderedNameEn !== 'string' || renderedNameEn.trim().length === 0) return [];

  return metadata.parameters
    .map((parameter) => buildLinkedParameterValue(parameter, renderedNameEn, metadata))
    .filter((parameter): parameter is ProductParameterValue => parameter !== null);
};
