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

import type { Product } from '@/data/products';
import { getProductsDb, hasProductsMongoConfig } from '@/lib/mongodb';
import { normalizeLocale, normalizeLocaleList, type EcomLocale } from '@/lib/locales';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATALOG_ID = process.env.MENTIOS_CATALOG_ID ?? 'catalog-mentios';
const PRODUCTS_COLLECTION = 'products';
const CATEGORIES_COLLECTION = 'product_categories';
const CATALOGS_COLLECTION = 'catalogs';
const LANGUAGES_COLLECTION = 'languages';

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
  _id: string;
  // Flat localized fields (actual local DB format)
  name_en?: string | null;
  name_pl?: string | null;
  name_de?: string | null;
  description_en?: string | null;
  description_pl?: string | null;
  description_de?: string | null;
  // Legacy nested format (kept for cross-env compatibility)
  name?: string | LocalizedField | null;
  description?: string | LocalizedField | null;
  price?: number | null;
  sku?: string | null;
  stock?: number | null;
  published?: boolean;
  archived?: boolean;
  catalogId?: string;
  categoryId?: string | null;
  isNew?: boolean;
  createdAt?: string | Date;
  images?: Array<{
    imageFileId?: string;
    productId?: string;
    imageFile?: { filepath?: string; id?: string };
  }>;
  imageLinks?: Array<string | null>;
  catalogs?: Array<{ catalogId?: string }>;
}

interface CategoryDoc {
  _id: string;
  name?: string | LocalizedField | null;
  name_en?: string | null;
  name_pl?: string | null;
  parentId?: string | null;
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function chooseLocalized(
  locale: EcomLocale,
  values: Partial<Record<EcomLocale | 'de', string | null | undefined>>,
): string {
  if (locale === 'pl') return values.pl ?? values.en ?? values.de ?? '';
  return values.en ?? values.pl ?? values.de ?? '';
}

function pickLocalized(field: string | LocalizedField | null | undefined, locale: EcomLocale): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return chooseLocalized(locale, field);
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
  return chooseLocalized(locale, { en: doc.name_en, pl: doc.name_pl }) || pickLocalized(doc.name, locale) || doc._id;
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
  if (doc.sku) {
    const s = slugify(doc.sku);
    if (s.length > 2) return s;
  }
  return doc._id.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 24) || doc._id;
}

function gradient(index: number): string {
  return GRADIENT_POOL[index % GRADIENT_POOL.length];
}

function gradientAlt(index: number): string {
  return GRADIENT_POOL_ALT[index % GRADIENT_POOL_ALT.length];
}

