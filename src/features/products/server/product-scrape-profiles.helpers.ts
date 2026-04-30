import 'server-only';

import type { ScripterImportDraft } from '@/features/playwright/scripters';
import type {
  ProductScrapeProfile,
  ProductScrapeProfileRunProduct,
} from '@/shared/contracts/products/scrape-profiles';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { ProductCreateInput, ProductUpdateInput } from '@/shared/contracts/products/io';
import { productService } from '@/shared/lib/products/services/productService';
export type ProductScrapeProfileConfig = ProductScrapeProfile & {
  skuPrefix: string;
  supplierName: string;
  priceComment: string;
};
type ProductScrapeCandidate = {
  title: string;
  sku: string;
  price: number | null;
  sourceUrl: string;
  imageLinks: string[];
};
type ProductScrapeDuplicateState = {
  seenKeys: Set<string>;
};
type ProductScrapeDraftOutcome = {
  result: ProductScrapeProfileRunProduct;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
};
type ProductScrapeOutcomeSummary = {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  products: ProductScrapeProfileRunProduct[];
};
type ProductScrapeRunContext = {
  profile: ProductScrapeProfileConfig;
  catalog: CatalogRecord;
  dryRun: boolean;
  skipRecordsWithErrors: boolean;
  productServiceOptions: { userId?: string } | undefined;
  duplicateState?: ProductScrapeDuplicateState;
};
const TRACKING_QUERY_PARAM_PATTERN = /^(utm_|fbclid$|gclid$|gbraid$|wbraid$|mc_cid$|mc_eid$)/i;

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
const normalizeNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(',', '.');
  if (normalized.length === 0) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};
const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    const single = normalizeString(value);
    return single !== null ? [single] : [];
  }
  return value
    .map((entry) => normalizeString(entry))
    .filter((entry): entry is string => entry !== null);
};
const toAbsoluteUrl = (value: string, baseUrl: string): string | null => {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
};
const canonicalizeSourceUrl = (value: string, baseUrl: string): string | null => {
  const absolute = toAbsoluteUrl(value, baseUrl);
  if (absolute === null) return null;
  try {
    const url = new URL(absolute);
    url.hash = '';
    Array.from(url.searchParams.keys()).forEach((key) => {
      if (TRACKING_QUERY_PARAM_PATTERN.test(key)) url.searchParams.delete(key);
    });
    url.searchParams.sort();
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    return url.toString();
  } catch {
    return absolute;
  }
};
const normalizeUrls = (values: string[], baseUrl: string): string[] =>
  Array.from(
    new Set(
      values
        .map((value) => toAbsoluteUrl(value, baseUrl))
        .filter((value): value is string => value !== null)
    )
  );
