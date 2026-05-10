import 'server-only';

import { getDefaultScripterRegistry } from '@/features/playwright/scripters/public';
import { getDraft } from '@/features/drafter/services/draft-service';
import type {
  ProductScrapeSourcePriceCurrencyCode,
  ProductScrapeProfileRunRequest,
} from '@/shared/contracts/products/scrape-profiles';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';
import { badRequestError, configurationError, notFoundError } from '@/shared/errors/app-error';
import { PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS } from '@/shared/lib/browser-execution/product-scrape-runtime-constants';
import { resolveRuntimeActionDefinition } from '@/shared/lib/browser-execution/runtime-action-resolver.server';
import { getCategoryRepository } from '@/shared/lib/products/services/category-repository';
import { getCatalogRepository } from '@/shared/lib/products/services/catalog-repository';
import { resolveLocalizedCategoryName } from '@/shared/lib/products/title-terms';

import { listScrapePriceGroupsForCalculation } from './product-scrape-pricing';
import { loadScrapeTemplateLinkedParameterMetadata } from './product-scrape-template-linked-parameters';
import { findProductScrapeProfile } from './product-scrape-profiles.registry';
import type { ProductScrapeProfileConfig } from './product-scrape-profiles.candidates';
import {
  pauseAndThrowIfAborted,
  reportScrapeProgress,
} from './product-scrape-profiles.runner-utils';
import type {
  PreparedProductScrapeRun,
  ProductScrapeProfileRunOptions,
  RuntimeActionDefinition,
} from './product-scrape-profiles.runner-types';

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

const validateTemplateProfile = (
  template: ProductDraft,
  profile: ProductScrapeProfileConfig,
  draftTemplateId: string
): void => {
  if (typeof template.scrapeProfileId !== 'string') return;
  if (template.scrapeProfileId.trim().length === 0 || template.scrapeProfileId === profile.id) return;
  throw badRequestError('Selected draft template is assigned to another scrape profile.', {
    draftTemplateId,
    scrapeProfileId: template.scrapeProfileId,
    profileId: profile.id,
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
  validateTemplateProfile(template, profile, draftTemplateId);
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

const canResolveDraftTemplateCategory = (template: ProductDraft | null): template is ProductDraft & {
  categoryId: string;
  name_en: string;
} =>
  template !== null &&
  typeof template.name_en === 'string' &&
  template.name_en.trim().length > 0 &&
  typeof template.categoryId === 'string' &&
  template.categoryId.trim().length > 0;

const resolveDraftTemplateCategoryAliases = async (
  template: ProductDraft | null
): Promise<string[]> => {
  if (!canResolveDraftTemplateCategory(template)) return [];
  const categoryRepository = await getCategoryRepository();
  const category = await categoryRepository.getCategoryById(template.categoryId.trim());
  return category === null ? [] : resolveTemplateCategoryAliases(category);
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

const isRuntimeActionStepEnabled = (action: PlaywrightAction, stepId: string): boolean => {
  const matchingBlocks = action.blocks.filter(
    (block) => block.kind === 'runtime_step' && block.refId === stepId
  );
  if (matchingBlocks.length === 0) return true;
  return matchingBlocks.some((block) => block.enabled !== false);
};

const resolveProductScrapeImageStepControls = (
  action: PlaywrightAction
): PreparedProductScrapeRun['imageStepControls'] => ({
  applyImagePayload: isRuntimeActionStepEnabled(action, PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS.applyImagePayload),
  collectProductGalleryImages: isRuntimeActionStepEnabled(action, PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS.collectProductGalleryImages),
  collectScrapedImageLinks: isRuntimeActionStepEnabled(action, PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS.collectScrapedImageLinks),
  downloadProductGalleryImages: isRuntimeActionStepEnabled(action, PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS.downloadProductGalleryImages),
  downloadScrapedImages: isRuntimeActionStepEnabled(action, PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS.downloadScrapedImages),
  uploadProductImages: isRuntimeActionStepEnabled(action, PRODUCT_SCRAPE_BATTLESTOCK_RUNTIME_STEPS.uploadProductImages),
});

const loadRuntimeAction = async (
  profile: ProductScrapeProfileConfig,
  options: ProductScrapeProfileRunOptions
): Promise<RuntimeActionDefinition> => {
  await reportScrapeProgress(options.reportProgress, {
    message: 'Checking Playwright scripter definition.',
    stage: 'scripter_definition_checking',
  });
  await ensureScripterProfileFile(profile);
  await reportScrapeProgress(options.reportProgress, {
    message: 'Resolving Playwright runtime action.',
    stage: 'runtime_action_resolving',
  });
  return await resolveRuntimeActionDefinition(profile.runtimeActionKey);
};

const loadDraftTemplateBundle = async (
  profile: ProductScrapeProfileConfig,
  input: ProductScrapeProfileRunRequest,
  options: ProductScrapeProfileRunOptions
): Promise<Pick<PreparedProductScrapeRun, 'draftTemplate' | 'draftTemplateCategoryAliases' | 'draftTemplateLinkedParameterMetadata'>> => {
  await reportScrapeProgress(options.reportProgress, {
    message: 'Resolving selected scrape draft template.',
    stage: 'draft_template_resolving',
  });
  const draftTemplate = await resolveScrapeDraftTemplate(profile, input.draftTemplateId);
  await reportScrapeProgress(options.reportProgress, {
    message: 'Resolving draft template category aliases.',
    stage: 'template_category_aliases_resolving',
  });
  const draftTemplateCategoryAliases = await resolveDraftTemplateCategoryAliases(draftTemplate);
  const draftTemplateLinkedParameterMetadata =
    draftTemplate === null ? null : await loadScrapeTemplateLinkedParameterMetadata();
  return { draftTemplate, draftTemplateCategoryAliases, draftTemplateLinkedParameterMetadata };
};

export const prepareProductScrapeRun = async (
  input: ProductScrapeProfileRunRequest,
  options: ProductScrapeProfileRunOptions
): Promise<PreparedProductScrapeRun> => {
  const profile = findProductScrapeProfile(input.profileId);
  const dryRun = input.dryRun ?? false;
  await reportScrapeProgress(options.reportProgress, {
    message: `Loaded scrape profile ${profile.label}.`,
    stage: 'profile_loaded',
  });
  await pauseAndThrowIfAborted(options);
  const runtimeAction = await loadRuntimeAction(profile, options);
  await reportScrapeProgress(options.reportProgress, {
    message: `Preparing ${profile.targetCatalogName} catalog.`,
    stage: 'catalog_resolving',
  });
  const catalog = await ensureCatalog(profile.targetCatalogName);
  const templateBundle = await loadDraftTemplateBundle(profile, input, options);
  await reportScrapeProgress(options.reportProgress, {
    message: 'Loading scrape price groups.',
    stage: 'price_groups_loading',
  });
  return {
    catalog,
    dryRun,
    imageImportMode: input.imageImportMode ?? 'links',
    imageStepControls: resolveProductScrapeImageStepControls(runtimeAction),
    priceGroups: await loadScrapePriceGroups(catalog, templateBundle.draftTemplate),
    profile,
    runtimeAction,
    sourcePriceCurrencyCode: resolveSourcePriceCurrencyCode(profile, input.sourcePriceCurrencyCode),
    ...templateBundle,
  };
};
