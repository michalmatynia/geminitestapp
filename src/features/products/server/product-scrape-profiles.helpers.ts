/* eslint-disable max-lines */
import 'server-only';

import type { ScripterImportDraft } from '@/features/playwright/scripters';
import type {
  ProductScrapeProfileImageImportMode,
  ProductScrapeProfileRuntimeProgressUpdate,
} from '@/shared/contracts/products/scrape-profiles';
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
import type { ScrapeTemplateLinkedParameterMetadata } from './product-scrape-template-linked-parameters';
import { throwIfProductScrapeAborted } from './product-scrape-profile-abort';
import { resolveScrapeImagePayload } from './product-scrape-profile-images';
import type { ProductScrapeImageStepControls } from './product-scrape-profile-image-step-controls';
import {
  createOutcome,
  toResultProduct,
  type ProductScrapeDraftOutcome,
} from './product-scrape-profiles.outcomes';
import { ensureScrapedSourceListing } from './product-scraped-source-common';

export type { ProductScrapeProfileConfig } from './product-scrape-profiles.candidates';

type ProductScrapeDuplicateState = { seenKeys: Set<string> };
type ProductScrapeProfileProgressReporter = (
  progress: ProductScrapeProfileRuntimeProgressUpdate
) => Promise<void>;
type ProductScrapeRunContext = {
  profile: ProductScrapeProfileConfig;
  catalog: CatalogRecord;
  dryRun: boolean;
  imageImportMode: ProductScrapeProfileImageImportMode;
  imageStepControls: ProductScrapeImageStepControls;
  skipRecordsWithErrors: boolean;
  productServiceOptions: { userId?: string } | undefined;
  priceGroups: PriceGroupForCalculation[];
  sourcePriceCurrencyCode: string;
  duplicateState?: ProductScrapeDuplicateState;
  draftTemplate?: ProductDraft | null;
  draftTemplateCategoryAliases?: readonly string[];
  draftTemplateLinkedParameterMetadata?: ScrapeTemplateLinkedParameterMetadata | null;
  reportProgress?: ProductScrapeProfileProgressReporter;
  signal?: AbortSignal;
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
  throwIfProductScrapeAborted(input.context.signal);
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
    templateLinkedParameterMetadata: input.context.draftTemplateLinkedParameterMetadata,
  });
  const updated = await productService.updateProduct(
    input.existing.id,
    payload,
    input.context.productServiceOptions
  );
  throwIfProductScrapeAborted(input.context.signal);
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
  throwIfProductScrapeAborted(input.context.signal);
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
    templateLinkedParameterMetadata: input.context.draftTemplateLinkedParameterMetadata,
  });
  const created = await productService.createProduct(payload, input.context.productServiceOptions);
  throwIfProductScrapeAborted(input.context.signal);
  await linkPersistedScrapedProduct(created.id, input.candidate);
  return createOutcome(
    toResultProduct(input.draft, input.candidate, 'created', {
      productId: created.id,
      title: resolveResultPayloadTitle(payload, input.candidate),
    }),
    { createdCount: 1 }
  );
};

const findExistingScrapeProduct = async (
  candidate: ProductScrapeCandidate,
  context: ProductScrapeRunContext
): Promise<ProductWithImages | null> => {
  throwIfProductScrapeAborted(context.signal);
  await reportCandidateProgress(
    context,
    'product_lookup_sku',
    `Checking existing product by SKU ${candidate.sku}.`
  );
  const existingBySku = await productService.getProductBySku(candidate.sku);
  throwIfProductScrapeAborted(context.signal);
  await reportCandidateProgress(
    context,
    'product_lookup_supplier_link',
    `Checking existing product by supplier link for ${candidate.sku}.`
  );
  const existing =
    existingBySku ?? (await productService.findProductBySupplierLink(candidate.sourceUrl));
  throwIfProductScrapeAborted(context.signal);
  return existing;
};

