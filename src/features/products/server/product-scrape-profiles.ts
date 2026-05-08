/* eslint-disable max-lines */
import 'server-only';

import {
  getDefaultScripterRegistry,
  getDefaultScripterServer,
  type ScripterImportSourceResult,
} from '@/features/playwright/scripters/public';
import { getDraft } from '@/features/drafter/services/draft-service';
import { CachedProductService } from '@/features/products/performance/cached-service';
import type {
  ProductScrapeProfile,
  ProductScrapeSourcePriceCurrencyCode,
  ProductScrapeProfileRunRequest,
  ProductScrapeProfileRunResponse,
  ProductScrapeProfilesListResponse,
} from '@/shared/contracts/products/scrape-profiles';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type {
  PlaywrightAction,
  PlaywrightActionExecutionSettings,
} from '@/shared/contracts/playwright-steps';
import { badRequestError, configurationError, notFoundError } from '@/shared/errors/app-error';
import {
  PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_KEY,
  PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS,
} from '@/shared/lib/browser-execution/product-scrape-runtime-constants';
import { resolveRuntimeActionDefinition } from '@/shared/lib/browser-execution/runtime-action-resolver.server';
import { getCategoryRepository } from '@/shared/lib/products/services/category-repository';
import { getCatalogRepository } from '@/shared/lib/products/services/catalog-repository';
import { resolveLocalizedCategoryName } from '@/shared/lib/products/title-terms';

import {
  processScrapeDrafts,
  type ProductScrapeProfileConfig,
} from './product-scrape-profiles.helpers';
import { summarizeOutcomes } from './product-scrape-profiles.outcomes';
import { listScrapePriceGroupsForCalculation } from './product-scrape-pricing';
import { buildRuntimeMetadata } from './product-scrape-profiles.runtime';
import { loadScrapeTemplateLinkedParameterMetadata } from './product-scrape-template-linked-parameters';
import type { ProductScrapeImageStepControls } from './product-scrape-profile-image-step-controls';

const BATTLESTOCK_CATALOG_NAME = 'BattleStock';

const PRODUCT_SCRAPE_PROFILES: ProductScrapeProfileConfig[] = [
  {
    id: 'battlestock-warhammer-40k-30k',
    label: 'BattleStock Warhammer 40k / 30k',
    description: 'Products from the BattleStock Warhammer 40k / 30k category.',
    siteHost: 'www.battle-stock.pl',
    sourceUrl: 'https://www.battle-stock.pl/pl/c/Warhammer-40k-30k/45',
    scripterId: 'battlestock-warhammer-40k-30k',
    runtimeActionKey: PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_KEY,
    targetCatalogName: BATTLESTOCK_CATALOG_NAME,
    defaultLimit: null,
    maxPages: 75,
    defaultSourcePriceCurrencyCode: 'PLN',
    sourcePriceCurrencyCodes: ['PLN', 'EUR', 'USD', 'GBP', 'SEK'],
    skuPrefix: 'BATTLESTOCK-',
    supplierName: BATTLESTOCK_CATALOG_NAME,
    priceComment: 'Scraped from BattleStock',
  },
];

const toPublicProfile = (profile: ProductScrapeProfileConfig): ProductScrapeProfile => ({
  id: profile.id,
  label: profile.label,
  description: profile.description,
  siteHost: profile.siteHost,
  sourceUrl: profile.sourceUrl,
  scripterId: profile.scripterId,
  runtimeActionKey: profile.runtimeActionKey,
  targetCatalogName: profile.targetCatalogName,
  defaultLimit: profile.defaultLimit,
  maxPages: profile.maxPages,
  defaultSourcePriceCurrencyCode: profile.defaultSourcePriceCurrencyCode,
  sourcePriceCurrencyCodes: profile.sourcePriceCurrencyCodes,
});

const findProfile = (profileId: string): ProductScrapeProfileConfig => {
  const profile = PRODUCT_SCRAPE_PROFILES.find((entry) => entry.id === profileId);
  if (profile === undefined) {
    throw notFoundError(`Scrape profile not found: ${profileId}`, { profileId });
  }
  return profile;
};

const ensureScripterProfileFile = async (profile: ProductScrapeProfileConfig): Promise<void> => {
  const definition = await getDefaultScripterRegistry().get(profile.scripterId);
  if (definition === null) {
    throw configurationError(`Scripter definition not found: ${profile.scripterId}`, {
      scripterId: profile.scripterId,
    });
  }
};

