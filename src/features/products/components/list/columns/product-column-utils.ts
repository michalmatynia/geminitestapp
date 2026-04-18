import type { ProductWithImages } from '@/shared/contracts/products/product';

export type ProductNameKey = 'name_en' | 'name_pl' | 'name_de';

const NAME_KEY_TO_LANGUAGE_CODE: Record<ProductNameKey, string> = {
  name_en: 'en',
  name_pl: 'pl',
  name_de: 'de',
};

export const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const toDisplayString = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return '';
};

const toDisplayListString = (value: unknown): string => {
  if (Array.isArray(value)) {
    const parts = value.map((entry: unknown) => toDisplayListString(entry)).filter(Boolean);
    return parts.join(', ');
  }
  return toDisplayString(value);
};

const splitDisplaySegments = (value: string): string[] =>
  value
    .split('|')
    .map((segment: string) => segment.trim())
    .filter(Boolean);

export const getProductNameValue = (
  product: ProductWithImages,
  key: ProductNameKey
): string | undefined => {
  const value = product[key];
  if (typeof value === 'string' && value.trim().length > 0) return value;

  const localizedName = toTrimmedString(toRecord(product.name)?.[NAME_KEY_TO_LANGUAGE_CODE[key]]);
  return localizedName || undefined;
};

export const getProductDisplayName = (product: ProductWithImages): string =>
  getProductNameValue(product, 'name_en') ??
  getProductNameValue(product, 'name_pl') ??
  getProductNameValue(product, 'name_de') ??
  'Product';

export const getImageFilepath = (imageFile: unknown): string | undefined => {
  if (!imageFile || typeof imageFile !== 'object') return undefined;
  const filepath = (imageFile as { filepath?: unknown }).filepath;
  return typeof filepath === 'string' && filepath.trim().length > 0 ? filepath : undefined;
};

const getProductParameterDisplayValue = (parameter: unknown, key: ProductNameKey): string => {
  const record = toRecord(parameter);
  if (!record) return '';

  const directValue = toDisplayListString(record['value']);
  const valuesByLanguageRecord = toRecord(record['valuesByLanguage']) ?? {};
  const preferredLanguageCode = NAME_KEY_TO_LANGUAGE_CODE[key];

  for (const candidate of [preferredLanguageCode, 'en', 'pl', 'de', 'default']) {
    const localizedValue = toDisplayListString(valuesByLanguageRecord[candidate]);
    if (localizedValue) return localizedValue;
  }

  for (const candidate of [preferredLanguageCode, 'en', 'pl', 'de']) {
    const legacyLocalizedValue = toDisplayListString(record[`value_${candidate}`]);
    if (legacyLocalizedValue) return legacyLocalizedValue;
  }

  for (const localizedValue of Object.values(valuesByLanguageRecord)) {
    const normalizedValue = toDisplayListString(localizedValue);
    if (normalizedValue) return normalizedValue;
  }

  return directValue;
};

export const getProductListDisplayName = (
  product: ProductWithImages,
  key: ProductNameKey,
): string => {
  const rawBaseName = getProductNameValue(product, key) ?? '';
  if (!rawBaseName) return '';

  const parsedNameParts = rawBaseName
    .split('|')
    .map((part: string) => part.trim())
    .filter(Boolean);

  // If the product already has a composed title, treat it as canonical.
  // Rebuilding it from parameters can replace correct locale-specific segments
  // with incomplete fallback parameter values from another language.
  if (parsedNameParts.length > 1) {
    return rawBaseName;
  }

  const baseName = parsedNameParts[0] || rawBaseName;

  const seenValues = new Set<string>([baseName.trim().toLowerCase()]);
  const parameterValues = Array.isArray(product.parameters)
    ? product.parameters.reduce((acc: string[], parameter: unknown) => {
        const resolvedValue = getProductParameterDisplayValue(parameter, key).trim();
        if (!resolvedValue) return acc;

        for (const segment of splitDisplaySegments(resolvedValue)) {
          const signature = segment.toLowerCase();
          if (!segment || seenValues.has(signature)) continue;
          seenValues.add(signature);
          acc.push(segment);
        }
        return acc;
      }, [])
    : [];

  return parameterValues.length > 0 ? [baseName, ...parameterValues].join(' | ') : baseName;
};