const resolvePersistedCandidateImagePayload = async (
  candidate: ProductScrapeCandidate,
  context: ProductScrapeRunContext
): Promise<Awaited<ReturnType<typeof resolveScrapeImagePayload>>> => {
  await reportCandidateProgress(
    context,
    'image_payload_resolving',
    `Resolving image payload for ${candidate.sku}.`
  );
  const imagePayload = await resolveScrapeImagePayload({
    candidate,
    dryRun: context.dryRun,
    imageImportMode: context.imageImportMode,
    imageStepControls: context.imageStepControls,
    reportProgress: context.reportProgress,
    signal: context.signal,
  });
  return imagePayload;
};

const processResolvedPersistedCandidate = async (input: {
  candidate: ProductScrapeCandidate;
  context: ProductScrapeRunContext;
  draft: ScripterImportDraft;
  existing: ProductWithImages | null;
  imagePayload: Awaited<ReturnType<typeof resolveScrapeImagePayload>>;
}): Promise<ProductScrapeDraftOutcome> => {
  const { candidate, context, draft, existing, imagePayload } = input;
  throwIfProductScrapeAborted(context.signal);
  if (existing !== null) {
    await reportCandidateProgress(
      context,
      'product_updating',
      `Updating scraped product ${candidate.sku}.`
    );
    const catalogIds = mergeTemplateCatalogIds(
      existingCatalogIds(existing, context.catalog.id),
      context.draftTemplate
    );
    return await processExistingScrapeCandidate({
      catalogIds,
      candidate,
      context,
      draft,
      existing,
      imagePayload,
    });
  }
  await reportCandidateProgress(
    context,
    'product_creating',
    `Creating scraped product ${candidate.sku}.`
  );
  return await processNewScrapeCandidate({
    candidate,
    context,
    draft,
    imagePayload,
  });
};

const processPersistedCandidate = async (
  draft: ScripterImportDraft,
  candidate: ProductScrapeCandidate,
  context: ProductScrapeRunContext
): Promise<ProductScrapeDraftOutcome> => {
  const existing = await findExistingScrapeProduct(candidate, context);
  const imagePayload = await resolvePersistedCandidateImagePayload(candidate, context);
  return await processResolvedPersistedCandidate({
    candidate,
    context,
    draft,
    existing,
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
        imageStepControls: context.imageStepControls,
        signal: context.signal,
      }),
      profile: context.profile,
      catalogIds: mergeTemplateCatalogIds([context.catalog.id], context.draftTemplate),
      catalogDefaultPriceGroupId: context.catalog.defaultPriceGroupId,
      priceGroups: context.priceGroups,
      sourcePriceCurrencyCode: context.sourcePriceCurrencyCode,
      template: context.draftTemplate,
      templateCategoryAliases: context.draftTemplateCategoryAliases,
      templateLinkedParameterMetadata: context.draftTemplateLinkedParameterMetadata,
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
    throwIfProductScrapeAborted(context.signal);
    return createOutcome(
      toResultProduct(draft, candidate, 'failed', {
        error: error instanceof Error ? error.message : String(error),
      }),
      { failedCount: 1 }
    );
  }
};

const reportImportProgress = async (
  context: ProductScrapeRunContext,
  current: number,
  total: number
): Promise<void> => {
  await context.reportProgress?.({
    current,
    message: `Processed ${current} of ${total} scraped product record(s).`,
    stage: 'importing_products',
    total,
  });
};

const reportCandidateProgress = async (
  context: ProductScrapeRunContext,
  stage: string,
  message: string
): Promise<void> => {
  await context.reportProgress?.({
    current: null,
    message,
    stage,
    total: null,
  });
};

export const processScrapeDraft = async (
  draft: ScripterImportDraft,
  context: ProductScrapeRunContext
): Promise<ProductScrapeDraftOutcome> => {
  throwIfProductScrapeAborted(context.signal);
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
    throwIfProductScrapeAborted(runContext.signal);
    outcomes.push(await processScrapeDraft(draft, runContext));
    await reportImportProgress(runContext, outcomes.length, drafts.length);
    throwIfProductScrapeAborted(runContext.signal);
    return outcomes;
  }, Promise.resolve([]));
};
