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
import { PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_KEY } from '@/shared/lib/browser-execution/product-scrape-runtime-constants';
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

const resolveBrowserMode = (
  headless: boolean | null
): NonNullable<ProductScrapeProfileRunResponse['runtime']>['browserMode'] => {
  if (headless === null) return 'runtime_default';
  return headless ? 'headless' : 'headed';
};

const buildRuntimeMetadata = (
  action: PlaywrightAction,
  queueName: string | null | undefined
): NonNullable<ProductScrapeProfileRunResponse['runtime']> => ({
  queueName: queueName ?? null,
  runtimeActionId: action.id,
  runtimeActionName: action.name,
  runtimeActionKey: action.runtimeKey ?? '',
  browserMode: resolveBrowserMode(action.executionSettings.headless),
  enabledStepCount: action.blocks.filter((block) => block.enabled !== false).length,
  totalStepCount: action.blocks.length,
});

const runProfileScripterDryRun = async ({
  catalogId,
  executionSettings,
  input,
  profile,
}: {
  catalogId: string;
  executionSettings: PlaywrightActionExecutionSettings;
  input: ProductScrapeProfileRunRequest;
  profile: ProductScrapeProfileConfig;
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
    },
  });

export const listProductScrapeProfiles = (): ProductScrapeProfilesListResponse => ({
  profiles: PRODUCT_SCRAPE_PROFILES.map(toPublicProfile),
});

export const runProductScrapeProfile = async (
  input: ProductScrapeProfileRunRequest,
  options: { userId?: string | null; runtimeQueueName?: string | null } = {}
): Promise<ProductScrapeProfileRunResponse> => {
  const profile = findProfile(input.profileId);
  const dryRun = input.dryRun ?? false;
  await ensureScripterProfileFile(profile);
  const runtimeAction = await resolveRuntimeActionDefinition(profile.runtimeActionKey);

  const catalog = await ensureCatalog(profile.targetCatalogName);
  const draftTemplate = await resolveScrapeDraftTemplate(profile, input.draftTemplateId);
  const draftTemplateCategoryAliases = await resolveDraftTemplateCategoryAliases(draftTemplate);
  const priceGroups = await loadScrapePriceGroups(catalog, draftTemplate);
  const sourcePriceCurrencyCode = resolveSourcePriceCurrencyCode(profile, input.sourcePriceCurrencyCode);
  const source = await runProfileScripterDryRun({
    catalogId: catalog.id,
    executionSettings: runtimeAction.executionSettings,
    input,
    profile,
  });
  const outcomes = await processScrapeDrafts(source.drafts, {
    profile,
    catalog,
    dryRun,
    imageImportMode: input.imageImportMode ?? 'links',
    skipRecordsWithErrors: input.skipRecordsWithErrors ?? true,
    productServiceOptions: resolveProductServiceOptions(options.userId),
    priceGroups,
    sourcePriceCurrencyCode,
    draftTemplate,
    draftTemplateCategoryAliases,
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
    runtime: buildRuntimeMetadata(runtimeAction, options.runtimeQueueName),
    summary: {
      rawCount: source.summary.rawCount,
      mappedCount: source.summary.mappedCount,
      recordsWithErrors: source.summary.recordsWithErrors,
      recordsWithWarnings: source.summary.recordsWithWarnings,
      totalIssues: source.summary.totalIssues,
    },
  };
};
