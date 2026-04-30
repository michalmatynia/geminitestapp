import 'server-only';

import { getDefaultScripterRegistry, getDefaultScripterServer } from '@/features/playwright/scripters/public';
import { CachedProductService } from '@/features/products/performance/cached-service';
import type { ScripterImportDraft } from '@/features/playwright/scripters';
import type {
  ProductScrapeProfile,
  ProductScrapeProfileRunProduct,
  ProductScrapeProfileRunRequest,
  ProductScrapeProfileRunResponse,
  ProductScrapeProfilesListResponse,
} from '@/shared/contracts/products/scrape-profiles';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { ProductCreateInput, ProductUpdateInput } from '@/shared/contracts/products/io';
import { configurationError, notFoundError } from '@/shared/errors/app-error';
import { getCatalogRepository } from '@/shared/lib/products/services/catalog-repository';
import { productService } from '@/shared/lib/products/services/productService';

type ProductScrapeProfileConfig = ProductScrapeProfile & {
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

const BATTLESTOCK_CATALOG_NAME = 'BattleStock';

const PRODUCT_SCRAPE_PROFILES: ProductScrapeProfileConfig[] = [
  {
    id: 'battlestock-warhammer-40k-30k',
    label: 'BattleStock Warhammer 40k / 30k',
    description: 'Products from the BattleStock Warhammer 40k / 30k category.',
    siteHost: 'www.battle-stock.pl',
    sourceUrl: 'https://www.battle-stock.pl/pl/c/Warhammer-40k-30k/45',
    scripterId: 'battlestock-warhammer-40k-30k',
    targetCatalogName: BATTLESTOCK_CATALOG_NAME,
    defaultLimit: null,
    maxPages: 75,
    skuPrefix: 'BATTLESTOCK-',
    supplierName: BATTLESTOCK_CATALOG_NAME,
    priceComment: 'Scraped from BattleStock',
  },
];

const toPublicProfile = (profile: ProductScrapeProfileConfig): ProductScrapeProfile => {
  const { skuPrefix: _skuPrefix, supplierName: _supplierName, priceComment: _priceComment, ...rest } =
    profile;
  return rest;
};

const findProfile = (profileId: string): ProductScrapeProfileConfig => {
  const profile = PRODUCT_SCRAPE_PROFILES.find((entry) => entry.id === profileId);
  if (!profile) {
    throw notFoundError(`Scrape profile not found: ${profileId}`, { profileId });
  }
  return profile;
};

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    const single = normalizeString(value);
    return single ? [single] : [];
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

const normalizeUrls = (values: string[], baseUrl: string): string[] =>
  Array.from(
    new Set(
      values
        .map((value) => toAbsoluteUrl(value, baseUrl))
        .filter((value): value is string => value !== null)
    )
  );

const normalizeSkuToken = (value: unknown): string | null => {
  const raw = normalizeString(value);
  if (!raw) return null;
  const token = raw
    .replace(/^https?:\/\//i, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
  return token.length > 0 ? token.toUpperCase() : null;
};

const hasBlockingIssue = (draft: ScripterImportDraft): boolean =>
  draft.issues.some((issue) => issue.severity === 'error');

const formatDraftIssues = (draft: ScripterImportDraft): string =>
  draft.issues
    .map((issue) => `${issue.field}: ${issue.message}`)
    .filter((message) => message.trim().length > 0)
    .join('; ');

const getRawString = (draft: ScripterImportDraft, key: string): string | null =>
  normalizeString(draft.raw[key]);

const buildCandidate = (
  draft: ScripterImportDraft,
  profile: ProductScrapeProfileConfig
): ProductScrapeCandidate | null => {
  const title =
    normalizeString(draft.draft.name_pl) ??
    normalizeString(draft.draft.name) ??
    normalizeString(draft.draft.name_en);
  const externalId =
    normalizeString(draft.externalId) ??
    getRawString(draft, 'product_id') ??
    normalizeString(draft.draft.supplierLink);
  const skuToken = normalizeSkuToken(draft.draft.sku) ?? normalizeSkuToken(externalId);
  const sourceUrl = normalizeString(draft.draft.supplierLink);

  if (!title || !skuToken || !sourceUrl) return null;

  return {
    title,
    sku: `${profile.skuPrefix}${skuToken}`,
    price: normalizeNumber(draft.draft.price),
    sourceUrl,
    imageLinks: normalizeUrls(normalizeStringArray(draft.draft.imageLinks), profile.sourceUrl),
  };
};

const existingCatalogIds = (product: ProductWithImages | null, catalogId: string): string[] => {
  const ids = new Set<string>();
  product?.catalogs?.forEach((relation) => {
    if (relation.catalogId.trim().length > 0) ids.add(relation.catalogId);
  });
  ids.add(catalogId);
  return Array.from(ids);
};

const buildCreatePayload = (
  candidate: ProductScrapeCandidate,
  profile: ProductScrapeProfileConfig,
  catalogIds: string[]
): ProductCreateInput => ({
  sku: candidate.sku,
  name_pl: candidate.title,
  supplierName: profile.supplierName,
  supplierLink: candidate.sourceUrl,
  priceComment: profile.priceComment,
  stock: 0,
  catalogIds,
  imageLinks: candidate.imageLinks,
  ...(candidate.price !== null ? { price: candidate.price } : {}),
});

const buildUpdatePayload = (
  candidate: ProductScrapeCandidate,
  profile: ProductScrapeProfileConfig,
  catalogIds: string[]
): ProductUpdateInput => ({
  sku: candidate.sku,
  name_pl: candidate.title,
  supplierName: profile.supplierName,
  supplierLink: candidate.sourceUrl,
  priceComment: profile.priceComment,
  catalogIds,
  imageLinks: candidate.imageLinks,
  ...(candidate.price !== null ? { price: candidate.price } : {}),
});

const ensureCatalog = async (name: string): Promise<CatalogRecord> => {
  const repository = await getCatalogRepository();
  const catalogs = await repository.listCatalogs();
  const existing = catalogs.find(
    (catalog) => catalog.name.trim().toLowerCase() === name.trim().toLowerCase()
  );
  if (existing) return existing;
  return await repository.createCatalog({
    name,
    description: null,
    isDefault: catalogs.length === 0,
    languageIds: [],
    defaultLanguageId: null,
    priceGroupIds: [],
    defaultPriceGroupId: null,
  });
};

const ensureScripterProfileFile = async (profile: ProductScrapeProfileConfig): Promise<void> => {
  const definition = await getDefaultScripterRegistry().get(profile.scripterId);
  if (!definition) {
    throw configurationError(`Scripter definition not found: ${profile.scripterId}`, {
      scripterId: profile.scripterId,
    });
  }
};

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
  title: candidate?.title ?? normalizeString(draft.draft.name) ?? null,
  sourceUrl: candidate?.sourceUrl ?? normalizeString(draft.draft.supplierLink) ?? null,
  error: options?.error ?? null,
});

