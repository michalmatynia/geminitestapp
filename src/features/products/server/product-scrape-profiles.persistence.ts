import 'server-only';

import type { ScripterImportDraft } from '@/features/playwright/scripters';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { productService } from '@/shared/lib/products/services/productService';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { throwIfProductScrapeAborted } from './product-scrape-profile-abort';
import { resolveScrapeImagePayload } from './product-scrape-profile-images';
import {
  buildCreatePayload,
  buildUpdatePayload,
  resolveResultPayloadTitle,
} from './product-scrape-profiles.payloads';
import type { ProductScrapeCandidate } from './product-scrape-profiles.candidates';
import {
  createOutcome,
  toResultProduct,
  type ProductScrapeDraftOutcome,
} from './product-scrape-profiles.outcomes';
import type { ProductScrapeRunContext } from './product-scrape-profiles.run-context';
import { ensureScrapedSourceListing } from './product-scraped-source-common';

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
  context: ProductScrapeRunContext
): string[] => {
  const ids = new Set(catalogIds);
  (context.draftTemplate?.catalogIds ?? []).forEach((catalogId) => {
    if (catalogId.trim().length > 0) ids.add(catalogId);
  });
  return Array.from(ids);
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

const resolveCreatePayloadInput = (
  draft: ScripterImportDraft,
  candidate: ProductScrapeCandidate,
  context: ProductScrapeRunContext,
  imagePayload: Awaited<ReturnType<typeof resolveScrapeImagePayload>>
): Parameters<typeof buildCreatePayload>[0] => ({
  candidate,
  draft,
  imagePayload,
  profile: context.profile,
  catalogIds: mergeTemplateCatalogIds([context.catalog.id], context),
  catalogDefaultPriceGroupId: context.catalog.defaultPriceGroupId,
  priceGroups: context.priceGroups,
  sourcePriceCurrencyCode: context.sourcePriceCurrencyCode,
  template: context.draftTemplate,
  templateCategoryAliases: context.draftTemplateCategoryAliases,
  templateLinkedParameterMetadata: context.draftTemplateLinkedParameterMetadata,
});

export const createDryRunScrapeOutcome = async (
  draft: ScripterImportDraft,
  candidate: ProductScrapeCandidate,
  context: ProductScrapeRunContext
): Promise<ProductScrapeDraftOutcome> => {
  const imagePayload = await resolveScrapeImagePayload({
    candidate,
    dryRun: context.dryRun,
    imageImportMode: context.imageImportMode,
    imageStepControls: context.imageStepControls,
    signal: context.signal,
  });
  const payload = buildCreatePayload(
    resolveCreatePayloadInput(draft, candidate, context, imagePayload)
  );
  return createOutcome(
    toResultProduct(draft, candidate, 'dry_run', {
      title: resolveResultPayloadTitle(payload, candidate),
    })
  );
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
  const payload = buildCreatePayload(
    resolveCreatePayloadInput(input.draft, input.candidate, input.context, input.imagePayload)
  );
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
  return await resolveScrapeImagePayload({
    candidate,
    dryRun: context.dryRun,
    imageImportMode: context.imageImportMode,
    imageStepControls: context.imageStepControls,
    reportProgress: context.reportProgress,
    signal: context.signal,
  });
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
    await reportCandidateProgress(context, 'product_updating', `Updating scraped product ${candidate.sku}.`);
    return await processExistingScrapeCandidate({
      catalogIds: mergeTemplateCatalogIds(existingCatalogIds(existing, context.catalog.id), context),
      candidate,
      context,
      draft,
      existing,
      imagePayload,
    });
  }
  await reportCandidateProgress(context, 'product_creating', `Creating scraped product ${candidate.sku}.`);
  return await processNewScrapeCandidate({ candidate, context, draft, imagePayload });
};

export const processPersistedCandidate = async (
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
