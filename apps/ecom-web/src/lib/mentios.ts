/* eslint-disable @typescript-eslint/consistent-type-assertions, no-nested-ternary, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions, complexity, max-lines, max-lines-per-function, no-console */
/**
 * Mentios catalog product layer.
 *
 * Fetches products and categories from MongoDB, maps them to the
 * ecom-web Product shape, and assigns CSS gradients from a curated pool
 * (the app's intentional editorial aesthetic — used even when real images exist).
 *
 * Document schema note: the local DB stores localized text as flat fields
 * (name_en, name_pl, description_en …) rather than nested objects.
 * Both formats are handled so the code works against any environment.
 */

import { cache } from 'react';
import { ObjectId, type Db } from 'mongodb';
import type { Product } from '../data/products';
import { ensureProductIndexes } from './db-indexes';
import {
  defaultCurrencyForLocale,
  formatPrice as formatLocalizedPrice,
  normalizeLocale,
  normalizeLocaleList,
  type EcomLocale,
} from './locales';
import { getEcommerceProductsDb, hasEcommerceProductsMongoConfig } from './mongodb';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATALOG_ID = process.env['MENTIOS_CATALOG_ID']?.trim() ?? '';
const PRODUCTS_COLLECTION = 'products';
const CATEGORIES_COLLECTION = 'product_categories';
const PRICE_GROUPS_COLLECTION = 'price_groups';
const CURRENCIES_COLLECTION = 'currencies';
const CATALOGS_COLLECTION = 'catalogs';
const LANGUAGES_COLLECTION = 'languages';
const PRICE_GROUP_SOURCE_PRICE_FIELD = 'sourcePrice';

/** Products created within this window are treated as "new arrivals". */
const NEW_ARRIVALS_DAYS = 60;

/** Curated gradient pool — dark sci-fi palette, assigned deterministically by product position. */
const GRADIENT_POOL = [
  'linear-gradient(155deg, #0B0D21 0%, #1a1040 50%, #21141D 100%)',
  'linear-gradient(155deg, #01000D 0%, #0a1a22 50%, #103530 100%)',
  'linear-gradient(155deg, #1a0d21 0%, #2a1040 100%)',
  'linear-gradient(155deg, #100800 0%, #2e1800 100%)',
  'linear-gradient(155deg, #01000D 0%, #0d1525 50%, #1a2040 100%)',
  'linear-gradient(155deg, #21141D 0%, #3a1028 100%)',
  'linear-gradient(155deg, #0B0D21 0%, #0a2038 100%)',
  'linear-gradient(155deg, #050030 0%, #0f0080 50%, #050030 100%)',
  'linear-gradient(155deg, #060e00 0%, #0f2500 100%)',
  'linear-gradient(155deg, #150500 0%, #3a1200 100%)',
  'linear-gradient(155deg, #01000D 0%, #0a001a 50%, #180040 100%)',
  'linear-gradient(155deg, #001212 0%, #002828 100%)',
];

const GRADIENT_POOL_ALT = [
  'linear-gradient(135deg, #0B0D21 0%, #172040 100%)',
  'linear-gradient(135deg, #01000D 0%, #082020 100%)',
  'linear-gradient(135deg, #21141D 0%, #2a0a20 100%)',
  'linear-gradient(135deg, #0a0500 0%, #201000 100%)',
  'linear-gradient(135deg, #0a1530 0%, #152040 100%)',
  'linear-gradient(135deg, #200a18 0%, #350a25 100%)',
  'linear-gradient(135deg, #000520 0%, #000f3d 100%)',
  'linear-gradient(135deg, #020030 0%, #05005a 100%)',
  'linear-gradient(135deg, #050f00 0%, #0d2800 100%)',
  'linear-gradient(135deg, #100300 0%, #2d0800 100%)',
  'linear-gradient(135deg, #05001a 0%, #150040 100%)',
  'linear-gradient(135deg, #000f0f 0%, #001e1e 100%)',
];

// ---------------------------------------------------------------------------
// Raw MongoDB document shapes (minimal — only fields we consume)
// ---------------------------------------------------------------------------

interface LocalizedField {
  en?: string | null;
  pl?: string | null;
  de?: string | null;
}

interface ProductDoc {
  _id: unknown;
  sourceProductId?: string | null;
  slug?: string | null;
  // Flat localized fields (actual local DB format)
  name_en?: string | null;
  name_pl?: string | null;
  name_de?: string | null;
  description_en?: string | null;
  description_pl?: string | null;
  description_de?: string | null;
  // Nested localized fields from alternate catalog documents.
  name?: string | LocalizedField | null;
  description?: string | LocalizedField | null;
  defaultPriceGroupId?: string | null;
  price?: number | null;
  priceCurrencyCode?: string | null;
  currencyCode?: string | null;
  sourcePrice?: number | null;
  sourcePriceCurrencyCode?: string | null;
  sku?: string | null;
  stock?: number | null;
  published?: boolean;
  archived?: boolean;
  catalogId?: string;
  categoryId?: unknown;
  categoryName?: string | null;
  categoryName_en?: string | null;
  categoryName_pl?: string | null;
  categoryName_de?: string | null;
  collectionSlug?: string | null;
  isNew?: boolean;
  createdAt?: string | Date;
  exportedAt?: string | Date;
  updatedAt?: string | Date;
  imageUrl?: string | null;
  imageUrls?: Array<string | null>;
  images?: Array<{
    imageFileId?: string;
    productId?: string;
    imageFile?: {
      filepath?: string | null;
      id?: string;
      publicUrl?: string | null;
      thumbnailUrl?: string | null;
      url?: string | null;
    };
  }>;
  imageLinks?: Array<string | null>;
  catalogs?: Array<{ catalogId?: string }>;
}

interface ProductPriceDoc {
  _id: unknown;
  sourceProductId?: string | null;
  defaultPriceGroupId?: string | null;
  price?: number | null;
  priceCurrencyCode?: string | null;
  currencyCode?: string | null;
  sourcePrice?: number | null;
  sourcePriceCurrencyCode?: string | null;
}

type PriceGroupDoc = {
  _id?: unknown;
  addToPrice?: number | null;
  basePriceField?: string | null;
  currency?: { code?: string | null } | null;
  currencyId?: string | null;
  currencyCode?: string | null;
  groupId?: string | null;
  id?: string | null;
  isDefault?: boolean | null;
  priceMultiplier?: number | null;
  sourceGroupId?: string | null;
  type?: string | null;
};

type PriceGroup = {
  addToPrice: number;
  basePriceField: string;
  currencyId: string;
  currencyCode: string;
  groupId: string;
  id: string;
  isDefault: boolean;
  priceMultiplier: number;
  sourceGroupId: string | null;
  type: string;
};

type CurrencyDoc = {
  _id?: unknown;
  code?: string | null;
  id?: string | null;
};

type PricingContext = {
  defaultCurrencyCode: string | null;
  groups: PriceGroup[];
};

type ProductMapContext = {
  categoryMap: Map<string, CategoryMapEntry>;
  locale: EcomLocale;
  pricing: PricingContext;
};

type ProductImageFileDoc = NonNullable<ProductDoc['images']>[number]['imageFile'];

interface CategoryDoc {
  _id: unknown;
  name?: string | LocalizedField | null;
  name_en?: string | null;
  name_pl?: string | null;
  parentId?: unknown;
  catalogId?: string;
}

interface CatalogDoc {
  _id?: string;
  id?: string;
  isDefault?: boolean;
  languageIds?: string[];
  defaultLanguageId?: string | null;
}

interface LanguageDoc {
  id?: string | null;
  code?: string | null;
}

type CategoryMapEntry = { name: string; collection: string; aliases: string[] };

export type MentiosCategory = {
  id: string;
  name: string;
  count: number;
  parentName?: string;
  parentNameEn?: string;
};

