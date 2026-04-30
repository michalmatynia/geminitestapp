import 'server-only';

import type { ScripterImportDraft } from '@/features/playwright/scripters';
import type { ProductCreateInput, ProductUpdateInput } from '@/shared/contracts/products/io';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import {
  normalizeStructuredProductName,
  parseStructuredProductName,
} from '@/shared/lib/products/title-terms';

import type {
  ProductScrapeCandidate,
  ProductScrapeProfileConfig,
} from './product-scrape-profiles.candidates';
import {
  buildScrapeTemplateValues,
  renderScrapeTemplateCustomFields,
  renderScrapeTemplateMarketplaceOverrides,
  renderScrapeTemplateNotes,
  renderScrapeTemplateParameterValues,
  renderScrapeTemplateText,
  type ScrapeTemplateValues,
} from './product-scrape-template-renderer';

type ProductScrapePayloadInput = {
  candidate: ProductScrapeCandidate;
  draft: ScripterImportDraft;
  profile: ProductScrapeProfileConfig;
  catalogIds: string[];
  template?: ProductDraft | null;
  templateCategoryAliases?: readonly string[];
};

const hasTemplateNumber = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const hasTemplateString = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const hasItems = <T,>(value: T[] | null | undefined): value is T[] =>
  Array.isArray(value) && value.length > 0;

const buildTemplateIdentifierDefaults = (
  template: ProductDraft,
  values: ScrapeTemplateValues
): Partial<ProductCreateInput & ProductUpdateInput> => {
  const ean = renderScrapeTemplateText(template.ean, values);
  const gtin = renderScrapeTemplateText(template.gtin, values);
  const asin = renderScrapeTemplateText(template.asin, values);

  return {
    ...(ean !== null ? { ean } : {}),
    ...(gtin !== null ? { gtin } : {}),
    ...(asin !== null ? { asin } : {}),
  };
};

const buildTemplateNumericDefaults = (
  template: ProductDraft
): Partial<ProductCreateInput & ProductUpdateInput> => ({
  ...(hasTemplateNumber(template.price) ? { price: template.price } : {}),
  ...(hasTemplateNumber(template.weight) ? { weight: template.weight } : {}),
  ...(hasTemplateNumber(template.sizeLength) ? { sizeLength: template.sizeLength } : {}),
  ...(hasTemplateNumber(template.sizeWidth) ? { sizeWidth: template.sizeWidth } : {}),
  ...(hasTemplateNumber(template.length) ? { length: template.length } : {}),
  ...(hasTemplateNumber(template.stock) ? { stock: template.stock } : {}),
});

const buildTemplateIdDefaults = (
  template: ProductDraft
): Partial<ProductCreateInput & ProductUpdateInput> => ({
  ...(hasTemplateString(template.defaultPriceGroupId)
    ? { defaultPriceGroupId: template.defaultPriceGroupId }
    : {}),
  ...(hasTemplateString(template.shippingGroupId)
    ? { shippingGroupId: template.shippingGroupId }
    : {}),
});

const buildTemplateRenderedDefaults = (
  template: ProductDraft,
  values: ScrapeTemplateValues
): Partial<ProductCreateInput & ProductUpdateInput> => {
  const customFields = renderScrapeTemplateCustomFields(template.customFields, values);
  const marketplaceContentOverrides = renderScrapeTemplateMarketplaceOverrides(
    template.marketplaceContentOverrides,
    values
  );
  const notes = renderScrapeTemplateNotes(template.notes, values);

  return {
    ...(customFields.length > 0 ? { customFields } : {}),
    ...(marketplaceContentOverrides.length > 0 ? { marketplaceContentOverrides } : {}),
    ...(notes !== null ? { notes } : {}),
  };
};

const buildTemplatePayloadDefaults = (
  template: ProductDraft | null | undefined,
  values: ScrapeTemplateValues
): Partial<ProductCreateInput & ProductUpdateInput> => {
  if (template === null || template === undefined) return {};

  return {
    ...buildTemplateIdentifierDefaults(template, values),
    ...buildTemplateNumericDefaults(template),
    ...buildTemplateIdDefaults(template),
    ...buildTemplateRenderedDefaults(template, values),
  };
};

const buildRenderedNameFields = ({
  candidate,
  templateCategoryAliases,
  values,
  template,
}: Pick<ProductScrapePayloadInput, 'candidate' | 'template' | 'templateCategoryAliases'> & {
  values: ScrapeTemplateValues;
}): Pick<ProductCreateInput, 'sku' | 'importSource' | 'name_pl'> &
  Partial<Pick<ProductCreateInput, 'name_en' | 'name_de'>> => {
  const nameEn = resolveRenderedNameEn(template, values, templateCategoryAliases);
  const nameDe = renderScrapeTemplateText(template?.name_de, values);

  return {
    sku: resolveRenderedSku(candidate, template, values),
    importSource: 'scrape',
    ...(nameEn !== null ? { name_en: nameEn } : {}),
    name_pl: resolveRenderedNamePl(candidate, template, values),
    ...(nameDe !== null ? { name_de: nameDe } : {}),
  };
};