const resolveUrlPathIdentityToken = (value: string): string | null => {
  try {
    const url = new URL(value);
    const token = url.pathname
      .split('/')
      .filter((segment) => segment.trim().length > 0)
      .at(-1);
    if (token === undefined || !/^[a-zA-Z0-9._-]+$/.test(token)) return null;
    return token;
  } catch {
    return null;
  }
};
const normalizeSkuToken = (value: unknown): string | null => {
  const raw = normalizeString(value);
  if (raw === null) return null;
  const tokenSource = resolveUrlPathIdentityToken(raw) ?? raw;
  const token = tokenSource
    .replace(/^https?:\/\//i, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
  return token.length > 0 ? token.toUpperCase() : null;
};
const getRawString = (draft: ScripterImportDraft, key: string): string | null =>
  normalizeString(draft.raw[key]);
const resolveDraftTitle = (draft: ScripterImportDraft): string | null =>
  normalizeString(draft.draft.name_pl) ??
  normalizeString(draft.draft.name) ??
  normalizeString(draft.draft.name_en);

const resolveDraftExternalId = (
  draft: ScripterImportDraft,
  sourceUrl: string | null
): string | null =>
  normalizeString(draft.externalId) ??
  getRawString(draft, 'product_id') ??
  sourceUrl;

const buildCandidate = (
  draft: ScripterImportDraft,
  profile: ProductScrapeProfileConfig
): ProductScrapeCandidate | null => {
  const title = resolveDraftTitle(draft);
  const sourceUrl = normalizeString(draft.draft.supplierLink);
  const canonicalSourceUrl =
    sourceUrl !== null ? canonicalizeSourceUrl(sourceUrl, profile.sourceUrl) : null;
  const skuToken =
    normalizeSkuToken(draft.draft.sku) ??
    normalizeSkuToken(resolveDraftExternalId(draft, canonicalSourceUrl));
  if (title === null || skuToken === null || canonicalSourceUrl === null) return null;
  return {
    title,
    sku: `${profile.skuPrefix}${skuToken}`,
    price: normalizeNumber(draft.draft.price),
    sourceUrl: canonicalSourceUrl,
    imageLinks: normalizeUrls(normalizeStringArray(draft.draft.imageLinks), profile.sourceUrl),
  };
};

const hasBlockingIssue = (draft: ScripterImportDraft): boolean =>
  draft.issues.some((issue) => issue.severity === 'error');

const formatDraftIssues = (draft: ScripterImportDraft): string =>
  draft.issues
    .map((issue) => `${issue.field}: ${issue.message}`)
    .filter((message) => message.trim().length > 0)
    .join('; ');

const existingCatalogIds = (product: ProductWithImages | null, catalogId: string): string[] => {
  const ids = new Set<string>();
  if (product !== null) {
    product.catalogs.forEach((relation) => {
      if (relation.catalogId.trim().length > 0) ids.add(relation.catalogId);
    });
  }
  ids.add(catalogId);
  return Array.from(ids);
};

const buildCandidateDuplicateKeys = (
  candidate: ProductScrapeCandidate,
  profile: ProductScrapeProfileConfig
): string[] => [
  `${profile.id}:sku:${candidate.sku.trim().toUpperCase()}`,
  `${profile.id}:source:${candidate.sourceUrl}`,
];

const markDuplicateCandidate = (
  candidate: ProductScrapeCandidate,
  context: ProductScrapeRunContext
): boolean => {
  const state = context.duplicateState;
  if (state === undefined) return false;
  const keys = buildCandidateDuplicateKeys(candidate, context.profile);
  if (keys.some((key) => state.seenKeys.has(key))) return true;
  keys.forEach((key) => state.seenKeys.add(key));
  return false;
};

const buildCreatePayload = (
  candidate: ProductScrapeCandidate,
  profile: ProductScrapeProfileConfig,
  catalogIds: string[]
): ProductCreateInput => ({
  sku: candidate.sku,
  importSource: 'scrape',
  name_pl: candidate.title,
  supplierName: profile.supplierName,
  supplierLink: candidate.sourceUrl,
  priceComment: profile.priceComment,
  stock: 0,
  catalogIds,
  imageLinks: candidate.imageLinks,
  ...(candidate.price !== null ? { sourcePrice: candidate.price } : {}),
});

const buildUpdatePayload = (
  candidate: ProductScrapeCandidate,
  profile: ProductScrapeProfileConfig,
  catalogIds: string[]
): ProductUpdateInput => ({
  sku: candidate.sku,
  importSource: 'scrape',
  name_pl: candidate.title,
  supplierName: profile.supplierName,
  supplierLink: candidate.sourceUrl,
  priceComment: profile.priceComment,
  catalogIds,
  imageLinks: candidate.imageLinks,
  ...(candidate.price !== null ? { sourcePrice: candidate.price } : {}),
});

const resolveResultTitle = (
  draft: ScripterImportDraft,
  candidate: ProductScrapeCandidate | null
): string | null => candidate?.title ?? normalizeString(draft.draft.name) ?? null;

const resolveResultSourceUrl = (
  draft: ScripterImportDraft,
  candidate: ProductScrapeCandidate | null
): string | null => candidate?.sourceUrl ?? normalizeString(draft.draft.supplierLink) ?? null;

const toResultProduct = (
  draft: ScripterImportDraft,
  candidate: ProductScrapeCandidate | null,
  status: ProductScrapeProfileRunProduct['status'],
  options?: { productId?: string | null; error?: string | null }
): ProductScrapeProfileRunProduct => ({
  index: draft.index,
  status,
  productId: options?.productId ?? null,
  sku: candidate?.sku ?? null,
  title: resolveResultTitle(draft, candidate),
  sourceUrl: resolveResultSourceUrl(draft, candidate),
  error: options?.error ?? null,
});

const createOutcome = (
  result: ProductScrapeProfileRunProduct,
  counts: Partial<Omit<ProductScrapeDraftOutcome, 'result'>> = {}
): ProductScrapeDraftOutcome => ({
  result,
  createdCount: counts.createdCount ?? 0,
  updatedCount: counts.updatedCount ?? 0,
  skippedCount: counts.skippedCount ?? 0,
  failedCount: counts.failedCount ?? 0,
});

const processPersistedCandidate = async (
  draft: ScripterImportDraft,
  candidate: ProductScrapeCandidate,
  context: ProductScrapeRunContext
): Promise<ProductScrapeDraftOutcome> => {
  const existingBySku = await productService.getProductBySku(candidate.sku);
  const existing =
    existingBySku ?? (await productService.findProductBySupplierLink(candidate.sourceUrl));
  const catalogIds = existingCatalogIds(existing, context.catalog.id);
  if (existing !== null) {
    const updated = await productService.updateProduct(
      existing.id,
      buildUpdatePayload(candidate, context.profile, catalogIds),
      context.productServiceOptions
    );
    return createOutcome(toResultProduct(draft, candidate, 'updated', { productId: updated.id }), {
      updatedCount: 1,
    });
  }
  const created = await productService.createProduct(
    buildCreatePayload(candidate, context.profile, [context.catalog.id]),
    context.productServiceOptions
  );
  return createOutcome(toResultProduct(draft, candidate, 'created', { productId: created.id }), {
    createdCount: 1,
  });
};

export const processScrapeDraft = async (
  draft: ScripterImportDraft,
  context: ProductScrapeRunContext
): Promise<ProductScrapeDraftOutcome> => {
  const candidate = buildCandidate(draft, context.profile);
  if (hasBlockingIssue(draft) && context.skipRecordsWithErrors) {
    const issueText = formatDraftIssues(draft);
    return createOutcome(
      toResultProduct(draft, candidate, 'skipped', {
        error: issueText.length > 0 ? issueText : 'Record has blocking mapping errors.',
      }),
      { skippedCount: 1 }
    );
  }
  if (candidate === null) {
    return createOutcome(
      toResultProduct(draft, candidate, 'failed', {
        error: 'Product title, SKU source, or source URL could not be resolved.',
      }),
      { failedCount: 1 }
    );
  }
  if (markDuplicateCandidate(candidate, context)) {
    return createOutcome(
      toResultProduct(draft, candidate, 'skipped', {
        error: 'Duplicate scraped product in this run.',
      }),
      { skippedCount: 1 }
    );
  }
  if (context.dryRun) return createOutcome(toResultProduct(draft, candidate, 'dry_run'));
  try {
    return await processPersistedCandidate(draft, candidate, context);
  } catch (error) {
    return createOutcome(
      toResultProduct(draft, candidate, 'failed', {
        error: error instanceof Error ? error.message : String(error),
      }),
      { failedCount: 1 }
    );
  }
};

export const processScrapeDrafts = async (
  drafts: ScripterImportDraft[],
  context: ProductScrapeRunContext
): Promise<ProductScrapeDraftOutcome[]> => {
  const runContext: ProductScrapeRunContext = {
    ...context,
    duplicateState: context.duplicateState ?? { seenKeys: new Set<string>() },
  };
  return await drafts.reduce<Promise<ProductScrapeDraftOutcome[]>>(async (previous, draft) => {
    const outcomes = await previous;
    outcomes.push(await processScrapeDraft(draft, runContext));
    return outcomes;
  }, Promise.resolve([]));
};
export const summarizeOutcomes = (
  outcomes: ProductScrapeDraftOutcome[]
): ProductScrapeOutcomeSummary =>
  outcomes.reduce(
    (summary, outcome) => ({
      createdCount: summary.createdCount + outcome.createdCount,
      updatedCount: summary.updatedCount + outcome.updatedCount,
      skippedCount: summary.skippedCount + outcome.skippedCount,
      failedCount: summary.failedCount + outcome.failedCount,
      products: [...summary.products, outcome.result],
    }),
    {
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      products: [] as ProductScrapeProfileRunProduct[],
    }
  );
