import 'server-only';

import type { ScripterImportDraft } from '@/features/playwright/scripters';
import type { ProductScrapeProfileRunProduct } from '@/shared/contracts/products/scrape-profiles';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import { productService } from '@/shared/lib/products/services/productService';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import {
  buildCandidate,
  buildCandidateDuplicateKeys,
  type ProductScrapeCandidate,
  type ProductScrapeProfileConfig,
} from './product-scrape-profiles.candidates';
import {
  buildCreatePayload,
  buildUpdatePayload,
  resolveResultPayloadTitle,
} from './product-scrape-profiles.payloads';
import { ensureScrapedSourceListing } from './product-scraped-source-common';

export type { ProductScrapeProfileConfig } from './product-scrape-profiles.candidates';

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
  draftTemplate?: ProductDraft | null;
  draftTemplateCategoryAliases?: readonly string[];
};

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

const mergeTemplateCatalogIds = (
  catalogIds: string[],
  template: ProductDraft | null | undefined
): string[] => {
  const ids = new Set(catalogIds);
  (template?.catalogIds ?? []).forEach((catalogId) => {
    if (catalogId.trim().length > 0) ids.add(catalogId);
  });
  return Array.from(ids);
};

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

const resolveResultTitle = (
  draft: ScripterImportDraft,
  candidate: ProductScrapeCandidate | null
): string | null => candidate?.title ?? normalizeString(draft.draft.name) ?? null;

const resolveResultSourceUrl = (
  draft: ScripterImportDraft,
  candidate: ProductScrapeCandidate | null
): string | null => candidate?.sourceUrl ?? normalizeString(draft.draft.supplierLink) ?? null;

const resolveResultProductSku = (candidate: ProductScrapeCandidate | null): string | null =>
  candidate !== null ? candidate.sku : null;

const resolveResultProductTitle = (
  draft: ScripterImportDraft,
  candidate: ProductScrapeCandidate | null,
  title: string | null | undefined
): string | null => title ?? resolveResultTitle(draft, candidate);

const toResultProduct = (
  draft: ScripterImportDraft,
  candidate: ProductScrapeCandidate | null,
  status: ProductScrapeProfileRunProduct['status'],
  options: { productId?: string | null; error?: string | null; title?: string | null } = {}
): ProductScrapeProfileRunProduct => ({
    index: draft.index,
    status,
    productId: options.productId ?? null,
    sku: resolveResultProductSku(candidate),
    title: resolveResultProductTitle(draft, candidate, options.title),
    sourceUrl: resolveResultSourceUrl(draft, candidate),
    error: options.error ?? null,
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

const linkPersistedScrapedProduct = async (
  productId: string,
  candidate: ProductScrapeCandidate
): Promise<void> => {
  try {
    await ensureScrapedSourceListing(productId, 'linked');
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'product-scrape-profiles',
      action: 'linkPersistedScrapedProduct',
      productId,
      sourceUrl: candidate.sourceUrl,
      sku: candidate.sku,
    });
  }
};

const processPersistedCandidate = async (
  draft: ScripterImportDraft,
  candidate: ProductScrapeCandidate,
  context: ProductScrapeRunContext
): Promise<ProductScrapeDraftOutcome> => {
  const existingBySku = await productService.getProductBySku(candidate.sku);
  const existing =
    existingBySku ?? (await productService.findProductBySupplierLink(candidate.sourceUrl));
  const catalogIds = mergeTemplateCatalogIds(
    existingCatalogIds(existing, context.catalog.id),
    context.draftTemplate
  );
  if (existing !== null) {
    const payload = buildUpdatePayload({
      candidate,
      draft,
      profile: context.profile,
      catalogIds,
      template: context.draftTemplate,
      templateCategoryAliases: context.draftTemplateCategoryAliases,
    });
    const updated = await productService.updateProduct(
      existing.id,
      payload,
      context.productServiceOptions
    );
    await linkPersistedScrapedProduct(updated.id, candidate);
    return createOutcome(
      toResultProduct(draft, candidate, 'updated', {
        productId: updated.id,
        title: resolveResultPayloadTitle(payload, candidate),
      }),
      { updatedCount: 1 }
    );
  }
  const payload = buildCreatePayload({
    candidate,
    draft,
    profile: context.profile,
    catalogIds: mergeTemplateCatalogIds([context.catalog.id], context.draftTemplate),
    template: context.draftTemplate,
    templateCategoryAliases: context.draftTemplateCategoryAliases,
  });
  const created = await productService.createProduct(
    payload,
    context.productServiceOptions
  );
  await linkPersistedScrapedProduct(created.id, candidate);
  return createOutcome(
    toResultProduct(draft, candidate, 'created', {
      productId: created.id,
      title: resolveResultPayloadTitle(payload, candidate),
    }),
    { createdCount: 1 }
  );
};

const processValidScrapeCandidate = async (
  draft: ScripterImportDraft,
  candidate: ProductScrapeCandidate,
  context: ProductScrapeRunContext
): Promise<ProductScrapeDraftOutcome> => {
  if (markDuplicateCandidate(candidate, context)) {
    return createOutcome(
      toResultProduct(draft, candidate, 'skipped', {
        error: 'Duplicate scraped product in this run.',
      }),
      { skippedCount: 1 }
    );
  }
  if (context.dryRun) {
    const payload = buildCreatePayload({
      candidate,
      draft,
      profile: context.profile,
      catalogIds: mergeTemplateCatalogIds([context.catalog.id], context.draftTemplate),
      template: context.draftTemplate,
      templateCategoryAliases: context.draftTemplateCategoryAliases,
    });
    return createOutcome(
      toResultProduct(draft, candidate, 'dry_run', {
        title: resolveResultPayloadTitle(payload, candidate),
      })
    );
  }
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
  return await processValidScrapeCandidate(draft, candidate, context);
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