const OPAQUE_CATEGORY_ID_PATTERN =
  /^(?:[a-f0-9]{24}|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

const CATEGORY_NAME_KEYS_BY_LOCALE: Record<ProductNameKey, string[]> = {
  name_en: ['name_en', 'name', 'name_pl', 'name_de'],
  name_pl: ['name_pl', 'name', 'name_en', 'name_de'],
  name_de: ['name_de', 'name', 'name_en', 'name_pl'],
};

const resolveProductCategoryRecord = (product: ProductWithImages): Record<string, unknown> | null => {
  const record = toRecord(product);
  if (!record) return null;
  return toRecord(record['category']);
};

const resolveCategoryLabelFromRecord = (
  categoryRecord: Record<string, unknown> | null,
  preferredLocale: ProductNameKey
): string => {
  if (!categoryRecord) return '';
  const keys = CATEGORY_NAME_KEYS_BY_LOCALE[preferredLocale] ?? CATEGORY_NAME_KEYS_BY_LOCALE.name_en;
  for (const key of keys) {
    const value = toTrimmedString(categoryRecord[key]);
    if (value) return value;
  }
  return '';
};

export const resolveProductCategoryId = (product: ProductWithImages): string => {
  const direct = toTrimmedString(product.categoryId);
  if (direct) return direct;

  const categoryRecord = resolveProductCategoryRecord(product);
  if (!categoryRecord) return '';

  return (
    toTrimmedString(categoryRecord['id']) ||
    toTrimmedString(categoryRecord['_id']) ||
    toTrimmedString(categoryRecord['categoryId'])
  );
};

export const resolveProductCategoryLabel = (
  product: ProductWithImages,
  categoryNameById: ReadonlyMap<string, string>,
  preferredLocale: ProductNameKey = 'name_en'
): string => {
  const normalizedCategoryId = resolveProductCategoryId(product);
  const categoryRecord = resolveProductCategoryRecord(product);
  const directLabel = resolveCategoryLabelFromRecord(categoryRecord, preferredLocale);
  const resolvedLookupLabel = normalizedCategoryId
    ? toTrimmedString(categoryNameById.get(normalizedCategoryId))
    : '';

  if (directLabel) return directLabel;
  if (resolvedLookupLabel) return resolvedLookupLabel;
  if (!normalizedCategoryId) return 'Unassigned';
  return OPAQUE_CATEGORY_ID_PATTERN.test(normalizedCategoryId) ? '—' : normalizedCategoryId;
};

export const resolveEffectiveDefaultPriceGroupId = (
  product: ProductWithImages,
  catalogDefaultPriceGroupIdByCatalogId: ReadonlyMap<string, string>
): string | null => {
  const directDefaultPriceGroupId = toTrimmedString(product.defaultPriceGroupId);
  if (directDefaultPriceGroupId) {
    return directDefaultPriceGroupId;
  }

  const productCatalogId =
    toTrimmedString(product.catalogId) ||
    toTrimmedString(product.catalogs?.[0]?.catalogId);
  if (!productCatalogId) {
    return null;
  }

  const catalogDefaultPriceGroupId = toTrimmedString(
    catalogDefaultPriceGroupIdByCatalogId.get(productCatalogId)
  );
  return catalogDefaultPriceGroupId || null;
};

export const hasImportedProductOrigin = (product: ProductWithImages): boolean =>
  typeof product.importSource === 'string' && product.importSource.trim().length > 0;
import {
  SUCCESS_STATUSES,
  PENDING_STATUSES,
  PROCESSING_STATUSES,
  FAILURE_STATUSES,
  normalizeMarketplaceStatus,
} from '@/features/integrations/utils/marketplace-status';

export {
  SUCCESS_STATUSES,
  PENDING_STATUSES,
  PROCESSING_STATUSES,
  FAILURE_STATUSES,
  normalizeMarketplaceStatus,
};

export const resolveMarketplaceStatusWithLocalFeedback = ({
  serverStatus,
  localFeedbackStatus,
  submitting = false,
}: {
  serverStatus: string;
  localFeedbackStatus: string | null;
  submitting?: boolean;
}): string => {
  const normalizedServerStatus = normalizeMarketplaceStatus(serverStatus);
  const normalizedLocalFeedbackStatus = normalizeMarketplaceStatus(localFeedbackStatus ?? '');
  const hasServerStatus =
    normalizedServerStatus.length > 0 && normalizedServerStatus !== 'not_started';

  if (submitting) {
    return 'processing';
  }

  if (
    normalizedLocalFeedbackStatus === 'completed' &&
    !SUCCESS_STATUSES.has(normalizedServerStatus)
  ) {
    return 'active';
  }

  if (
    (normalizedLocalFeedbackStatus === 'processing' ||
      normalizedLocalFeedbackStatus === 'queued') &&
    FAILURE_STATUSES.has(normalizedServerStatus)
  ) {
    return normalizedLocalFeedbackStatus;
  }

  if (
    FAILURE_STATUSES.has(normalizedLocalFeedbackStatus) &&
    (PENDING_STATUSES.has(normalizedServerStatus) ||
      PROCESSING_STATUSES.has(normalizedServerStatus))
  ) {
    return normalizedLocalFeedbackStatus;
  }

  if (hasServerStatus) {
    return normalizedServerStatus;
  }

  return normalizedLocalFeedbackStatus || 'not_started';
};

export const getStatusToneClass = (value: string): string => {
  const normalized = normalizeMarketplaceStatus(value);
  if (SUCCESS_STATUSES.has(normalized)) {
    return 'border-emerald-400/60 text-emerald-200 hover:border-emerald-300/70 hover:text-emerald-100';
  }
  if (PENDING_STATUSES.has(normalized)) {
    return 'border-amber-400/60 text-amber-200 hover:border-amber-300/70 hover:text-amber-100';
  }
  if (PROCESSING_STATUSES.has(normalized)) {
    return 'border-cyan-400/60 text-cyan-200 hover:border-cyan-300/70 hover:text-cyan-100';
  }
  if (FAILURE_STATUSES.has(normalized)) {
    return 'border-rose-400/60 text-rose-200 hover:border-rose-300/70 hover:text-rose-100';
  }
  return 'border-gray-500/50 text-gray-300 hover:border-gray-400/60 hover:text-gray-200';
};

export const getMarketplaceButtonClass = (
  value: string,
  manageMode: boolean,
  marketplace: 'base' | 'tradera' | 'playwright' | 'vinted'
): string => {
  if (!manageMode) {
    return getStatusToneClass(value);
  }
  const normalized = normalizeMarketplaceStatus(value);
  if (SUCCESS_STATUSES.has(normalized)) {
    return 'border-emerald-400/70 bg-emerald-500/15 text-emerald-100 hover:border-emerald-300/80 hover:bg-emerald-500/25';
  }
  if (PENDING_STATUSES.has(normalized)) {
    return 'border-amber-400/70 bg-amber-500/15 text-amber-100 hover:border-amber-300/80 hover:bg-amber-500/25';
  }
  if (PROCESSING_STATUSES.has(normalized)) {
    return 'border-cyan-400/70 bg-cyan-500/15 text-cyan-100 hover:border-cyan-300/80 hover:bg-cyan-500/25';
  }
  if (FAILURE_STATUSES.has(normalized)) {
    return 'border-rose-400/70 bg-rose-500/15 text-rose-100 hover:border-rose-300/80 hover:bg-rose-500/25';
  }
  if (marketplace === 'playwright') {
    return 'border-fuchsia-400/70 bg-fuchsia-500/15 text-fuchsia-100 hover:border-fuchsia-300/80 hover:bg-fuchsia-500/25';
  }
  if (marketplace === 'vinted') {
    return 'border-teal-400/70 bg-teal-500/15 text-teal-100 hover:border-teal-300/80 hover:bg-teal-500/25';
  }
  return 'border-sky-400/70 bg-sky-500/15 text-sky-100 hover:border-sky-300/80 hover:bg-sky-500/25';
};