const resolveRenderedNameEn = (
  template: ProductDraft | null | undefined,
  values: ScrapeTemplateValues,
  templateCategoryAliases: readonly string[] | undefined
): string | null => {
  const nameEn = renderScrapeTemplateText(template?.name_en, values);
  if (nameEn === null) return null;
  if (!hasTemplateString(template?.categoryId)) return null;
  if (!hasTemplateCategoryAliases(templateCategoryAliases)) return null;

  const normalizedNameEn = normalizeStructuredProductName(nameEn);
  const categorySegment = resolveStructuredNameCategorySegment(normalizedNameEn);
  if (categorySegment === null) return null;
  return templateCategoryAliases.includes(categorySegment) ? normalizedNameEn : null;
};

const normalizeStructuredCategorySegment = (value: string): string =>
  value.trim().replace(/\s+/g, ' ');

const hasTemplateCategoryAliases = (
  value: readonly string[] | undefined
): value is readonly string[] => Array.isArray(value) && value.length > 0;

const resolveStructuredNameCategorySegment = (nameEn: string): string | null => {
  const parsed = parseStructuredProductName(nameEn);
  return parsed === null ? null : normalizeStructuredCategorySegment(parsed.category);
};

const resolveRenderedSku = (
  candidate: ProductScrapeCandidate,
  template: ProductDraft | null | undefined,
  values: ScrapeTemplateValues
): string => renderScrapeTemplateText(template?.sku, values) ?? candidate.sku;

const resolveRenderedNamePl = (
  candidate: ProductScrapeCandidate,
  template: ProductDraft | null | undefined,
  values: ScrapeTemplateValues
): string => renderScrapeTemplateText(template?.name_pl, values) ?? candidate.title;

const buildRenderedDescriptionFields = (
  template: ProductDraft | null | undefined,
  values: ScrapeTemplateValues
): Partial<Pick<ProductCreateInput, 'description_en' | 'description_pl' | 'description_de'>> => {
  const descriptionEn = renderScrapeTemplateText(template?.description_en, values);
  const descriptionPl = renderScrapeTemplateText(template?.description_pl, values);
  const descriptionDe = renderScrapeTemplateText(template?.description_de, values);

  return {
    ...(descriptionEn !== null ? { description_en: descriptionEn } : {}),
    ...(descriptionPl !== null ? { description_pl: descriptionPl } : {}),
    ...(descriptionDe !== null ? { description_de: descriptionDe } : {}),
  };
};

const buildRenderedSupplierFields = ({
  candidate,
  profile,
  template,
  values,
}: Pick<ProductScrapePayloadInput, 'candidate' | 'profile' | 'template'> & {
  values: ScrapeTemplateValues;
}): Pick<ProductCreateInput, 'supplierName' | 'supplierLink' | 'priceComment'> => ({
  supplierName: renderScrapeTemplateText(template?.supplierName, values) ?? profile.supplierName,
  supplierLink: renderScrapeTemplateText(template?.supplierLink, values) ?? candidate.sourceUrl,
  priceComment: renderScrapeTemplateText(template?.priceComment, values) ?? profile.priceComment,
});

const buildTemplateCategoryField = (
  categoryId: string | null | undefined
): Partial<ProductCreateInput & ProductUpdateInput> =>
  hasTemplateString(categoryId) ? { categoryId } : {};

const buildTemplateRelationFields = (
  template: ProductDraft | null | undefined
): Partial<ProductCreateInput & ProductUpdateInput> => {
  const tagIds = template?.tagIds;
  const producerIds = template?.producerIds;

  return {
    ...(hasItems(tagIds) ? { tagIds } : {}),
    ...(hasItems(producerIds) ? { producerIds } : {}),
  };
};

const buildTemplateParameterField = (
  parameters: ProductDraft['parameters'],
  values: ScrapeTemplateValues
): Partial<ProductCreateInput & ProductUpdateInput> =>
  hasItems(parameters)
    ? { parameters: renderScrapeTemplateParameterValues(parameters, values) }
    : {};

const buildTemplateCollectionFields = (
  template: ProductDraft | null | undefined,
  values: ScrapeTemplateValues
): Partial<ProductCreateInput & ProductUpdateInput> => {
  return {
    ...buildTemplateCategoryField(template?.categoryId),
    ...buildTemplateRelationFields(template),
    ...buildTemplateParameterField(template?.parameters, values),
  };
};

const buildCommonPayloadFields = ({
  candidate,
  draft,
  profile,
  catalogIds,
  template,
  templateCategoryAliases,
}: ProductScrapePayloadInput): ProductCreateInput => {
  const values = buildScrapeTemplateValues(draft, candidate);

  return {
    ...buildRenderedNameFields({ candidate, values, template, templateCategoryAliases }),
    ...buildRenderedDescriptionFields(template, values),
    ...buildRenderedSupplierFields({ candidate, profile, template, values }),
    ...buildTemplatePayloadDefaults(template, values),
    catalogIds,
    ...buildTemplateCollectionFields(template, values),
    imageLinks: candidate.imageLinks,
    ...(candidate.price !== null ? { sourcePrice: candidate.price } : {}),
  };
};

export const buildCreatePayload = (input: ProductScrapePayloadInput): ProductCreateInput => {
  const commonPayload = buildCommonPayloadFields(input);

  const payload: ProductCreateInput = {
    ...commonPayload,
    stock: commonPayload.stock ?? 0,
  };
  return payload;
};

export const buildUpdatePayload = (input: ProductScrapePayloadInput): ProductUpdateInput =>
  buildCommonPayloadFields(input);

export const resolveResultPayloadTitle = (
  payload: ProductCreateInput | ProductUpdateInput,
  candidate: ProductScrapeCandidate
): string =>
  payload.name_pl ??
  payload.name_en ??
  payload.name_de ??
  candidate.title;
