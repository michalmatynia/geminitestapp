import type { ScripterImportDraft } from '@/features/playwright/scripters';
import type { MappedScripterRecord } from '@/features/playwright/scripters/types';
import type { ProductCustomFieldValue } from '@/shared/contracts/products/custom-fields';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type {
  ProductMarketplaceContentOverrideDraft,
  ProductNotes,
  ProductParameterValue,
} from '@/shared/contracts/products/product';
export { SCRAPE_TEMPLATE_PLACEHOLDER_OPTIONS } from '@/shared/contracts/products/scrape-template-placeholders';
export type { ScrapeTemplatePlaceholderOption } from '@/shared/contracts/products/scrape-template-placeholders';

import type { ProductScrapeCandidate } from './product-scrape-profiles.candidates';

type PlaceholderValue = string | number | null | undefined;
export type ScrapeTemplateValues = Record<string, PlaceholderValue>;

const PLACEHOLDER_PATTERN = /\[([a-zA-Z][a-zA-Z0-9_.-]*)\]/g;

const normalizeTemplateString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const valueToString = (value: PlaceholderValue): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  return value;
};

const readRawString = (raw: Record<string, unknown>, key: string): string | null => {
  const value = raw[key];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
};

const resolveMappedRecord = (draft: ScripterImportDraft): Partial<MappedScripterRecord> =>
  draft.mapped ?? {};

const resolveExternalId = (
  draft: ScripterImportDraft,
  mapped: Partial<MappedScripterRecord>
): string | null | undefined =>
  draft.externalId ??
  mapped.externalId ??
  readRawString(draft.raw, 'product_id') ??
  readRawString(draft.raw, 'id');

const resolveBrand = (
  draft: ScripterImportDraft,
  mapped: Partial<MappedScripterRecord>
): string | null | undefined => mapped.brand ?? readRawString(draft.raw, 'producer');

const resolveCategory = (
  draft: ScripterImportDraft,
  mapped: Partial<MappedScripterRecord>
): string | null | undefined => mapped.category ?? readRawString(draft.raw, 'category');

const resolveFirstImage = (
  candidate: ProductScrapeCandidate,
  mapped: Partial<MappedScripterRecord>
): string | null => candidate.imageLinks[0] ?? mapped.images?.[0] ?? null;

export const buildScrapeTemplateValues = (
  draft: ScripterImportDraft,
  candidate: ProductScrapeCandidate
): ScrapeTemplateValues => {
  const mapped = resolveMappedRecord(draft);
  const externalId = resolveExternalId(draft, mapped);
  const brand = resolveBrand(draft, mapped);
  const category = resolveCategory(draft, mapped);
  const firstImage = resolveFirstImage(candidate, mapped);

  return {
    name: candidate.title,
    title: candidate.title,
    description: mapped.description ?? draft.draft.description_en ?? null,
    price: candidate.price,
    sourcePrice: candidate.price,
    currency: mapped.currency ?? readRawString(draft.raw, 'currency'),
    sku: candidate.sku,
    sourceSku: mapped.sku ?? draft.draft.sku ?? null,
    externalId,
    productId: readRawString(draft.raw, 'product_id') ?? externalId,
    brand,
    producer: brand,
    category,
    sourceUrl: candidate.sourceUrl,
    supplierLink: candidate.sourceUrl,
    imageUrl: firstImage,
  };
};

export const renderScrapeTemplateText = (
  value: string | null | undefined,
  values: ScrapeTemplateValues
): string | null => {
  const template = normalizeTemplateString(value);
  if (template === null) return null;
  const rendered = template.replace(PLACEHOLDER_PATTERN, (_match, key: string) =>
    valueToString(values[key])
  );
  const trimmed = rendered.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const renderScrapeTemplateValuesByLanguage = (
  input: ProductParameterValue['valuesByLanguage'],
  values: ScrapeTemplateValues
): Record<string, string> | undefined => {
  if (input === undefined) return undefined;

  const renderedValues = Object.entries(input).reduce(
    (acc: Record<string, string>, [rawLanguageCode, rawValue]: [string, string]) => {
      const normalizedLanguageCode = normalizeTemplateString(rawLanguageCode);
      if (normalizedLanguageCode === null) return acc;

      const renderedValue = renderScrapeTemplateText(rawValue, values);
      if (renderedValue === null) return acc;

      return {
        ...acc,
        [normalizedLanguageCode.toLowerCase()]: renderedValue,
      };
    },
    {}
  );

  return Object.keys(renderedValues).length > 0 ? renderedValues : undefined;
};

export const renderScrapeTemplateParameterValues = (
  parameters: ProductDraft['parameters'],
  values: ScrapeTemplateValues
): ProductParameterValue[] =>
  (parameters ?? [])
    .map((parameter): ProductParameterValue | null => {
      const parameterId = normalizeTemplateString(parameter.parameterId);
      if (parameterId === null) return null;
      const valuesByLanguage = renderScrapeTemplateValuesByLanguage(
        parameter.valuesByLanguage,
        values
      );
      return {
        parameterId,
        value: renderScrapeTemplateText(String(parameter.value ?? ''), values) ?? '',
        ...(valuesByLanguage !== undefined ? { valuesByLanguage } : {}),
        ...(parameter.skipParameterInference === true ? { skipParameterInference: true } : {}),
      };
    })
    .filter((parameter): parameter is ProductParameterValue => parameter !== null);

export const renderScrapeTemplateCustomFields = (
  customFields: ProductDraft['customFields'],
  values: ScrapeTemplateValues
): ProductCustomFieldValue[] =>
  (customFields ?? [])
    .map((customField): ProductCustomFieldValue | null => {
      const fieldId = normalizeTemplateString(customField.fieldId);
      if (fieldId === null) return null;
      return {
        fieldId,
        ...(customField.textValue !== undefined
          ? { textValue: renderScrapeTemplateText(customField.textValue, values) }
          : {}),
        ...(customField.selectedOptionIds !== undefined
          ? { selectedOptionIds: customField.selectedOptionIds }
          : {}),
      };
    })
    .filter((customField): customField is ProductCustomFieldValue => customField !== null);

export const renderScrapeTemplateMarketplaceOverrides = (
  overrides: ProductDraft['marketplaceContentOverrides'],
  values: ScrapeTemplateValues
): ProductMarketplaceContentOverrideDraft[] =>
  (overrides ?? [])
    .map((override): ProductMarketplaceContentOverrideDraft | null => {
      const integrationIds = override.integrationIds.filter(
        (integrationId) => integrationId.trim().length > 0
      );
      if (integrationIds.length === 0) return null;
      return {
        integrationIds,
        title: renderScrapeTemplateText(override.title, values),
        description: renderScrapeTemplateText(override.description, values),
      };
    })
    .filter(
      (override): override is ProductMarketplaceContentOverrideDraft => override !== null
    );

export const renderScrapeTemplateNotes = (
  notes: ProductDraft['notes'],
  values: ScrapeTemplateValues
): ProductNotes | null => {
  if (notes === null || notes === undefined) return null;
  const text = renderScrapeTemplateText(notes.text, values);
  const color = normalizeTemplateString(notes.color);
  if (text === null && color === null) return null;
  return { text, color };
};