const ensureCatalog = async (name: string): Promise<CatalogRecord> => {
  const repository = await getCatalogRepository();
  const catalogs = await repository.listCatalogs();
  const existing = catalogs.find(
    (catalog) => catalog.name.trim().toLowerCase() === name.trim().toLowerCase()
  );
  if (existing !== undefined) return existing;
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

const resolveScrapeDraftTemplate = async (
  profile: ProductScrapeProfileConfig,
  draftTemplateId: string | undefined
): Promise<ProductDraft | null> => {
  if (draftTemplateId === undefined) return null;
  const template = await getDraft(draftTemplateId);
  if (template === null) {
    throw notFoundError(`Draft template not found: ${draftTemplateId}`, { draftTemplateId });
  }
  if (template.draftKind !== 'scrape_template') {
    throw badRequestError('Selected draft is not a scrape template.', {
      draftTemplateId,
      draftKind: template.draftKind ?? 'standard',
    });
  }
  if (
    typeof template.scrapeProfileId === 'string' &&
    template.scrapeProfileId.trim().length > 0 &&
    template.scrapeProfileId !== profile.id
  ) {
    throw badRequestError('Selected draft template is assigned to another scrape profile.', {
      draftTemplateId,
      scrapeProfileId: template.scrapeProfileId,
      profileId: profile.id,
    });
  }
  return template;
};

const normalizeTemplateCategoryAlias = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized.length > 0 ? normalized : null;
};

const resolveTemplateCategoryAliases = (
  category: Pick<ProductCategory, 'name' | 'name_en' | 'name_pl' | 'name_de'>
): string[] =>
  Array.from(
    new Set(
      [
        resolveLocalizedCategoryName(category, 'en'),
        category.name,
        category.name_en,
        category.name_pl,
        category.name_de,
      ]
        .map(normalizeTemplateCategoryAlias)
        .filter((value): value is string => value !== null)
    )
  );

const resolveDraftTemplateCategoryAliases = async (
  template: ProductDraft | null
): Promise<string[]> => {
  if (
    template === null ||
    typeof template.name_en !== 'string' ||
    template.name_en.trim().length === 0 ||
    typeof template.categoryId !== 'string' ||
    template.categoryId.trim().length === 0
  ) {
    return [];
  }

  const categoryRepository = await getCategoryRepository();
  const category = await categoryRepository.getCategoryById(template.categoryId.trim());
  return category === null ? [] : resolveTemplateCategoryAliases(category);
};

const resolveProductServiceOptions = (
  userId: string | null | undefined
): { userId?: string } | undefined => {
  if (typeof userId !== 'string' || userId.trim().length === 0) return undefined;
  return { userId };
};

const hasTemplateNumber = (value: number | null | undefined): boolean =>
  typeof value === 'number' && Number.isFinite(value);

const hasPricingDefault = (value: string | null | undefined): boolean =>
  typeof value === 'string' && value.trim().length > 0;

const shouldLoadPriceGroupsForScrape = (
  catalog: CatalogRecord,
  draftTemplate: ProductDraft | null
): boolean => {
  if (hasTemplateNumber(draftTemplate?.price)) return false;
  return (
    hasPricingDefault(draftTemplate?.defaultPriceGroupId) ||
    hasPricingDefault(catalog.defaultPriceGroupId)
  );
};

const loadScrapePriceGroups = async (
  catalog: CatalogRecord,
  draftTemplate: ProductDraft | null
): Promise<Awaited<ReturnType<typeof listScrapePriceGroupsForCalculation>>> => {
  if (!shouldLoadPriceGroupsForScrape(catalog, draftTemplate)) return [];
  return await listScrapePriceGroupsForCalculation();
};

const resolveSourcePriceCurrencyCode = (
  profile: ProductScrapeProfileConfig,
  inputCurrencyCode: ProductScrapeSourcePriceCurrencyCode | undefined
): string =>
  inputCurrencyCode ??
  profile.defaultSourcePriceCurrencyCode ??
  profile.sourcePriceCurrencyCodes?.[0] ??
  'PLN';

const shouldInvalidateProductCache = (
  dryRun: boolean,
  counts: { createdCount: number; updatedCount: number }
): boolean => {
  if (dryRun) return false;
  return counts.createdCount > 0 || counts.updatedCount > 0;
};

const isRuntimeActionStepEnabled = (action: PlaywrightAction, stepId: string): boolean => {
  const matchingBlocks = action.blocks.filter(
    (block) => block.kind === 'runtime_step' && block.refId === stepId
  );
  if (matchingBlocks.length === 0) return true;
  return matchingBlocks.some((block) => block.enabled !== false);
};

const resolveProductScrapeImageStepControls = (
  action: PlaywrightAction
): ProductScrapeImageStepControls => ({
  applyImagePayload: isRuntimeActionStepEnabled(
    action,
    PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS.applyImagePayload
  ),
  collectProductGalleryImages: isRuntimeActionStepEnabled(
    action,
    PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS.collectProductGalleryImages
  ),
  collectScrapedImageLinks: isRuntimeActionStepEnabled(
    action,
    PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS.collectScrapedImageLinks
  ),
  downloadProductGalleryImages: isRuntimeActionStepEnabled(
    action,
    PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS.downloadProductGalleryImages
  ),
  downloadScrapedImages: isRuntimeActionStepEnabled(
    action,
    PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS.downloadScrapedImages
  ),
  uploadProductImages: isRuntimeActionStepEnabled(
    action,
    PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS.uploadProductImages
  ),
});

