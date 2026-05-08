import 'server-only';

import type { ScripterImportDraft } from '@/features/playwright/scripters';
import type { ProductScrapeProfileImageImportMode } from '@/shared/contracts/products/scrape-profiles';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { PriceGroupForCalculation, ProductWithImages } from '@/shared/contracts/products/product';
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
import { resolveScrapeImagePayload } from './product-scrape-profile-images';
import {
  createOutcome,
  toResultProduct,
  type ProductScrapeDraftOutcome,
} from './product-scrape-profiles.outcomes';
import { ensureScrapedSourceListing } from './product-scraped-source-common';

export type { ProductScrapeProfileConfig } from './product-scrape-profiles.candidates';

type ProductScrapeDuplicateState = { seenKeys: Set<string> };
type ProductScrapeRunContext = {
  profile: ProductScrapeProfileConfig;
  catalog: CatalogRecord;
  dryRun: boolean;
  imageImportMode: ProductScrapeProfileImageImportMode;
  skipRecordsWithErrors: boolean;
  productServiceOptions: { userId?: string } | undefined;
  priceGroups: PriceGroupForCalculation[];
  sourcePriceCurrencyCode: string;
  duplicateState?: ProductScrapeDuplicateState;
  draftTemplate?: ProductDraft | null;
  draftTemplateCategoryAliases?: readonly string[];
  waitWhilePaused?: () => Promise<void>;
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

const processExistingScrapeCandidate = async (input: {
  catalogIds: string[];
  candidate: ProductScrapeCandidate;
  context: ProductScrapeRunContext;
  draft: ScripterImportDraft;
  existing: ProductWithImages;
  imagePayload: Awaited<ReturnType<typeof resolveScrapeImagePayload>>;
}): Promise<ProductScrapeDraftOutcome> => {
  const payload = buildUpdatePayload({
    candidate: input.candidate,
    draft: input.draft,
    imagePayload: input.imagePayload,
    profile: input.context.profile,
    catalogIds: input.catalogIds,
    catalogDefaultPriceGroupId: input.context.catalog.defaultPriceGroupId,
    priceGroups: input.context.priceGroups,
    sourcePriceCurrencyCode: input.context.sourcePriceCurrencyCode,
    template: input.context.draftTemplate,
    templateCategoryAliases: input.context.draftTemplateCategoryAliases,
  });
  const updated = await productService.updateProduct(
    input.existing.id,
    payload,
    input.context.productServiceOptions
  );
  await linkPersistedScrapedProduct(updated.id, input.candidate);
  return createOutcome(
    toResultProduct(input.draft, input.candidate, 'updated', {
      productId: updated.id,
      title: resolveResultPayloadTitle(payload, input.candidate),
    }),
    { updatedCount: 1 }
  );
};

const processNewScrapeCandidate = async (input: {
  candidate: ProductScrapeCandidate;
  context: ProductScrapeRunContext;
  draft: ScripterImportDraft;
  imagePayload: Awaited<ReturnType<typeof resolveScrapeImagePayload>>;
}): Promise<ProductScrapeDraftOutcome> => {
  const payload = buildCreatePayload({
    candidate: input.candidate,
    draft: input.draft,
    imagePayload: input.imagePayload,
    profile: input.context.profile,
    catalogIds: mergeTemplateCatalogIds([input.context.catalog.id], input.context.draftTemplate),
    catalogDefaultPriceGroupId: input.context.catalog.defaultPriceGroupId,
    priceGroups: input.context.priceGroups,
    sourcePriceCurrencyCode: input.context.sourcePriceCurrencyCode,
    template: input.context.draftTemplate,
    templateCategoryAliases: input.context.draftTemplateCategoryAliases,
  });
  const created = await productService.createProduct(payload, input.context.productServiceOptions);
  await linkPersistedScrapedProduct(created.id, input.candidate);
  return createOutcome(
    toResultProduct(input.draft, input.candidate, 'created', {
      productId: created.id,
      title: resolveResultPayloadTitle(payload, input.candidate),
    }),
    { createdCount: 1 }
  );
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
  const imagePayload = await resolveScrapeImagePayload({
    candidate,
    dryRun: context.dryRun,
    imageImportMode: context.imageImportMode,
  });
  if (existing !== null) {
    return await processExistingScrapeCandidate({
      catalogIds,
      candidate,
      context,
      draft,
      existing,
      imagePayload,
    });
  }
  return await processNewScrapeCandidate({
    candidate,
    context,
    draft,
    imagePayload,
  });
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
      imagePayload: await resolveScrapeImagePayload({
        candidate,
        dryRun: context.dryRun,
        imageImportMode: context.imageImportMode,
      }),
      profile: context.profile,
      catalogIds: mergeTemplateCatalogIds([context.catalog.id], context.draftTemplate),
      catalogDefaultPriceGroupId: context.catalog.defaultPriceGroupId,
      priceGroups: context.priceGroups,
      sourcePriceCurrencyCode: context.sourcePriceCurrencyCode,
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
    await runContext.waitWhilePaused?.();
    outcomes.push(await processScrapeDraft(draft, runContext));
    return outcomes;
	  }, Promise.resolve([]));
	};