const HAS_DISPLAY_NAME_CLAUSE = {
  $or: [
    { name_en: { $regex: '\\S' } },
    { name_pl: { $regex: '\\S' } },
    { name_de: { $regex: '\\S' } },
    { name: { $regex: '\\S' } },
    { 'name.en': { $regex: '\\S' } },
    { 'name.pl': { $regex: '\\S' } },
    { 'name.de': { $regex: '\\S' } },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errorName(err: unknown): string {
  return err instanceof Error ? err.name : '';
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return typeof err === 'string' ? err : '';
}

function isMongoConnectivityError(err: unknown): boolean {
  const signature = `${errorName(err)} ${errorMessage(err)}`.toLowerCase();
  return [
    'mongoserverselectionerror',
    'mongonetworkerror',
    'ssl routines',
    'tlsv1 alert',
    'server selection timed out',
    'econnrefused',
    'enotfound',
    'etimedout',
  ].some((token) => signature.includes(token));
}

function logMentiosFallback(operation: string, err: unknown): void {
  if (process.env.NODE_ENV === 'production' || isMongoConnectivityError(err)) return;
  const message = errorMessage(err);
  console.warn(`[mentios] ${operation} unavailable; using fallback${message ? `: ${message}` : '.'}`);
}

function chooseLocalized(
  locale: EcomLocale,
  values: Partial<Record<EcomLocale | 'de', string | null | undefined>>,
): string {
  if (locale === 'pl') return values['pl'] ?? values['en'] ?? values['de'] ?? '';
  return values['en'] ?? values['pl'] ?? values['de'] ?? '';
}

function pickLocalized(field: string | LocalizedField | null | undefined, locale: EcomLocale): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return chooseLocalized(locale, { en: field.en, pl: field.pl, de: field.de });
}

function stringifyDocumentId(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object') {
    const maybeHex = value as { toHexString?: () => string; toString?: () => string };
    if (typeof maybeHex.toHexString === 'function') return maybeHex.toHexString();
    if (
      typeof maybeHex.toString === 'function' &&
      maybeHex.toString !== Object.prototype.toString
    ) {
      return maybeHex.toString();
    }
  }
  return '';
}

/** Picks the best available name from a ProductDoc, supporting both schemas. */
function pickProductName(doc: ProductDoc, locale: EcomLocale): string {
  return (
    chooseLocalized(locale, { en: doc.name_en, pl: doc.name_pl, de: doc.name_de }) ||
    pickLocalized(doc.name, locale) ||
    'Untitled'
  );
}

/** Picks the best available description from a ProductDoc. */
function pickProductDescription(doc: ProductDoc, locale: EcomLocale): string {
  return (
    chooseLocalized(locale, { en: doc.description_en, pl: doc.description_pl, de: doc.description_de }) ||
    pickLocalized(doc.description, locale) ||
    ''
  );
}

/** Picks the best available name from a CategoryDoc. */
function pickCategoryName(doc: CategoryDoc, locale: EcomLocale): string {
  return chooseLocalized(locale, { en: doc.name_en, pl: doc.name_pl }) || pickLocalized(doc.name, locale) || stringifyDocumentId(doc._id);
}

function pickProductCategoryName(doc: ProductDoc, locale: EcomLocale): string {
  return (
    chooseLocalized(locale, {
      en: doc.categoryName_en,
      pl: doc.categoryName_pl,
      de: doc.categoryName_de,
    }) ||
    doc.categoryName ||
    ''
  );
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function productSlug(doc: ProductDoc): string {
  const explicitSlug = slugify(doc.slug ?? '');
  if (explicitSlug.length > 2) return explicitSlug;
  if (doc.sku) {
    const s = slugify(doc.sku);
    if (s.length > 2) return s;
  }
  const id = stringifyDocumentId(doc._id);
  return id.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 24) || id;
}

function gradient(index: number): string {
  return GRADIENT_POOL[index % GRADIENT_POOL.length] ?? GRADIENT_POOL[0] ?? '';
}

function gradientAlt(index: number): string {
  return GRADIENT_POOL_ALT[index % GRADIENT_POOL_ALT.length] ?? GRADIENT_POOL_ALT[0] ?? '';
}

/**
 * Splits names stored as "Name | Size | Material | Category | Lore" into parts.
 * Segments beyond the expected count, or segments that are empty, are returned as undefined.
 */
function parsePipedName(raw: string): {
  shortName: string;
  sizeInfo?: string;
  material?: string;
  categoryName?: string;
  lore?: string;
} {
  const parts = raw.split('|').map((s) => s.trim());
  const seg = (i: number): string | undefined => {
    const v = parts[i];
    return v && v.length > 0 ? v : undefined;
  };
  return {
    shortName: seg(0) ?? raw,
    sizeInfo:  seg(1),
    material:  seg(2),
    categoryName: seg(3),
    lore:      seg(4),
  };
}

function formatProductPrice(
  price: number | null | undefined,
  locale: EcomLocale,
  currencyCode: string,
): string {
  if (price === null || price === undefined) return '—';
  return formatLocalizedPrice(price, locale, currencyCode);
}

function normalizeProductCurrencyCode(doc: ProductDoc): string {
  const code = (doc.priceCurrencyCode ?? doc.currencyCode ?? doc.sourcePriceCurrencyCode ?? '').trim().toUpperCase();
  return code.length > 0 ? code : 'PLN';
}

function resolveFallbackProductPricing(doc: ProductDoc): { currencyCode: string; price: number } {
  const price = toFinitePrice(doc.price);
  if (price !== null) {
    const currencyCode = firstNonEmptyString(
      normalizeCurrencyCode(doc.priceCurrencyCode),
      normalizeCurrencyCode(doc.currencyCode),
      normalizeCurrencyCode(doc.sourcePriceCurrencyCode),
      'PLN',
    );
    return { currencyCode, price };
  }
  return {
    currencyCode: normalizeProductCurrencyCode(doc),
    price: toFinitePrice(doc.sourcePrice) ?? 0,
  };
}

function normalizeCurrencyCode(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase();
}