export const listProductScrapeProfiles = (): ProductScrapeProfilesListResponse => ({
  profiles: PRODUCT_SCRAPE_PROFILES.map(toPublicProfile),
});

export const runProductScrapeProfile = async (
  input: ProductScrapeProfileRunRequest,
  options: { userId?: string | null } = {}
): Promise<ProductScrapeProfileRunResponse> => {
  const profile = findProfile(input.profileId);
  const dryRun = input.dryRun ?? false;
  const skipRecordsWithErrors = input.skipRecordsWithErrors ?? true;
  const productServiceOptions = options.userId ? { userId: options.userId } : undefined;
  await ensureScripterProfileFile(profile);

  const catalog = await ensureCatalog(profile.targetCatalogName);
  const source = await getDefaultScripterServer().dryRun({
    scripterId: profile.scripterId,
    enforceRobots: false,
    options: {
      limit: input.limit,
      skipRecordsWithErrors: false,
      catalogDefaults: { catalogIds: [catalog.id] },
    },
  });

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const products: ProductScrapeProfileRunProduct[] = [];

  for (const draft of source.drafts) {
    const candidate = buildCandidate(draft, profile);
    const blockingIssue = hasBlockingIssue(draft);

    if (blockingIssue && skipRecordsWithErrors) {
      skippedCount += 1;
      products.push(
        toResultProduct(draft, candidate, 'skipped', {
          error: formatDraftIssues(draft) || 'Record has blocking mapping errors.',
        })
      );
      continue;
    }

    if (!candidate) {
      failedCount += 1;
      products.push(
        toResultProduct(draft, candidate, 'failed', {
          error: 'Product title, SKU source, or source URL could not be resolved.',
        })
      );
      continue;
    }

    if (dryRun) {
      products.push(toResultProduct(draft, candidate, 'dry_run'));
      continue;
    }

    try {
      const existing = await productService.getProductBySku(candidate.sku);
      const catalogIds = existingCatalogIds(existing, catalog.id);
      if (existing) {
        const updated = await productService.updateProduct(
          existing.id,
          buildUpdatePayload(candidate, profile, catalogIds),
          productServiceOptions
        );
        updatedCount += 1;
        products.push(toResultProduct(draft, candidate, 'updated', { productId: updated.id }));
      } else {
        const created = await productService.createProduct(
          buildCreatePayload(candidate, profile, [catalog.id]),
          productServiceOptions
        );
        createdCount += 1;
        products.push(toResultProduct(draft, candidate, 'created', { productId: created.id }));
      }
    } catch (error) {
      failedCount += 1;
      products.push(
        toResultProduct(draft, candidate, 'failed', {
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  if (!dryRun && (createdCount > 0 || updatedCount > 0)) {
    CachedProductService.invalidateAll();
  }

  return {
    profileId: profile.id,
    profileLabel: profile.label,
    dryRun,
    catalog: { id: catalog.id, name: catalog.name },
    scrapedCount: source.drafts.length,
    createdCount,
    updatedCount,
    skippedCount,
    failedCount,
    issueCount: source.summary.totalIssues,
    products,
    summary: {
      rawCount: source.summary.rawCount,
      mappedCount: source.summary.mappedCount,
      recordsWithErrors: source.summary.recordsWithErrors,
      recordsWithWarnings: source.summary.recordsWithWarnings,
      totalIssues: source.summary.totalIssues,
    },
  };
};