function formatPrice(price: number | null | undefined): string {
  if (price == null) return '—';
  return `€ ${price.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function categoryToCollection(name: string): string {
  const l = name.toLowerCase();
  if (/women|dam[eę]|femm|ladies|girl|female/i.test(l)) return 'womenswear';
  if (/\bmen\b|heren|herr|homme|uomini|male/i.test(l)) return 'menswear';
  if (/bag|accessor|jewel|belt|scarf|wallet|purse|hat|cap|shoes?|boots?/i.test(l)) return 'accessories';
  return 'objects';
}

function buildCategoryMap(docs: CategoryDoc[], locale: EcomLocale): Map<string, { name: string; collection: string }> {
  const map = new Map<string, { name: string; collection: string }>();
  for (const doc of docs) {
    const name = pickCategoryName(doc, locale);
    map.set(doc._id, { name, collection: categoryToCollection(name) });
  }
  return map;
}

function productTag(doc: ProductDoc, locale: EcomLocale): string | undefined {
  if (doc.isNew) return locale === 'pl' ? 'Nowość' : 'New';
  if (doc.stock != null && doc.stock > 0 && doc.stock <= 3) return locale === 'pl' ? 'Ostatnie sztuki' : 'Last pieces';
  if (doc.stock != null && doc.stock === 0) return locale === 'pl' ? 'Wyprzedane' : 'Sold out';
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

  const db = await getProductsDb();
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

const MAIN_APP_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_MAIN_APP_URL);
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

const FILE_BASE_URL = normalizeFileBaseUrl(process.env.NEXT_PUBLIC_FILE_BASE_URL) || DEFAULT_FILE_BASE_URL;

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

function buildImageUrls(doc: ProductDoc): string[] {
  const imageUrls = uniqueProductImageUrls([
    ...(doc.imageLinks?.map((link) => normalizeProductImageUrl(link)) ?? []),
    ...(doc.images?.map((image) => normalizeProductImageUrl(image.imageFile?.filepath)) ?? []),
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
  categoryMap: Map<string, { name: string; collection: string }>,
  locale: EcomLocale,
): Product {
  const category = doc.categoryId ? categoryMap.get(doc.categoryId) : undefined;
  const name = pickProductName(doc, locale);
  const description = pickProductDescription(doc, locale);
  const price = doc.price ?? 0;
  const imageUrls = buildImageUrls(doc);

  return {
    id: doc._id,
    slug: productSlug(doc),
    name,
    category: category?.name ?? (locale === 'pl' ? 'Wszystkie produkty' : 'Objects'),
    collectionSlug: category?.collection ?? 'objects',
    price,
    priceDisplay: formatPrice(doc.price),
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
  return {
    $or: [
      { catalogId: CATALOG_ID },
      { 'catalogs.catalogId': CATALOG_ID },
    ],
    published: { $ne: false },
    archived: { $ne: true },
    ...extra,
  };
}

/** Shared projection — all text/image fields needed for Product mapping. */
const PRODUCT_PROJECTION = {
  _id: 1,
  sku: 1,
  // Flat localized fields (local DB)
  name_en: 1, name_pl: 1, name_de: 1,
  description_en: 1, description_pl: 1, description_de: 1,
  // Nested localized fields (cloud / legacy)
  name: 1, description: 1,
  price: 1,
  stock: 1,
  published: 1,
  archived: 1,
  catalogId: 1,
  categoryId: 1,
  isNew: 1,
  createdAt: 1,
  images: 1,
  imageLinks: 1,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface FetchProductsOptions {
  limit?: number;
  skip?: number;
  collectionSlug?: string; // filter by resolved collection
  search?: string;          // regex search across name / sku / description
  ids?: string[];           // fetch specific products by _id
  newOnly?: boolean;        // only products created within NEW_ARRIVALS_DAYS
  locale?: EcomLocale | string | null;
}

export interface MentiosResult {
  products: Product[];
  total: number;
}

/** Return the storefront locales enabled on the configured Mentios catalog. */
export async function getMentiosCatalogLocales(): Promise<EcomLocale[]> {
  if (!hasProductsMongoConfig()) return normalizeLocaleList([]);

  try {
    const db = await getProductsDb();
    const catalogs = db.collection<CatalogDoc>(CATALOGS_COLLECTION);
    const projection = { _id: 1, id: 1, isDefault: 1, languageIds: 1, defaultLanguageId: 1 } as const;
    const catalog =
      await catalogs.findOne(
        { $or: [{ id: CATALOG_ID }, { _id: CATALOG_ID }] },
        { projection },
      ) ??
      await catalogs.findOne({ isDefault: true }, { projection });

    if (!catalog) return normalizeLocaleList([]);

    const codes = await resolveCatalogLocaleCodes(catalog);
    return normalizeLocaleList(codes);
  } catch {
    return normalizeLocaleList([]);
  }
}

/** Fetch all categories from the Mentios catalog. */
async function fetchCategories(locale: EcomLocale): Promise<Map<string, { name: string; collection: string }>> {
  try {
    const db = await getProductsDb();
    const docs = await db
      .collection<CategoryDoc>(CATEGORIES_COLLECTION)
      .find({ catalogId: CATALOG_ID })
      .project({ _id: 1, name: 1, name_en: 1, name_pl: 1, name_de: 1, parentId: 1 })
      .toArray();
    return buildCategoryMap(docs as unknown as CategoryDoc[], locale);
  } catch {
    return new Map();
  }
}

/** Fetch products from the Mentios catalog. Returns empty array on DB error. */
export async function getMentiosProducts(opts: FetchProductsOptions = {}): Promise<MentiosResult> {
  const { limit = 100, skip = 0 } = opts;
  const locale = normalizeLocale(opts.locale);
  if (!hasProductsMongoConfig()) return { products: [], total: 0 };

  try {
    const db = await getProductsDb();
    const col = db.collection<ProductDoc>(PRODUCTS_COLLECTION);

    const baseFilter = mentiosFilter();

    // ID-based fetch stays inside the configured catalog.
    if (opts.ids && opts.ids.length > 0) {
      const docs = await col
        .find({
          $and: [baseFilter, { _id: { $in: opts.ids } }],
        } as Record<string, unknown>)
        .project(PRODUCT_PROJECTION)
        .toArray();
      const categoryMap = await fetchCategories(locale);
      const products = (docs as unknown as ProductDoc[]).map((doc, i) => mapDoc(doc, i, categoryMap, locale));
      return { products, total: products.length };
    }

    // "New arrivals" — products created within the last NEW_ARRIVALS_DAYS days.
    // The DB doesn't have an isNew boolean, so we use createdAt as the signal.
    const newOnlyClause: Record<string, unknown> = opts.newOnly
      ? { createdAt: { $gte: new Date(Date.now() - NEW_ARRIVALS_DAYS * 24 * 60 * 60 * 1000) } }
      : {};

    // Text search via $regex across all name/description fields.
    const filter: Record<string, unknown> = opts.search
      ? {
          ...baseFilter,
          ...newOnlyClause,
          $and: [
            {
              $or: [
                // Flat fields (local DB)
                { name_en: { $regex: opts.search, $options: 'i' } },
                { name_pl: { $regex: opts.search, $options: 'i' } },
                { description_en: { $regex: opts.search, $options: 'i' } },
                { description_pl: { $regex: opts.search, $options: 'i' } },
                // Nested fields (cloud / legacy)
                { name: { $regex: opts.search, $options: 'i' } },
                { 'name.en': { $regex: opts.search, $options: 'i' } },
                { 'name.pl': { $regex: opts.search, $options: 'i' } },
                { sku: { $regex: opts.search, $options: 'i' } },
                { 'description.en': { $regex: opts.search, $options: 'i' } },
                { description: { $regex: opts.search, $options: 'i' } },
              ],
            },
          ],
        }
      : { ...baseFilter, ...newOnlyClause };

    const [docs, total] = await Promise.all([
      col.find(filter)
        .project(PRODUCT_PROJECTION)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      col.countDocuments(filter),
    ]);

    const categoryMap = await fetchCategories(locale);
    const products = (docs as unknown as ProductDoc[]).map((doc, i) =>
      mapDoc(doc, skip + i, categoryMap, locale),
    );

    // Collection filter applied post-mapping (category resolution happens in mapDoc)
    if (opts.collectionSlug) {
      const filtered = products.filter((p) => p.collectionSlug === opts.collectionSlug);
      return { products: filtered, total: filtered.length };
    }

    return { products, total };
  } catch (err) {
    console.error('[mentios] Failed to fetch products:', err);
    return { products: [], total: 0 };
  }
}

/** Fetch a single product by its slug (sku-based) or raw _id. */
export async function getMentiosProduct(slugOrId: string, localeInput?: EcomLocale | string | null): Promise<Product | null> {
  const locale = normalizeLocale(localeInput);
  if (!hasProductsMongoConfig()) return null;

  try {
    const db = await getProductsDb();
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
    const categoryMap = await fetchCategories(locale);
    return mapDoc(doc, 0, categoryMap, locale);
  } catch (err) {
    console.error('[mentios] Failed to fetch product:', err);
    return null;
  }
}

/** Return all slugs currently in the Mentios catalog (for generateStaticParams). */
export async function getMentiosSlugs(): Promise<string[]> {
  if (!hasProductsMongoConfig()) return [];

  try {
    const db = await getProductsDb();
    const docs = await db
      .collection<ProductDoc>(PRODUCTS_COLLECTION)
      .find(mentiosFilter(), { projection: { _id: 1, sku: 1 } })
      .toArray();
    return (docs as unknown as ProductDoc[]).map(productSlug);
  } catch {
    return [];
  }
}

/** Fetch product count per collection slug in a single DB query. */
export async function getMentiosCollectionCounts(): Promise<Record<string, number>> {
  if (!hasProductsMongoConfig()) return {};
  try {
    const db = await getProductsDb();
    const categoryMap = await fetchCategories('en');
    const docs = await db
      .collection<ProductDoc>(PRODUCTS_COLLECTION)
      .find(mentiosFilter())
      .project({ _id: 1, categoryId: 1 })
      .toArray();

    const counts: Record<string, number> = {};
    for (const doc of docs as unknown as ProductDoc[]) {
      const cat = doc.categoryId ? categoryMap.get(doc.categoryId) : undefined;
      const collection = cat?.collection ?? 'objects';
      counts[collection] = (counts[collection] ?? 0) + 1;
    }
    return counts;
  } catch {
    return {};
  }
}