function toFinitePrice(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function roundCurrencyAmount(value: number): number {
  return Math.round(value * 100) / 100;
}

function toPriceGroup(doc: PriceGroupDoc, currencyCodeById: Map<string, string>): PriceGroup | null {
  const id = firstNonEmptyString(typeof doc.id === 'string' ? doc.id : '');
  const groupId = firstNonEmptyString(doc.groupId ?? '');
  const currencyId = firstNonEmptyString(doc.currencyId ?? '');
  const currencyCode = normalizeCurrencyCode(firstNonEmptyString(
    doc.currency?.code ?? '',
    doc.currencyCode ?? '',
    currencyCodeById.get(currencyId) ?? '',
    currencyId,
  ));
  if (id.length === 0 || currencyCode.length === 0) return null;
  return {
    addToPrice: toFinitePrice(doc.addToPrice) ?? 0,
    basePriceField: firstNonEmptyString(doc.basePriceField ?? '', 'price'),
    currencyId,
    currencyCode,
    groupId,
    id,
    isDefault: doc.isDefault === true,
    priceMultiplier: toFinitePrice(doc.priceMultiplier) ?? 1,
    sourceGroupId: doc.sourceGroupId?.trim() || null,
    type: firstNonEmptyString(doc.type ?? '', 'standard'),
  };
}

function groupKeyMatches(group: PriceGroup, id: string | null | undefined): boolean {
  const normalized = (id ?? '').trim();
  return normalized.length > 0 && (group.id === normalized || group.groupId === normalized);
}

function findPriceGroup(groups: PriceGroup[], id: string | null | undefined): PriceGroup | undefined {
  return groups.find((group) => groupKeyMatches(group, id));
}

function groupCurrencyMatches(group: PriceGroup, currencyCode: string): boolean {
  const normalized = normalizeCurrencyCode(currencyCode);
  if (normalized.length === 0) return false;
  return (
    group.currencyCode === normalized ||
    normalizeCurrencyCode(group.currencyId) === normalized ||
    normalizeCurrencyCode(group.groupId) === normalized
  );
}

function uniqueCurrencyCodes(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = normalizeCurrencyCode(value);
    if (normalized.length === 0 || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function productFieldPrice(doc: ProductDoc, group: PriceGroup): number | null {
  const sourcePrice = toFinitePrice(doc.sourcePrice);
  const sourceCurrencyCode = normalizeCurrencyCode(doc.sourcePriceCurrencyCode);
  if (group.basePriceField === PRICE_GROUP_SOURCE_PRICE_FIELD) return toFinitePrice(doc.sourcePrice);
  const price = toFinitePrice(doc.price);
  if (price !== null) return price;
  return sourcePrice !== null && sourceCurrencyCode === group.currencyCode ? sourcePrice : null;
}

function resolveGroupPrice(
  doc: ProductDoc,
  group: PriceGroup | undefined,
  groups: PriceGroup[],
  visited = new Set<string>(),
): number | null {
  if (group === undefined || visited.has(group.id)) return null;
  visited.add(group.id);
  const basePrice = group.type === 'dependent'
    ? group.sourceGroupId === null
      ? productFieldPrice(doc, group)
      : resolveGroupPrice(doc, findPriceGroup(groups, group.sourceGroupId), groups, visited)
    : group.type === 'standard'
      ? productFieldPrice(doc, group)
      : null;
  if (basePrice === null) return null;
  return basePrice * group.priceMultiplier + group.addToPrice;
}

function resolveProductDisplayPricing(
  doc: ProductDoc,
  pricing: PricingContext,
  locale: EcomLocale,
  preferredCurrencyCode?: string | null,
): { currencyCode: string; price: number } {
  const fallback = resolveFallbackProductPricing(doc);
  const groups = pricing.groups;
  const explicitRequestedCurrencyCode = normalizeCurrencyCode(preferredCurrencyCode);
  const requestedCurrencyCode = explicitRequestedCurrencyCode.length > 0
    ? explicitRequestedCurrencyCode
    : defaultCurrencyForLocale(locale);
  const baseGroup = findPriceGroup(groups, doc.defaultPriceGroupId) ?? groups.find((group) => group.isDefault) ?? groups[0];
  if (baseGroup === undefined) return fallback;

  const targetCurrencyCodes = uniqueCurrencyCodes([
    requestedCurrencyCode,
    pricing.defaultCurrencyCode,
    baseGroup.currencyCode,
  ]);

  for (const targetCurrencyCode of targetCurrencyCodes) {
    if (groupCurrencyMatches(baseGroup, targetCurrencyCode)) {
      const price = resolveGroupPrice(doc, baseGroup, groups);
      if (price !== null) {
        return {
          currencyCode: targetCurrencyCode,
          price,
        };
      }
    }

    const targetGroups = groups.filter((group) => groupCurrencyMatches(group, targetCurrencyCode));
    for (const targetGroup of targetGroups) {
      const price = resolveGroupPrice(doc, targetGroup, groups);
      if (price !== null) {
        return {
          currencyCode: targetCurrencyCode,
          price,
        };
      }
    }
  }
  return fallback;
}

function categoryToCollection(name: string): string {
  const l = name.toLowerCase();
  if (/women|dam[eę]|femm|ladies|girl|female/i.test(l)) return 'womenswear';
  if (/\bmen\b|heren|herr|homme|uomini|male/i.test(l)) return 'menswear';
  if (
    /bag|accessor|jewel|key\s*chain|keychain|charm|pin|ring|necklace|pendant|belt|scarf|wallet|purse|hat|cap|shoes?|boots?/i.test(
      l,
    )
  ) return 'accessories';
  return 'objects';
}

function buildCategoryMap(docs: CategoryDoc[], locale: EcomLocale): Map<string, CategoryMapEntry> {
  const map = new Map<string, CategoryMapEntry>();
  for (const doc of docs) {
    const id = stringifyDocumentId(doc._id);
    if (!id) continue;
    const name = pickCategoryName(doc, locale);
    const aliases = uniqueStrings([
      name,
      doc.name_en,
      doc.name_pl,
      typeof doc.name === 'string' ? doc.name : doc.name?.en,
      typeof doc.name === 'string' ? undefined : doc.name?.pl,
    ]);
    map.set(id, { name, collection: categoryToCollection(name), aliases });
  }
  return map;
}

function buildCategoryParentNameMap(docs: CategoryDoc[], locale: EcomLocale): Map<string, string> {
  const namesById = new Map<string, string>();
  const parentNamesById = new Map<string, string>();

  for (const doc of docs) {
    const id = stringifyDocumentId(doc._id);
    if (!id) continue;
    namesById.set(id, pickCategoryName(doc, locale));
  }

  for (const doc of docs) {
    const id = stringifyDocumentId(doc._id);
    const parentId = stringifyDocumentId(doc.parentId);
    const parentName = parentId ? namesById.get(parentId)?.trim() : '';
    if (id && parentName) parentNamesById.set(id, parentName);
  }

  return parentNamesById;
}

function productTag(doc: ProductDoc, locale: EcomLocale): string | undefined {
  if (doc.isNew) return locale === 'pl' ? 'Nowość' : 'New';
  const stock = doc.stock;
  if (typeof stock === 'number' && stock > 0 && stock <= 3) return locale === 'pl' ? 'Ostatnie sztuki' : 'Last pieces';
  if (stock === 0) return locale === 'pl' ? 'Wyprzedane' : 'Sold out';
  return undefined;
}

function cleanLanguageId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function buildLanguageCodeLookup(rows: LanguageDoc[]): Map<string, string> {
  const lookup = new Map<string, string>();

  for (const row of rows) {
    const id = cleanLanguageId(row.id);
    const code = cleanLanguageId(row.code)?.toLowerCase();
    if (!code) continue;
    if (id) {
      lookup.set(id, code);
      lookup.set(id.toLowerCase(), code);
    }
    lookup.set(code, code);
  }

  return lookup;
}

function buildCurrencyCodeLookup(rows: CurrencyDoc[]): Map<string, string> {
  const lookup = new Map<string, string>();

  for (const row of rows) {
    const code = normalizeCurrencyCode(row.code);
    if (code.length === 0) continue;
    const id = typeof row.id === 'string' ? row.id.trim() : '';
    const documentId = stringifyDocumentId(row._id);
    if (id.length > 0) lookup.set(id, code);
    if (documentId.length > 0) lookup.set(documentId, code);
    lookup.set(code, code);
  }

  return lookup;
}

function uniqueCurrencyIds(rows: PriceGroupDoc[]): string[] {
  return uniqueStrings(rows.map((row) => row.currencyId));
}

function resolveLanguageCode(id: string, lookup: Map<string, string>): string {
  return lookup.get(id) ?? lookup.get(id.toLowerCase()) ?? id;
}

async function resolveCatalogLocaleCodes(catalog: CatalogDoc): Promise<string[]> {
  const languageIds = Array.isArray(catalog.languageIds)
    ? catalog.languageIds.map(cleanLanguageId).filter((id): id is string => Boolean(id))
    : [];
  const defaultLanguageId = cleanLanguageId(catalog.defaultLanguageId);
  const idsToResolve = Array.from(new Set([...languageIds, defaultLanguageId].filter((id): id is string => Boolean(id))));

  if (idsToResolve.length === 0) return [];

  const db = await getEcommerceProductsDb();
  const languageRows = await db
    .collection<LanguageDoc>(LANGUAGES_COLLECTION)
    .find(
      { $or: [{ id: { $in: idsToResolve } }, { code: { $in: idsToResolve } }] },
      { projection: { id: 1, code: 1 } },
    )
    .toArray();
  const lookup = buildLanguageCodeLookup(languageRows);
  const defaultCode = defaultLanguageId ? resolveLanguageCode(defaultLanguageId, lookup) : null;

  return [
    defaultCode,
    ...languageIds.map((id) => resolveLanguageCode(id, lookup)),
  ].filter((code): code is string => Boolean(code));
}

const normalizeBaseUrl = (value: string | undefined): string => {
  const raw = value?.trim();
  if (!raw) return '';
  try {
    return new URL(raw).toString().replace(/\/$/, '');
  } catch {
    return '';
  }
};

const MAIN_APP_URL = normalizeBaseUrl(process.env['NEXT_PUBLIC_MAIN_APP_URL']);
const DEFAULT_FILE_BASE_URL = 'https://sparksofsindri.com';
const PRODUCT_UPLOAD_PREFIX = '/uploads/products/';
const LEGACY_FILE_HOSTS = new Set(['qubrick.io', 'www.qubrick.io']);

const normalizeFileBaseUrl = (value: string | undefined): string => {
  const normalized = normalizeBaseUrl(value);
  if (!normalized) return '';
  try {
    const url = new URL(normalized);
    if (LEGACY_FILE_HOSTS.has(url.hostname.toLowerCase())) {
      const defaultUrl = new URL(DEFAULT_FILE_BASE_URL);
      url.protocol = defaultUrl.protocol;
      url.hostname = defaultUrl.hostname;
      url.port = defaultUrl.port;
      return url.toString().replace(/\/$/, '');
    }
  } catch {
    return normalized;
  }
  return normalized;
};

const FILE_BASE_URL =
  normalizeFileBaseUrl(process.env['NEXT_PUBLIC_FILE_BASE_URL']) || DEFAULT_FILE_BASE_URL;

function isLocalHostname(hostname: string): boolean {
  return ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(hostname.toLowerCase());
}

function isMainAppOrigin(url: URL): boolean {
  if (!MAIN_APP_URL) return false;
  try {
    return url.origin === new URL(MAIN_APP_URL).origin;
  } catch {
    return false;
  }
}

function isConfiguredFileOrigin(url: URL): boolean {
  if (!FILE_BASE_URL) return false;
  try {
    return url.origin === new URL(FILE_BASE_URL).origin;
  } catch {
    return false;
  }
}

function isLegacyFileOrigin(url: URL): boolean {
  return LEGACY_FILE_HOSTS.has(url.hostname.toLowerCase());
}

function toConfiguredFileUrl(productUploadPath: string): string {
  if (!FILE_BASE_URL) return productUploadPath;
  return `${FILE_BASE_URL}${productUploadPath}`;
}

function normalizeProductUploadPath(value: string): string | undefined {
  const normalized = value
    .replace(/^\/?public\/uploads\//i, '/uploads/')
    .replace(/^\/?uploads\//i, '/uploads/');
  const uploadIndex = normalized.indexOf(PRODUCT_UPLOAD_PREFIX);
  if (uploadIndex < 0) return undefined;
  return normalized.slice(uploadIndex);
}

function normalizeProductImageUrl(value: string | null | undefined): string | undefined {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return undefined;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const productUploadPath = normalizeProductUploadPath(`${url.pathname}${url.search}${url.hash}`);
      if (
        productUploadPath &&
        FILE_BASE_URL &&
        (
          isLocalHostname(url.hostname) ||
          isMainAppOrigin(url) ||
          isConfiguredFileOrigin(url) ||
          isLegacyFileOrigin(url)
        )
      ) {
        return toConfiguredFileUrl(productUploadPath);
      }
      return raw;
    } catch {
      return raw;
    }
  }

  const productUploadPath = normalizeProductUploadPath(raw);
  return productUploadPath ? toConfiguredFileUrl(productUploadPath) : undefined;
}

function buildLocalSkuImageUrl(sku: string | null | undefined): string | undefined {
  const key = typeof sku === 'string' ? sku.trim() : '';
  if (!/^[A-Za-z0-9._-]+$/.test(key)) return undefined;
  return toConfiguredFileUrl(`${PRODUCT_UPLOAD_PREFIX}${encodeURIComponent(key)}/__primary.png`);
}

function uniqueProductImageUrls(urls: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const url of urls) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    unique.push(url);
  }
  return unique;
}

function normalizeImageFileUrls(
  imageFile: ProductImageFileDoc | undefined,
): string[] {
  return [
    imageFile?.filepath,
    imageFile?.publicUrl,
    imageFile?.url,
    imageFile?.thumbnailUrl,
  ]
    .map((value) => normalizeProductImageUrl(value))
    .filter((url): url is string => typeof url === 'string');
}

function buildImageUrls(doc: ProductDoc): string[] {
  const imageUrls = uniqueProductImageUrls([
    ...(doc.imageUrls?.map((link) => normalizeProductImageUrl(link)) ?? []),
    normalizeProductImageUrl(doc.imageUrl),
    ...(doc.images?.flatMap((image) => normalizeImageFileUrls(image.imageFile)) ?? []),
    ...(doc.imageLinks?.map((link) => normalizeProductImageUrl(link)) ?? []),
  ]);

  if (imageUrls.length > 0) return imageUrls;

  const skuImage = buildLocalSkuImageUrl(doc.sku);
  if (skuImage) return [skuImage];

  // Fall back to the file-preview endpoint on the main app using fileId
  const fileId = doc.images?.[0]?.imageFileId ?? doc.images?.[0]?.imageFile?.id;
  if (MAIN_APP_URL && fileId) {
    return [`${MAIN_APP_URL}/api/files/preview?fileId=${fileId}`];
  }
  return [];
}

function mapDoc(
  doc: ProductDoc,
  index: number,
  context: ProductMapContext,
): Product {
  const { categoryMap, locale, pricing } = context;
  const id = stringifyDocumentId(doc._id);
  const categoryId = stringifyDocumentId(doc.categoryId);
  const category = categoryId ? categoryMap.get(categoryId) : undefined;
  const productCategoryName = pickProductCategoryName(doc, locale);
  const name = pickProductName(doc, locale);
  const { shortName, sizeInfo, categoryName: pipedCategoryName, lore } = parsePipedName(name);
  // Material is always extracted from the English name so filter labels stay language-neutral.
  const { material } = parsePipedName(pickProductName(doc, 'en'));
  const description = pickProductDescription(doc, locale);
  const displayPricing = resolveProductDisplayPricing(doc, pricing, locale);
  const price = roundCurrencyAmount(displayPricing.price);
  const currencyCode = displayPricing.currencyCode;
  const imageUrls = buildImageUrls(doc);
  const exportedCollectionSlug = doc.collectionSlug?.trim() ?? '';
  const fallbackCategoryName = productCategoryName || pipedCategoryName || '';

  return {
    id,
    slug: productSlug(doc),
    name,
    shortName,
    sizeInfo,
    material,
    lore,
    category: category?.name ?? (fallbackCategoryName || (locale === 'pl' ? 'Wszystkie produkty' : 'Objects')),
    collectionSlug:
      exportedCollectionSlug || (category?.collection ?? categoryToCollection(fallbackCategoryName)),
    price,
    priceDisplay: formatProductPrice(price, locale, currencyCode),
    currencyCode,
    description,
    gradient: gradient(index),
    gradientAlt: gradientAlt(index),
    imageUrl: imageUrls[0],
    imageUrls,
    tag: productTag(doc, locale),
    details: [],
    care: [],
    sizes: [],
    isNew: doc.isNew ?? false,
    isSoldOut: doc.stock === 0,
  };
}

// ---------------------------------------------------------------------------
// Catalog membership query
// The product is in the Mentios catalog if:
//   - catalogId === CATALOG_ID  (primary catalog field)
//   - OR catalogs[].catalogId === CATALOG_ID  (multi-catalog assignment)
// ---------------------------------------------------------------------------

function mentiosFilter(extra: Record<string, unknown> = {}): Record<string, unknown> {
  const clauses: Record<string, unknown>[] = [];
  if (CATALOG_ID) {
    clauses.push({
      $or: [
        { catalogId: CATALOG_ID },
        { 'catalogs.catalogId': CATALOG_ID },
      ],
    });
  }
  clauses.push({
    published: { $ne: false },
    archived: { $ne: true },
    stock: { $ne: 0 },
  });
  clauses.push(HAS_DISPLAY_NAME_CLAUSE);
  if (Object.keys(extra).length > 0) clauses.push(extra);
  return { $and: clauses };
}

function categoryCatalogFilter(): Record<string, unknown> {
  return CATALOG_ID ? { catalogId: CATALOG_ID } : {};
}

function mentiosFilterWithClauses(extraClauses: Record<string, unknown>[] = []): Record<string, unknown> {
  const clauses = extraClauses.filter((clause) => Object.keys(clause).length > 0);
  return mentiosFilter(clauses.length > 0 ? { $and: clauses } : {});
}

function productCollectionClause(
  collectionSlug: string | undefined,
  categoryMap: Map<string, CategoryMapEntry>,
): Record<string, unknown> {
  const slug = collectionSlug?.trim();
  if (!slug) return {};

  const matchingCategories = Array.from(categoryMap.entries())
    .filter(([, category]) => category.collection === slug);
  const categoryIds = matchingCategories.map(([id]) => id);
  const categoryNames = uniqueStrings(
    matchingCategories.flatMap(([, category]) => [category.name, ...category.aliases]),
  );

  const clauses: Record<string, unknown>[] = [{ collectionSlug: slug }];
  if (categoryIds.length > 1) {
    clauses.push({ categoryId: { $in: categoryIds } });
  } else if (categoryIds.length === 1) {
    clauses.push({ categoryId: categoryIds[0] });
  }
  if (categoryNames.length > 0) clauses.push(productCategoryNameClause(categoryNames));

  return { $or: clauses };
}

/** Shared projection — all text/image fields needed for Product mapping. */
const PRODUCT_PROJECTION = {
  _id: 1,
  sourceProductId: 1,
  slug: 1,
  sku: 1,
  // Flat localized fields (local DB)
  name_en: 1, name_pl: 1, name_de: 1,
  description_en: 1, description_pl: 1, description_de: 1,
  // Nested localized fields from alternate catalog documents.
  name: 1, description: 1,
  defaultPriceGroupId: 1,
  price: 1,
  priceCurrencyCode: 1,
  currencyCode: 1,
  sourcePrice: 1,
  sourcePriceCurrencyCode: 1,
  stock: 1,
  published: 1,
  archived: 1,
  catalogId: 1,
  categoryId: 1,
  categoryName: 1,
  categoryName_en: 1,
  categoryName_pl: 1,
  categoryName_de: 1,
  collectionSlug: 1,
  isNew: 1,
  createdAt: 1,
  exportedAt: 1,
  updatedAt: 1,
  images: 1,
  imageUrl: 1,
  imageUrls: 1,
  imageLinks: 1,
};
const PRODUCT_PRICE_PROJECTION = {
  _id: 1,
  sourceProductId: 1,
  defaultPriceGroupId: 1,
  price: 1,
  priceCurrencyCode: 1,
  currencyCode: 1,
  sourcePrice: 1,
  sourcePriceCurrencyCode: 1,
} as const;

export type CanonicalProductPricing = {
  currencyCode: string;
  price: number;
};

function normalizeProductIdLookup(input: string): string {
  return input.trim();
}

function dedupeProductIds(productIds: string[]): string[] {
  return uniqueStrings(productIds.map(normalizeProductIdLookup).filter((value) => value.length > 0));
}

/**
 * Fetch canonical pricing for product ids from the configured Mentios catalog.
 * Keys map both `_id` and `sourceProductId`, where available.
 */
export async function getCanonicalProductPricing(
  productIds: string[],
  preferredCurrencyCode?: string | null,
): Promise<Map<string, CanonicalProductPricing>> {
  const ids = dedupeProductIds(productIds);
  if (ids.length === 0) return new Map<string, CanonicalProductPricing>();

  const db = await getEcommerceProductsDb();
  const objectIds = ids.filter(ObjectId.isValid).map((id) => new ObjectId(id));
  const lookupClauses: Record<string, unknown>[] = [
    { sourceProductId: { $in: ids } },
    { _id: { $in: ids } },
  ];
  if (objectIds.length > 0) {
    lookupClauses.push({ _id: { $in: objectIds } });
  }

  const [docs, pricingContext] = await Promise.all([
    db
      .collection<ProductPriceDoc>(PRODUCTS_COLLECTION)
      .find({
        $and: [
          mentiosFilter(),
          { $or: lookupClauses },
        ],
      })
      .project(PRODUCT_PRICE_PROJECTION)
      .toArray(),
    fetchPricingContextFromDb(db),
  ]);

  const prices = new Map<string, CanonicalProductPricing>();
  for (const row of docs as unknown as ProductPriceDoc[]) {
    const displayPricing = resolveProductDisplayPricing(row, pricingContext, 'en', preferredCurrencyCode);
    if (displayPricing.price < 0) continue;
    const pricing = { ...displayPricing, price: roundCurrencyAmount(displayPricing.price) };
    const id = stringifyDocumentId(row._id);
    if (id) prices.set(id, pricing);
    if (typeof row.sourceProductId === 'string' && row.sourceProductId.length > 0) {
      prices.set(row.sourceProductId, pricing);
    }
  }

  return prices;
}

export async function getCanonicalProductPrices(productIds: string[]): Promise<Map<string, number>> {
  const pricing = await getCanonicalProductPricing(productIds);
  return new Map(Array.from(pricing, ([key, value]) => [key, value.price]));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface FetchProductsOptions {
  limit?: number;
  skip?: number;
  collectionSlug?: string; // filter by resolved collection
  categoryId?: string;      // filter by raw DB categoryId (DB-level, before mapping)
  categoryName?: string;    // filter by localized display name — resolved to categoryId internally
  categoryNames?: string[];  // filter by multiple localized display names
  themeNames?: string[];     // filter by lore/theme text in product names (substring)
  loreNames?: string[];      // filter by exact lore values (5th pipe segment)
  search?: string;          // regex search across name / sku / description
  ids?: string[];           // fetch specific products by _id
  newOnly?: boolean;        // only products created within NEW_ARRIVALS_DAYS
  sort?: string;            // 'featured' | 'price-asc' | 'price-desc' | 'newest'
  priceMin?: number;        // inclusive lower bound on price
  priceMax?: number;        // exclusive upper bound on price (omit for no max)
  locale?: EcomLocale | string | null;
}

export interface MentiosResult {
  products: Product[];
  total: number;
}

export interface MentiosHomeStats {
  itemCount: number;
  categoryCount: number;
  loreCount: number;
}

export interface MentiosHeroLoreGroups {
  anime: string[];
  gaming: string[];
  movie: string[];
}

/** Return the storefront locales enabled on the configured Mentios catalog. */
export const getMentiosCatalogLocales = cache(async (): Promise<EcomLocale[]> => {
  if (!hasEcommerceProductsMongoConfig()) return normalizeLocaleList([]);

  try {
    const db = await getEcommerceProductsDb();
    const catalogs = db.collection<CatalogDoc>(CATALOGS_COLLECTION);
    const projection = { _id: 1, id: 1, isDefault: 1, languageIds: 1, defaultLanguageId: 1 } as const;
    const catalog =
      (CATALOG_ID
        ? await catalogs.findOne(
          { $or: [{ id: CATALOG_ID }, { _id: CATALOG_ID }] },
          { projection },
        )
        : null) ??
      await catalogs.findOne({ isDefault: true }, { projection });

    if (!catalog) return normalizeLocaleList([]);

    const codes = await resolveCatalogLocaleCodes(catalog);
    return normalizeLocaleList(codes);
  } catch {
    return normalizeLocaleList([]);
  }
});

/** Fetch all categories from the Mentios catalog. */
async function fetchCategories(locale: EcomLocale): Promise<Map<string, CategoryMapEntry>> {
  try {
    const db = await getEcommerceProductsDb();
    const docs = await db
      .collection<CategoryDoc>(CATEGORIES_COLLECTION)
      .find(categoryCatalogFilter())
      .project({ _id: 1, name: 1, name_en: 1, name_pl: 1, name_de: 1, parentId: 1 })
      .toArray();
    return buildCategoryMap(docs as unknown as CategoryDoc[], locale);
  } catch {
    return new Map();
  }
}

async function fetchPricingContextFromDb(db: Db): Promise<PricingContext> {
  try {
    const docs = await db
      .collection<PriceGroupDoc>(PRICE_GROUPS_COLLECTION)
      .find({})
      .toArray();
    const currencyIds = uniqueCurrencyIds(docs as PriceGroupDoc[]);
    const currencies = currencyIds.length > 0
      ? await db
          .collection<CurrencyDoc>(CURRENCIES_COLLECTION)
          .find(
            { $or: [{ id: { $in: currencyIds } }, { code: { $in: currencyIds } }] },
            { projection: { _id: 1, id: 1, code: 1 } },
          )
          .toArray()
      : [];
    const currencyCodeById = buildCurrencyCodeLookup(currencies as CurrencyDoc[]);
    const groups = (docs as PriceGroupDoc[])
      .map((doc) => toPriceGroup(doc, currencyCodeById))
      .filter((group): group is PriceGroup => group !== null);
    const configuredDefault = normalizeCurrencyCode(process.env['ECOM_DISPLAY_CURRENCY_CODE']);
    const defaultCurrencyCode =
      configuredDefault.length > 0 ? configuredDefault : groups.find((group) => group.isDefault)?.currencyCode ?? null;
    return { defaultCurrencyCode, groups };
  } catch {
    return { defaultCurrencyCode: null, groups: [] };
  }
}

/** Reverse-lookup: resolve a category display name to its raw DB _id. */
export const getMentiosCategoryIdByName = cache(async (
  categoryName: string,
  localeInput?: EcomLocale | string | null,
): Promise<string | null> => {
  const locale = normalizeLocale(localeInput);
  if (!hasEcommerceProductsMongoConfig()) return null;
  try {
    const categoryMap = await fetchCategories(locale);
    for (const [id, cat] of categoryMap) {
      if (cat.name === categoryName || cat.aliases.includes(categoryName)) return id;
    }
    return null;
  } catch {
    return null;
  }
});

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function firstNonEmptyString(...values: string[]): string {
  for (const value of values) {
    const normalized = value.trim();
    if (normalized.length > 0) return normalized;
  }
  return '';
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function productTextSearchClause(value: string): Record<string, unknown> {
  const pattern = escapeRegex(value);
  return {
    $or: [
      { name_en: { $regex: pattern, $options: 'i' } },
      { name_pl: { $regex: pattern, $options: 'i' } },
      { description_en: { $regex: pattern, $options: 'i' } },
      { description_pl: { $regex: pattern, $options: 'i' } },
      { name: { $regex: pattern, $options: 'i' } },
      { 'name.en': { $regex: pattern, $options: 'i' } },
      { 'name.pl': { $regex: pattern, $options: 'i' } },
      { sku: { $regex: pattern, $options: 'i' } },
      { 'description.en': { $regex: pattern, $options: 'i' } },
      { description: { $regex: pattern, $options: 'i' } },
    ],
  };
}

function productCategoryNameClause(values: string[]): Record<string, unknown> {
  return {
    $or: values.flatMap((value) => {
      const pattern = `^${escapeRegex(value)}$`;
      return [
        { categoryName: { $regex: pattern, $options: 'i' } },
        { categoryName_en: { $regex: pattern, $options: 'i' } },
        { categoryName_pl: { $regex: pattern, $options: 'i' } },
        { categoryName_de: { $regex: pattern, $options: 'i' } },
      ];
    }),
  };
}

function productThemeNameClause(values: string[]): Record<string, unknown> {
  const clauses = values.flatMap((value) => {
    const pattern = `^(?:[^|]*\\|){4}\\s*[^|]*${escapeRegex(value)}[^|]*$`;
    const matcher = { $regex: pattern, $options: 'i' };
    return [
      { name_en: matcher },
      { name_pl: matcher },
      { name_de: matcher },
      { name: matcher },
      { 'name.en': matcher },
      { 'name.pl': matcher },
      { 'name.de': matcher },
    ];
  });
  return clauses.length > 0 ? { $or: clauses } : {};
}

function productLoreNameClause(values: string[]): Record<string, unknown> {
  // Exact match on the 5th pipe segment: ^(seg|){4}\s*<lore>\s*$
  const clauses = values.flatMap((value) => {
    const pattern = `^(?:[^|]*\\|){4}\\s*${escapeRegex(value)}\\s*$`;
    const matcher = { $regex: pattern, $options: 'i' };
    return [
      { name_en: matcher },
      { name_pl: matcher },
      { name_de: matcher },
      { name: matcher },
      { 'name.en': matcher },
      { 'name.pl': matcher },
      { 'name.de': matcher },
    ];
  });
  // OR across values, but we need ANY lore to match — wrap each value's clauses with $or,
  // then the outer list is also $or (any lore in the selected set is a match).
  return clauses.length > 0 ? { $or: clauses } : {};
}

function usesResolvedPricePipeline(opts: FetchProductsOptions): boolean {
  return (
    opts.sort === 'price-asc' ||
    opts.sort === 'price-desc' ||
    typeof opts.priceMin === 'number' ||
    typeof opts.priceMax === 'number'
  );
}

function productMatchesResolvedPriceRange(product: Product, opts: FetchProductsOptions): boolean {
  if (typeof opts.priceMin === 'number' && product.price < opts.priceMin) return false;
  if (typeof opts.priceMax === 'number' && product.price >= opts.priceMax) return false;
  return true;
}

function applyResolvedPriceOrdering(products: Product[], sort: string | undefined): Product[] {
  if (sort !== 'price-asc' && sort !== 'price-desc') return products;
  const direction = sort === 'price-asc' ? 1 : -1;
  return [...products].sort((left, right) => (left.price - right.price) * direction);
}

function paginateProducts(products: Product[], skip: number, limit: number): Product[] {
  return products.slice(skip, skip + limit);
}

/** Fetch products from the Mentios catalog. Returns empty array on DB error. */
export async function getMentiosProducts(opts: FetchProductsOptions = {}): Promise<MentiosResult> {
  const { limit = 100, skip = 0 } = opts;
  const locale = normalizeLocale(opts.locale);
  if (!hasEcommerceProductsMongoConfig()) return { products: [], total: 0 };

  try {
    await ensureProductIndexes();
    const db = await getEcommerceProductsDb();
    const col = db.collection<ProductDoc>(PRODUCTS_COLLECTION);

    // Fetch category map once — used for both categoryName→id resolution and product mapping.
    const [categoryMap, pricing] = await Promise.all([
      fetchCategories(locale),
      fetchPricingContextFromDb(db),
    ]);

    const requestedCategoryNames = uniqueStrings([
      ...(opts.categoryNames ?? []),
      opts.categoryName,
    ]);
    const resolvedCategoryIds = opts.categoryId
      ? [opts.categoryId]
      : requestedCategoryNames
          .map((categoryName) => Array.from(categoryMap.entries()).find(([, category]) => (
            category.name === categoryName || category.aliases.includes(categoryName)
          ))?.[0])
          .filter((id): id is string => Boolean(id));
    const categoryFilter = opts.categoryId
      ? { categoryId: opts.categoryId }
      : resolvedCategoryIds.length > 1
        ? { categoryId: { $in: resolvedCategoryIds } }
        : resolvedCategoryIds.length === 1
          ? { categoryId: resolvedCategoryIds[0] }
          : requestedCategoryNames.length > 0
            ? productCategoryNameClause(requestedCategoryNames)
            : {};
    const queryClauses: Record<string, unknown>[] = [
      categoryFilter,
      productCollectionClause(opts.collectionSlug, categoryMap),
    ];

    // ID-based fetch stays inside the configured catalog.
    if (opts.ids && opts.ids.length > 0) {
      const idFilter = mentiosFilterWithClauses([
        ...queryClauses,
        { _id: { $in: opts.ids } },
      ]);
      const docs = await col
        .find(idFilter)
        .project(PRODUCT_PROJECTION)
        .toArray();
      const mapContext = { categoryMap, locale, pricing };
      const products = (docs as unknown as ProductDoc[]).map((doc, i) => mapDoc(doc, i, mapContext));
      return { products, total: products.length };
    }

    // "New arrivals" — products created within the last NEW_ARRIVALS_DAYS days.
    // The DB doesn't have an isNew boolean, so we use createdAt as the signal.
    const newOnlyClause: Record<string, unknown> = opts.newOnly
      ? { createdAt: { $gte: new Date(Date.now() - NEW_ARRIVALS_DAYS * 24 * 60 * 60 * 1000) } }
      : {};
    queryClauses.push(newOnlyClause);

    // Text search via $regex across all name/description fields.
    const themeNames = uniqueStrings(opts.themeNames ?? []);
    const loreNames = uniqueStrings(opts.loreNames ?? []);
    if (opts.search) queryClauses.push(productTextSearchClause(opts.search));
    if (themeNames.length > 0) queryClauses.push(productThemeNameClause(themeNames));
    if (loreNames.length > 0) queryClauses.push(productLoreNameClause(loreNames));

    const filter = mentiosFilterWithClauses(queryClauses);
    const mapContext = { categoryMap, locale, pricing };
    const resolvedPricePipeline = usesResolvedPricePipeline(opts);

    // Sort order — default is newest-first (editorial feel for "featured").
    const mongoSort: Record<string, 1 | -1> = {
      updatedAt: -1,
      exportedAt: -1,
      createdAt: -1,
    };

    if (resolvedPricePipeline) {
      const docs = await col.find(filter)
        .project(PRODUCT_PROJECTION)
        .sort(mongoSort)
        .toArray();
      const mappedProducts = (docs as unknown as ProductDoc[]).map((doc, i) =>
        mapDoc(doc, i, mapContext),
      );
      const filteredProducts = mappedProducts.filter((product) =>
        productMatchesResolvedPriceRange(product, opts)
      );
      const products = paginateProducts(
        applyResolvedPriceOrdering(filteredProducts, opts.sort),
        skip,
        limit,
      );
      return { products, total: filteredProducts.length };
    }

    const [docs, total] = await Promise.all([
      col.find(filter)
        .project(PRODUCT_PROJECTION)
        .sort(mongoSort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      col.countDocuments(filter),
    ]);

    const products = (docs as unknown as ProductDoc[]).map((doc, i) =>
      mapDoc(doc, skip + i, mapContext),
    );

    return { products, total };
  } catch (err) {
    logMentiosFallback('Products', err);
    return { products: [], total: 0 };
  }
}

/** Fetch a single product by its slug (sku-based) or raw _id. */
export const getMentiosProduct = cache(async (slugOrId: string, localeInput?: EcomLocale | string | null): Promise<Product | null> => {
  const locale = normalizeLocale(localeInput);
  if (!hasEcommerceProductsMongoConfig()) return null;

  try {
    const db = await getEcommerceProductsDb();
    const col = db.collection<ProductDoc>(PRODUCTS_COLLECTION);
    const normalizedSlug = slugify(slugOrId);

    // Try by SKU first (slug was built from SKU), then by _id.
    let doc = (await col.findOne({
      $and: [
        mentiosFilter(),
        {
          $or: [
            { sku: slugOrId },
            { sku: slugOrId.toUpperCase() },
            { slug: normalizedSlug },
            { _id: slugOrId },
          ],
        },
      ],
    } as Record<string, unknown>)) as unknown as ProductDoc | null;

    if (!doc) {
      const candidates = await col
        .find(mentiosFilter())
        .project(PRODUCT_PROJECTION)
        .toArray();
      doc = (candidates as unknown as ProductDoc[])
        .find((candidate) => productSlug(candidate) === normalizedSlug) ?? null;
    }

    if (!doc) return null;
    const [categoryMap, pricing] = await Promise.all([
      fetchCategories(locale),
      fetchPricingContextFromDb(db),
    ]);
    return mapDoc(doc, 0, { categoryMap, locale, pricing });
  } catch (err) {
    logMentiosFallback('Product', err);
    return null;
  }
});

/** Return all slugs currently in the Mentios catalog (for generateStaticParams). */
export const getMentiosSlugs = cache(async (): Promise<string[]> => {
  if (!hasEcommerceProductsMongoConfig()) return [];

  try {
    const db = await getEcommerceProductsDb();
    const docs = await db
      .collection<ProductDoc>(PRODUCTS_COLLECTION)
      .find(mentiosFilter(), { projection: { _id: 1, sku: 1, slug: 1 } })
      .toArray();
    return (docs as unknown as ProductDoc[]).map(productSlug);
  } catch {
    return [];
  }
});

/** Return categories that have at least one in-stock product, with per-category counts, sorted alphabetically. */
export const getMentiosCategories = cache(async (
  localeInput?: EcomLocale | string | null,
): Promise<MentiosCategory[]> => {
  const locale = normalizeLocale(localeInput);
  if (!hasEcommerceProductsMongoConfig()) return [];
  try {
    const db = await getEcommerceProductsDb();
    const [categoryDocs, countRows] = await Promise.all([
      db.collection<CategoryDoc>(CATEGORIES_COLLECTION)
        .find(categoryCatalogFilter())
        .project({ _id: 1, name: 1, name_en: 1, name_pl: 1, parentId: 1 })
        .toArray(),
      db.collection<ProductDoc>(PRODUCTS_COLLECTION)
        .aggregate([
          { $match: mentiosFilter() },
          { $group: { _id: '$categoryId', count: { $sum: 1 } } },
        ])
        .toArray(),
    ]);

    const normalizedCategoryDocs = categoryDocs as unknown as CategoryDoc[];
    const categoryMap = buildCategoryMap(normalizedCategoryDocs, locale);
    const parentNameMap = buildCategoryParentNameMap(normalizedCategoryDocs, locale);
    const parentNameEnMap = locale !== 'en'
      ? buildCategoryParentNameMap(normalizedCategoryDocs, 'en')
      : parentNameMap;
    const leafCategoryIds = buildLeafChildCategoryIds(normalizedCategoryDocs);
    const effectiveCategoryIds = leafCategoryIds.size > 0
      ? leafCategoryIds
      : new Set<string>(categoryMap.keys());

    const countMap = new Map<string, number>();
    for (const row of countRows) {
      const id = row['_id'] !== null ? String(row['_id']) : null;
      if (id) countMap.set(id, (row['count'] as number) ?? 0);
    }

    const categories = Array.from(categoryMap.entries())
      .filter(([id]) => effectiveCategoryIds.has(id))
      .map(([id, { name }]) => {
        const parentName = parentNameMap.get(id);
        const parentNameEn = parentNameEnMap.get(id);
        const count = countMap.get(id) ?? 0;
        if (parentName && parentNameEn) return { id, name, parentName, parentNameEn, count };
        if (parentName) return { id, name, parentName, count };
        return { id, name, count };
      })
      .filter(({ count }) => count > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
    if (categories.length > 0) return categories;

    const fallbackRows = await db.collection<ProductDoc>(PRODUCTS_COLLECTION)
      .find(mentiosFilter())
      .project({
        _id: 1,
        categoryName: 1,
        categoryName_en: 1,
        categoryName_pl: 1,
        categoryName_de: 1,
      })
      .toArray();
    const fallbackCounts = new Map<string, number>();
    for (const row of fallbackRows as unknown as ProductDoc[]) {
      const name = pickProductCategoryName(row, locale);
      if (!name) continue;
      fallbackCounts.set(name, (fallbackCounts.get(name) ?? 0) + 1);
    }

    return Array.from(fallbackCounts.entries())
      .map(([name, count]) => ({ id: name, name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
});

/** Return the highest raw price across the full product catalog (rounded up to nearest 50). */
export const getMentiosMaxPrice = cache(async (): Promise<number | null> => {
  if (!hasEcommerceProductsMongoConfig()) return null;
  try {
    const db = await getEcommerceProductsDb();
    const result = await db
      .collection<ProductDoc>(PRODUCTS_COLLECTION)
      .aggregate<{ maxPrice: number | null }>([
        { $match: mentiosFilter() },
        { $group: { _id: null, maxPrice: { $max: '$price' } } },
      ])
      .next();
    const raw = result?.maxPrice;
    if (raw === undefined || raw === null || !Number.isFinite(raw) || raw <= 0) return null;
    return Math.ceil(raw / 10) * 10;
  } catch {
    return null;
  }
});

/** Return distinct lore/universe names from the full product catalog, with counts. */
export const getMentiosLoreNames = cache(async (
  localeInput?: EcomLocale | string | null,
): Promise<Array<{ name: string; count: number }>> => {
  const locale = normalizeLocale(localeInput);
  if (!hasEcommerceProductsMongoConfig()) return [];
  try {
    const db = await getEcommerceProductsDb();
    const docs = await db
      .collection<ProductDoc>(PRODUCTS_COLLECTION)
      .find(mentiosFilter())
      .project({ _id: 1, name: 1, name_en: 1, name_pl: 1, name_de: 1 })
      .toArray();

    const counts = new Map<string, number>();
    for (const doc of docs as unknown as ProductDoc[]) {
      const lore = parsePipedName(pickProductName(doc, locale)).lore?.trim();
      if (!lore) continue;
      counts.set(lore, (counts.get(lore) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
});

/** Return lore/theme names parsed from product names, with counts. */
export const getMentiosThemeNames = cache(async (
  localeInput?: EcomLocale | string | null,
): Promise<Array<{ name: string; count: number }>> => {
  const locale = normalizeLocale(localeInput);
  if (!hasEcommerceProductsMongoConfig()) return [];
  try {
    const db = await getEcommerceProductsDb();
    const docs = await db
      .collection<ProductDoc>(PRODUCTS_COLLECTION)
      .find(mentiosFilter())
      .project({ _id: 1, name: 1, name_en: 1, name_pl: 1, name_de: 1 })
      .toArray();

    const counts = new Map<string, number>();
    for (const doc of docs as unknown as ProductDoc[]) {
      const theme = parsePipedName(pickProductName(doc, locale)).lore?.trim();
      if (!theme) continue;
      counts.set(theme, (counts.get(theme) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
});

function buildLeafChildCategoryIds(docs: CategoryDoc[]): Set<string> {
  const parentIds = new Set(
    docs
      .map((doc) => stringifyDocumentId(doc.parentId))
      .filter((id) => id.length > 0),
  );

  return new Set(
    docs
      .filter((doc) => {
        const id = stringifyDocumentId(doc._id);
        const parentId = stringifyDocumentId(doc.parentId);
        return id.length > 0 && parentId.length > 0 && !parentIds.has(id);
      })
      .map((doc) => stringifyDocumentId(doc._id)),
  );
}

function countLiveChildCategories(productDocs: ProductDoc[], categoryDocs: CategoryDoc[], locale: EcomLocale): number {
  const leafChildCategoryIds = buildLeafChildCategoryIds(categoryDocs);
  const usedCategoryIds = new Set(
    productDocs
      .map((doc) => stringifyDocumentId(doc.categoryId))
      .filter((id) => id.length > 0),
  );
  const liveChildCategoryCount = Array.from(leafChildCategoryIds)
    .filter((id) => usedCategoryIds.has(id)).length;
  if (liveChildCategoryCount > 0) return liveChildCategoryCount;

  const fallbackNames = new Set<string>();
  for (const doc of productDocs) {
    const name = pickProductCategoryName(doc, locale).trim();
    if (name.length > 0) fallbackNames.add(name.toLowerCase());
  }
  return fallbackNames.size;
}

function countLiveLores(productDocs: ProductDoc[], locale: EcomLocale): number {
  const lores = new Set<string>();
  for (const doc of productDocs) {
    const lore = parsePipedName(pickProductName(doc, locale)).lore?.trim();
    if (lore && lore.length > 0) lores.add(lore.toLowerCase());
  }
  return lores.size;
}

type HeroLoreGroupKey = keyof MentiosHeroLoreGroups;

function emptyHeroLoreGroups(): MentiosHeroLoreGroups {
  return { anime: [], gaming: [], movie: [] };
}

function matchHeroLoreGroup(value: string): HeroLoreGroupKey | null {
  if (/\banime\b/i.test(value)) return 'anime';
  if (/\b(gaming|game|games|gier|gry)\b/i.test(value)) return 'gaming';
  if (/\b(movie|movies|film|films|filmow\w*|tv|cinema|cinematic)\b/i.test(value)) return 'movie';
  return null;
}

function productHeroLoreGroup(
  doc: ProductDoc,
  categoryMap: Map<string, CategoryMapEntry>,
  parentNamesById: Map<string, string>,
  locale: EcomLocale,
): HeroLoreGroupKey | null {
  const categoryId = stringifyDocumentId(doc.categoryId);
  const category = categoryId ? categoryMap.get(categoryId) : undefined;
  const pipedCategory = parsePipedName(pickProductName(doc, locale)).categoryName;
  const categoryText = uniqueStrings([
    category?.name,
    ...(category?.aliases ?? []),
    categoryId ? parentNamesById.get(categoryId) : undefined,
    pickProductCategoryName(doc, locale),
    pipedCategory,
  ]).join(' ');
  return matchHeroLoreGroup(categoryText);
}

function pushUniqueHeroLore(target: string[], lore: string): void {
  const normalized = lore.trim();
  if (normalized.length === 0) return;
  const key = normalized.toLowerCase();
  if (target.some((value) => value.toLowerCase() === key)) return;
  target.push(normalized);
}

/** Return unique lore/theme names grouped by the product universe categories used by the home hero. */
export const getMentiosHeroLoreGroups = cache(async (
  localeInput?: EcomLocale | string | null,
): Promise<MentiosHeroLoreGroups> => {
  const locale = normalizeLocale(localeInput);
  if (!hasEcommerceProductsMongoConfig()) return emptyHeroLoreGroups();

  try {
    const db = await getEcommerceProductsDb();
    const [productDocs, categoryDocs] = await Promise.all([
      db.collection<ProductDoc>(PRODUCTS_COLLECTION)
        .find(mentiosFilter())
        .project({
          _id: 1,
          categoryId: 1,
          categoryName: 1,
          categoryName_en: 1,
          categoryName_pl: 1,
          categoryName_de: 1,
          name: 1,
          name_en: 1,
          name_pl: 1,
          name_de: 1,
        })
        .toArray(),
      db.collection<CategoryDoc>(CATEGORIES_COLLECTION)
        .find(categoryCatalogFilter())
        .project({ _id: 1, parentId: 1, name: 1, name_en: 1, name_pl: 1 })
        .toArray(),
    ]);

    const products = productDocs as unknown as ProductDoc[];
    const categories = categoryDocs as unknown as CategoryDoc[];
    const categoryMap = buildCategoryMap(categories, locale);
    const parentNamesById = buildCategoryParentNameMap(categories, locale);
    const groups = emptyHeroLoreGroups();

    for (const doc of products) {
      const lore = parsePipedName(pickProductName(doc, locale)).lore?.trim();
      if (!lore) continue;
      const group = productHeroLoreGroup(doc, categoryMap, parentNamesById, locale);
      if (group === null) continue;
      pushUniqueHeroLore(groups[group], lore);
    }

    return {
      anime: groups.anime.sort((a, b) => a.localeCompare(b)),
      gaming: groups.gaming.sort((a, b) => a.localeCompare(b)),
      movie: groups.movie.sort((a, b) => a.localeCompare(b)),
    };
  } catch (err) {
    logMentiosFallback('Hero lore groups', err);
    return emptyHeroLoreGroups();
  }
});

/** Return live storefront hero counts from in-stock products, child categories, and lore terms. */
export async function getMentiosHomeStats(
  localeInput?: EcomLocale | string | null,
): Promise<MentiosHomeStats | null> {
  const locale = normalizeLocale(localeInput);
  if (!hasEcommerceProductsMongoConfig()) return null;

  try {
    const db = await getEcommerceProductsDb();
    const [productDocs, categoryDocs] = await Promise.all([
      db.collection<ProductDoc>(PRODUCTS_COLLECTION)
        .find(mentiosFilter())
        .project({
          _id: 1,
          categoryId: 1,
          categoryName: 1,
          categoryName_en: 1,
          categoryName_pl: 1,
          categoryName_de: 1,
          name: 1,
          name_en: 1,
          name_pl: 1,
          name_de: 1,
        })
        .toArray(),
      db.collection<CategoryDoc>(CATEGORIES_COLLECTION)
        .find(categoryCatalogFilter())
        .project({ _id: 1, parentId: 1, name: 1, name_en: 1, name_pl: 1 })
        .toArray(),
    ]);

    const products = productDocs as unknown as ProductDoc[];
    const categories = categoryDocs as unknown as CategoryDoc[];
    return {
      itemCount: products.length,
      categoryCount: countLiveChildCategories(products, categories, locale),
      loreCount: countLiveLores(products, locale),
    };
  } catch (err) {
    logMentiosFallback('Home stats', err);
    return null;
  }
}

/** Fetch product count per collection slug in a single DB query. */
export const getMentiosCollectionCounts = cache(async (): Promise<Record<string, number>> => {
  if (!hasEcommerceProductsMongoConfig()) return {};
  try {
    const db = await getEcommerceProductsDb();
    const categoryMap = await fetchCategories('en');
    const docs = await db
      .collection<ProductDoc>(PRODUCTS_COLLECTION)
      .find(mentiosFilter())
      .project({ _id: 1, categoryId: 1, collectionSlug: 1 })
      .toArray();

    const counts: Record<string, number> = {};
    for (const doc of docs as unknown as ProductDoc[]) {
      const exportedCollectionSlug = doc.collectionSlug?.trim();
      if (exportedCollectionSlug) {
        counts[exportedCollectionSlug] = (counts[exportedCollectionSlug] ?? 0) + 1;
        continue;
      }
      const categoryId = stringifyDocumentId(doc.categoryId);
      const cat = categoryId ? categoryMap.get(categoryId) : undefined;
      const collection = cat?.collection ?? 'objects';
      counts[collection] = (counts[collection] ?? 0) + 1;
    }
    return counts;
  } catch {
    return {};
  }
});