const runProfileScripterDryRun = async ({
  catalogId,
  executionSettings,
  input,
  profile,
  waitWhilePaused,
}: {
  catalogId: string;
  executionSettings: PlaywrightActionExecutionSettings;
  input: ProductScrapeProfileRunRequest;
  profile: ProductScrapeProfileConfig;
  waitWhilePaused?: () => Promise<void>;
}): Promise<ScripterImportSourceResult> =>
  await getDefaultScripterServer().dryRun({
    scripterId: profile.scripterId,
    enforceRobots: false,
    runtimeActionKey: profile.runtimeActionKey,
    executionSettings,
    options: {
      limit: input.limit,
      skipRecordsWithErrors: false,
      catalogDefaults: { catalogIds: [catalogId] },
      waitWhilePaused,
    },
  });

export const listProductScrapeProfiles = (): ProductScrapeProfilesListResponse => ({
  profiles: PRODUCT_SCRAPE_PROFILES.map(toPublicProfile),
});

/* eslint-disable complexity, max-lines-per-function */
export const runProductScrapeProfile = async (
  input: ProductScrapeProfileRunRequest,
  options: {
    userId?: string | null;
    runtimeQueueName?: string | null;
    waitWhilePaused?: () => Promise<void>;
  } = {}
): Promise<ProductScrapeProfileRunResponse> => {
  const profile = findProfile(input.profileId);
  const dryRun = input.dryRun ?? false;
  await options.waitWhilePaused?.();
  await ensureScripterProfileFile(profile);
  const runtimeAction = await resolveRuntimeActionDefinition(profile.runtimeActionKey);

  const catalog = await ensureCatalog(profile.targetCatalogName);
  const draftTemplate = await resolveScrapeDraftTemplate(profile, input.draftTemplateId);
  const draftTemplateCategoryAliases = await resolveDraftTemplateCategoryAliases(draftTemplate);
  const draftTemplateLinkedParameterMetadata =
    draftTemplate === null ? null : await loadScrapeTemplateLinkedParameterMetadata();
  const priceGroups = await loadScrapePriceGroups(catalog, draftTemplate);
  const sourcePriceCurrencyCode = resolveSourcePriceCurrencyCode(profile, input.sourcePriceCurrencyCode);
  await options.waitWhilePaused?.();
  const source = await runProfileScripterDryRun({
    catalogId: catalog.id,
    executionSettings: runtimeAction.executionSettings,
    input,
    profile,
    waitWhilePaused: options.waitWhilePaused,
  });
  await options.waitWhilePaused?.();
  const outcomes = await processScrapeDrafts(source.drafts, {
    profile,
    catalog,
    dryRun,
    imageImportMode: input.imageImportMode ?? 'links',
    imageStepControls: resolveProductScrapeImageStepControls(runtimeAction),
    skipRecordsWithErrors: input.skipRecordsWithErrors ?? true,
    productServiceOptions: resolveProductServiceOptions(options.userId),
    priceGroups,
    sourcePriceCurrencyCode,
    draftTemplate,
    draftTemplateCategoryAliases,
    draftTemplateLinkedParameterMetadata,
    waitWhilePaused: options.waitWhilePaused,
  });
  const outcomeSummary = summarizeOutcomes(outcomes);

  if (shouldInvalidateProductCache(dryRun, outcomeSummary)) {
    CachedProductService.invalidateAll();
  }

  return {
    profileId: profile.id,
    profileLabel: profile.label,
    dryRun,
    catalog: { id: catalog.id, name: catalog.name },
    scrapedCount: source.drafts.length,
    createdCount: outcomeSummary.createdCount,
    updatedCount: outcomeSummary.updatedCount,
    skippedCount: outcomeSummary.skippedCount,
    failedCount: outcomeSummary.failedCount,
    issueCount: source.summary.totalIssues,
    products: outcomeSummary.products,
    runtime: buildRuntimeMetadata(runtimeAction, {
      queueName: options.runtimeQueueName,
      runtimeActionKey: profile.runtimeActionKey,
    }),
    summary: {
      rawCount: source.summary.rawCount,
      mappedCount: source.summary.mappedCount,
      recordsWithErrors: source.summary.recordsWithErrors,
      recordsWithWarnings: source.summary.recordsWithWarnings,
      totalIssues: source.summary.totalIssues,
    },
  };
};
/* eslint-enable complexity, max-lines-per-function */
