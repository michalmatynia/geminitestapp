import type {
  ProductImportSource,
  ProductWithImages,
} from '@/shared/contracts/products/product';

export type ProductNameKey = 'name_en' | 'name_pl' | 'name_de';
export type ProductImageStorageStatus = {
  hasFastCometImage: boolean;
  hasLocalImage: boolean;
  hasExternalLinkImage: boolean;
  hasBase64Image: boolean;
};

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
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
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
    const parts = value
      .map((entry: unknown) => toDisplayListString(entry))
      .filter((entry) => entry.length > 0);
    return parts.join(', ');
  }
  return toDisplayString(value);
};

const splitDisplaySegments = (value: string): string[] =>
  value
    .split('|')
    .map((segment: string) => segment.trim())
    .filter((segment) => segment.length > 0);

export const getProductNameValue = (
  product: ProductWithImages,
  key: ProductNameKey
): string | undefined => {
  const value = product[key];
  if (typeof value === 'string' && value.trim().length > 0) return value;

  const localizedName = toTrimmedString(toRecord(product.name)?.[NAME_KEY_TO_LANGUAGE_CODE[key]]);
  return localizedName.length > 0 ? localizedName : undefined;
};

export const getProductDisplayName = (product: ProductWithImages): string =>
  getProductNameValue(product, 'name_en') ??
  getProductNameValue(product, 'name_pl') ??
  getProductNameValue(product, 'name_de') ??
  'Product';

