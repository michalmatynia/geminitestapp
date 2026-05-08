import 'server-only';

import type { ScripterImportDraft } from '@/features/playwright/scripters';
import type { ProductCreateInput, ProductUpdateInput } from '@/shared/contracts/products/io';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type { PriceGroupForCalculation } from '@/shared/contracts/products/product';
import {
  normalizeStructuredProductName,
  parseStructuredProductName,
} from '@/shared/lib/products/title-terms';

import type {
  ProductScrapeCandidate,
  ProductScrapeProfileConfig,
} from './product-scrape-profiles.candidates';
import type { ProductScrapeImagePayload } from './product-scrape-profile-images';
import {
  buildScrapeTemplateValues,
  renderScrapeTemplateCustomFields,
  renderScrapeTemplateMarketplaceOverrides,
  renderScrapeTemplateNotes,
  renderScrapeTemplateText,
  type ScrapeTemplateValues,
} from './product-scrape-template-renderer';
import { buildCalculatedImportedPrice } from './product-scrape-profiles.payload-pricing';
import type { ScrapeTemplateLinkedParameterMetadata } from './product-scrape-template-linked-parameters';
import { buildScrapeTemplateParameterField } from './product-scrape-template-parameters';

type ProductScrapePayloadInput = {
  candidate: ProductScrapeCandidate;
  draft: ScripterImportDraft;
  imagePayload?: ProductScrapeImagePayload;
  profile: ProductScrapeProfileConfig;
  catalogIds: string[];
  catalogDefaultPriceGroupId: string | null;
  priceGroups: PriceGroupForCalculation[];
  sourcePriceCurrencyCode: string;
  template?: ProductDraft | null;
  templateCategoryAliases?: readonly string[];
  templateLinkedParameterMetadata?: ScrapeTemplateLinkedParameterMetadata | null;
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

const resolveDefaultPriceGroupId = (
  template: ProductDraft | null | undefined,
  catalogDefaultPriceGroupId: string | null
): string | null => {
  if (hasTemplateString(template?.defaultPriceGroupId)) return template.defaultPriceGroupId;
  if (hasTemplateString(catalogDefaultPriceGroupId)) return catalogDefaultPriceGroupId;
  return null;
};

const buildTemplateIdDefaults = (
  template: ProductDraft | null | undefined,
  catalogDefaultPriceGroupId: string | null
): Partial<ProductCreateInput & ProductUpdateInput> => {
  const defaultPriceGroupId = resolveDefaultPriceGroupId(template, catalogDefaultPriceGroupId);
  return {
    ...(defaultPriceGroupId !== null ? { defaultPriceGroupId } : {}),
    ...(hasTemplateString(template?.shippingGroupId)
      ? { shippingGroupId: template.shippingGroupId }
      : {}),
  };
};

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
  values: ScrapeTemplateValues,
  catalogDefaultPriceGroupId: string | null
): Partial<ProductCreateInput & ProductUpdateInput> => {
  if (template === null || template === undefined) return {};

  return {
    ...buildTemplateIdentifierDefaults(template, values),
    ...buildTemplateNumericDefaults(template),
    ...buildTemplateIdDefaults(template, catalogDefaultPriceGroupId),
    ...buildTemplateRenderedDefaults(template, values),
  };
};

const buildRenderedNameFields = ({
  candidate,
  renderedTemplateNameEn,
  templateCategoryAliases,
  values,
  template,
}: Pick<ProductScrapePayloadInput, 'candidate' | 'template' | 'templateCategoryAliases'> & {
  renderedTemplateNameEn: string | null;
  values: ScrapeTemplateValues;
}): Pick<ProductCreateInput, 'sku' | 'importSource' | 'name_pl'> &
  Partial<Pick<ProductCreateInput, 'name_en' | 'name_de'>> => {
  const nameEn = resolveRenderedNameEn(template, renderedTemplateNameEn, templateCategoryAliases);
  const nameDe = renderScrapeTemplateText(template?.name_de, values);

  return {
    sku: resolveRenderedSku(candidate, template, values),
    importSource: 'scrape',
    name_en: nameEn ?? candidate.title,
    name_pl: resolveRenderedNamePl(candidate, template, values),
    ...(nameDe !== null ? { name_de: nameDe } : {}),
  };
};

