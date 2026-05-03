import type { ScripterImportDraft } from '@/features/playwright/scripters';
import type { ProductScrapeProfileRunProduct } from '@/shared/contracts/products/scrape-profiles';

import type { ProductScrapeCandidate } from './product-scrape-profiles.candidates';

export type ProductScrapeDraftOutcome = {
  result: ProductScrapeProfileRunProduct;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
};

export type ProductScrapeOutcomeSummary = {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  products: ProductScrapeProfileRunProduct[];
};

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

export const toResultProduct = (
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

export const createOutcome = (
  result: ProductScrapeProfileRunProduct,
  counts: Partial<Omit<ProductScrapeDraftOutcome, 'result'>> = {}
): ProductScrapeDraftOutcome => ({
  result,
  createdCount: counts.createdCount ?? 0,
  updatedCount: counts.updatedCount ?? 0,
  skippedCount: counts.skippedCount ?? 0,
  failedCount: counts.failedCount ?? 0,
});

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