export const getImageFilepath = (imageFile: unknown): string | undefined => {
  if (imageFile === null || imageFile === undefined || typeof imageFile !== 'object') {
    return undefined;
  }
  const record = imageFile as Record<string, unknown>;
  for (const key of ['filepath', 'publicUrl', 'url', 'thumbnailUrl']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return undefined;
};

const getProductImageFileRecords = (product: ProductWithImages): Record<string, unknown>[] =>
  (Array.isArray(product.images) ? product.images : [])
    .map((image) => toRecord(image)?.['imageFile'])
    .map(toRecord)
    .filter((record): record is Record<string, unknown> => record !== null);

const isFastCometImageFileRecord = (imageFile: Record<string, unknown>): boolean => {
  const metadata = toRecord(imageFile['metadata']);
  const fastCometUploadStatus = toTrimmedString(metadata?.['fastCometUploadStatus']).toLowerCase();
  return (
    toTrimmedString(imageFile['storageProvider']).toLowerCase() === 'fastcomet' ||
    toTrimmedString(metadata?.['storageSource']).toLowerCase() === 'fastcomet' ||
    ['completed', 'complete', 'success', 'uploaded'].includes(fastCometUploadStatus) ||
    toTrimmedString(metadata?.['uploadedToFastCometAt']).length > 0
  );
};

export const hasAnyProductImageStorageStatus = (status: ProductImageStorageStatus): boolean =>
  status.hasFastCometImage ||
  status.hasLocalImage ||
  status.hasExternalLinkImage ||
  status.hasBase64Image;

export const resolveProductImageStorageStatus = (
  product: ProductWithImages
): ProductImageStorageStatus => {
  const imageFiles = getProductImageFileRecords(product);

  return {
    hasFastCometImage: imageFiles.some(isFastCometImageFileRecord),
    hasLocalImage: imageFiles.length > 0,
    hasExternalLinkImage: Array.isArray(product.imageLinks)
      ? product.imageLinks.some((link: string) => link.trim() !== '')
      : false,
    hasBase64Image: Array.isArray(product.imageBase64s)
      ? product.imageBase64s.some((imageBase64: string) => imageBase64.trim() !== '')
      : false,
  };
};

const findFirstDisplayValue = (
  record: Record<string, unknown>,
  keys: string[]
): string | null => {
  for (const key of keys) {
    const value = toDisplayListString(record[key]);
    if (value.length > 0) return value;
  }
  return null;
};

const findFirstDisplayValueFromValues = (values: unknown[]): string | null => {
  for (const localizedValue of values) {
    const normalizedValue = toDisplayListString(localizedValue);
    if (normalizedValue.length > 0) return normalizedValue;
  }
  return null;
};

const getProductParameterDisplayValue = (parameter: unknown, key: ProductNameKey): string => {
  const record = toRecord(parameter);
  if (record === null) return '';

  const directValue = toDisplayListString(record['value']);
  const valuesByLanguageRecord = toRecord(record['valuesByLanguage']) ?? {};
  const preferredLanguageCode = NAME_KEY_TO_LANGUAGE_CODE[key];
  const localizedValue = findFirstDisplayValue(valuesByLanguageRecord, [
    preferredLanguageCode,
    'en',
    'pl',
    'de',
    'default',
  ]);
  const legacyValue = findFirstDisplayValue(record, [
    `value_${preferredLanguageCode}`,
    'value_en',
    'value_pl',
    'value_de',
  ]);
  return (
    localizedValue ??
    legacyValue ??
    findFirstDisplayValueFromValues(Object.values(valuesByLanguageRecord)) ??
    directValue
  );
};

export const getProductListDisplayName = (
  product: ProductWithImages,
  key: ProductNameKey,
): string => {
  const rawBaseName = getProductNameValue(product, key) ?? '';
  if (rawBaseName.length === 0) return '';

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

  const baseName = parsedNameParts[0] ?? rawBaseName;

  const seenValues = new Set<string>([baseName.trim().toLowerCase()]);
  const parameterValues = Array.isArray(product.parameters)
    ? product.parameters.reduce((acc: string[], parameter: unknown) => {
        const resolvedValue = getProductParameterDisplayValue(parameter, key).trim();
        if (resolvedValue.length === 0) return acc;

        for (const segment of splitDisplaySegments(resolvedValue)) {
          const signature = segment.toLowerCase();
          if (segment.length === 0 || seenValues.has(signature)) continue;
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
export const UNASSIGNED_PRODUCT_CATEGORY_LABEL = 'Unassigned';

const CATEGORY_NAME_KEYS_BY_LOCALE: Record<ProductNameKey, string[]> = {
  name_en: ['name_en', 'name', 'name_pl', 'name_de'],
  name_pl: ['name_pl', 'name', 'name_en', 'name_de'],
  name_de: ['name_de', 'name', 'name_en', 'name_pl'],
};

const resolveProductCategoryRecord = (product: ProductWithImages): Record<string, unknown> | null => {
  const record = toRecord(product);
  if (record === null) return null;
  return toRecord(record['category']);
};

const resolveCategoryLabelFromRecord = (
  categoryRecord: Record<string, unknown> | null,
  preferredLocale: ProductNameKey
): string => {
  if (categoryRecord === null) return '';
  const keys = CATEGORY_NAME_KEYS_BY_LOCALE[preferredLocale];
  for (const key of keys) {
    const value = toTrimmedString(categoryRecord[key]);
    if (value.length > 0) return value;
  }
  return '';
};

const firstNonEmpty = (values: string[]): string => {
  for (const value of values) {
    if (value.length > 0) return value;
  }
  return '';
};

export const resolveProductCategoryId = (product: ProductWithImages): string => {
  const direct = toTrimmedString(product.categoryId);
  if (direct.length > 0) return direct;

  const categoryRecord = resolveProductCategoryRecord(product);
  if (categoryRecord === null) return '';

  return firstNonEmpty([
    toTrimmedString(categoryRecord['id']),
    toTrimmedString(categoryRecord['_id']),
    toTrimmedString(categoryRecord['categoryId']),
  ]);
};

export const resolveProductCategoryLabel = (
  product: ProductWithImages,
  categoryNameById: ReadonlyMap<string, string>,
  preferredLocale: ProductNameKey = 'name_en'
): string => {
  const normalizedCategoryId = resolveProductCategoryId(product);
  const categoryRecord = resolveProductCategoryRecord(product);
  const directLabel = resolveCategoryLabelFromRecord(categoryRecord, preferredLocale);
  const resolvedLookupLabel = normalizedCategoryId.length > 0
    ? toTrimmedString(categoryNameById.get(normalizedCategoryId))
    : '';

  if (directLabel.length > 0) return directLabel;
  if (resolvedLookupLabel.length > 0) return resolvedLookupLabel;
  if (normalizedCategoryId.length === 0) return UNASSIGNED_PRODUCT_CATEGORY_LABEL;
  return OPAQUE_CATEGORY_ID_PATTERN.test(normalizedCategoryId) ? '—' : normalizedCategoryId;
};

export const isUnassignedProductCategoryLabel = (label: string): boolean =>
  label.trim() === UNASSIGNED_PRODUCT_CATEGORY_LABEL;

export const resolveEffectiveDefaultPriceGroupId = (
  product: ProductWithImages,
  catalogDefaultPriceGroupIdByCatalogId: ReadonlyMap<string, string>
): string | null => {
  const directDefaultPriceGroupId = toTrimmedString(product.defaultPriceGroupId);
  if (directDefaultPriceGroupId.length > 0) {
    return directDefaultPriceGroupId;
  }

  const productCatalogId = firstNonEmpty([
    toTrimmedString(product.catalogId),
    toTrimmedString(product.catalogs[0]?.catalogId),
  ]);
  if (productCatalogId.length === 0) {
    return null;
  }

  const catalogDefaultPriceGroupId = toTrimmedString(
    catalogDefaultPriceGroupIdByCatalogId.get(productCatalogId)
  );
  return catalogDefaultPriceGroupId.length > 0 ? catalogDefaultPriceGroupId : null;
};

export const resolveProductImportSource = (
  product: ProductWithImages
): ProductImportSource | null => {
  const source = product.importSource;
  return source === 'base' || source === 'scrape' || source === 'ecommerce' ? source : null;
};

export const hasImportedProductOrigin = (product: ProductWithImages): boolean =>
  resolveProductImportSource(product) !== null;

export const hasFilledMarketplaceCopy = (product: ProductWithImages): boolean => {
  const overrides = Array.isArray(product.marketplaceContentOverrides)
    ? product.marketplaceContentOverrides
    : [];

  return overrides.some((entry) => {
    const hasIntegration = Array.isArray(entry.integrationIds)
      ? entry.integrationIds.some((integrationId: string) => toTrimmedString(integrationId) !== '')
      : false;
    const hasCopy = toTrimmedString(entry.title) !== '' || toTrimmedString(entry.description) !== '';

    return hasIntegration && hasCopy;
  });
};

export const hasEnglishProductTitle = (product: ProductWithImages): boolean =>
  Boolean(getProductNameValue(product, 'name_en'));

export const hasEnglishProductDescription = (product: ProductWithImages): boolean =>
  toTrimmedString(product.description_en) !== '' ||
  toTrimmedString(toRecord(product.description)?.['en']) !== '';

export const hasPolishProductTitle = (product: ProductWithImages): boolean =>
  Boolean(getProductNameValue(product, 'name_pl'));

export const hasPolishProductDescription = (product: ProductWithImages): boolean =>
  toTrimmedString(product.description_pl) !== '' ||
  toTrimmedString(toRecord(product.description)?.['pl']) !== '';

export {
  CLOSED_STATUSES,
  FAILURE_STATUSES,
  PENDING_STATUSES,
  PROCESSING_STATUSES,
  SUCCESS_STATUSES,
  getMarketplaceButtonClass,
  getStatusToneClass,
  normalizeMarketplaceStatus,
  resolveMarketplaceStatusWithLocalFeedback,
} from './product-column-status-utils';