const resolveRenderedNameEn = (
  template: ProductDraft | null | undefined,
  renderedTemplateNameEn: string | null,
  templateCategoryAliases: readonly string[] | undefined
): string | null => {
  if (renderedTemplateNameEn === null) return null;
  if (!hasTemplateString(template?.categoryId)) return null;
  if (!hasTemplateCategoryAliases(templateCategoryAliases)) return null;

  const normalizedNameEn = normalizeStructuredProductName(renderedTemplateNameEn);
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

const buildTemplateCollectionFields = (
  template: ProductDraft | null | undefined,
  values: ScrapeTemplateValues,
  renderedNameEn: string | null | undefined,
  linkedParameterMetadata: ScrapeTemplateLinkedParameterMetadata | null | undefined
): Partial<ProductCreateInput & ProductUpdateInput> => {
  return {
    ...buildTemplateCategoryField(template?.categoryId),
    ...buildTemplateRelationFields(template),
    ...buildScrapeTemplateParameterField({
      linkedParameterMetadata,
      parameters: template?.parameters,
      renderedNameEn,
      values,
    }),
  };
};

const buildImageFields = (
  candidate: ProductScrapeCandidate,
  imagePayload: ProductScrapeImagePayload | undefined
): Pick<ProductCreateInput, 'imageLinks'> &
  Partial<Pick<ProductCreateInput, 'imageFileIds'>> => ({
  imageLinks: imagePayload?.imageLinks ?? candidate.imageLinks,
  ...(imagePayload?.imageFileIds !== undefined ? { imageFileIds: imagePayload.imageFileIds } : {}),
});

const buildSourcePriceFields = (
  candidate: ProductScrapeCandidate,
  sourcePriceCurrencyCode: string
): Partial<Pick<ProductCreateInput, 'sourcePrice' | 'sourcePriceCurrencyCode'>> =>
  candidate.price !== null ? { sourcePrice: candidate.price, sourcePriceCurrencyCode } : {};

const buildCommonPayloadFields = ({
  candidate,
  draft,
  imagePayload,
  profile,
  catalogIds,
  catalogDefaultPriceGroupId,
  priceGroups,
  sourcePriceCurrencyCode,
  template,
  templateCategoryAliases,
  templateLinkedParameterMetadata,
}: ProductScrapePayloadInput): ProductCreateInput => {
  const values = buildScrapeTemplateValues(draft, candidate);
  const renderedTemplateNameEn = renderScrapeTemplateText(template?.name_en, values);
  const renderedNameFields = buildRenderedNameFields({
    candidate,
    renderedTemplateNameEn,
    values,
    template,
    templateCategoryAliases,
  });

  return {
    ...renderedNameFields,
    ...buildRenderedDescriptionFields(template, values),
    ...buildRenderedSupplierFields({ candidate, profile, template, values }),
    ...buildTemplateIdDefaults(template, catalogDefaultPriceGroupId),
    ...buildCalculatedImportedPrice({
      candidate,
      catalogDefaultPriceGroupId,
      priceGroups,
      sourcePriceCurrencyCode,
      templateDefaultPriceGroupId: template?.defaultPriceGroupId,
      templatePrice: template?.price,
    }),
    ...buildTemplatePayloadDefaults(template, values, catalogDefaultPriceGroupId),
    catalogIds,
    ...buildTemplateCollectionFields(
      template,
      values,
      renderedTemplateNameEn,
      templateLinkedParameterMetadata
    ),
    ...buildImageFields(candidate, imagePayload),
    ...buildSourcePriceFields(candidate, sourcePriceCurrencyCode),
  };
};

export const buildCreatePayload = (input: ProductScrapePayloadInput): ProductCreateInput => {
  const commonPayload = buildCommonPayloadFields(input);
  return {
    ...commonPayload,
    stock: commonPayload.stock ?? 0,
  };
};

export const buildUpdatePayload = (input: ProductScrapePayloadInput): ProductUpdateInput =>
  buildCommonPayloadFields(input);

export const resolveResultPayloadTitle = (
  payload: ProductCreateInput | ProductUpdateInput,
  candidate: ProductScrapeCandidate
): string => payload.name_pl ?? payload.name_en ?? payload.name_de ?? candidate.title;
