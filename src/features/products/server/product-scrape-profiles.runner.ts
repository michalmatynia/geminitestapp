import 'server-only';

import {
  getDefaultScripterServer,
  type ScripterImportSourceResult,
} from '@/features/playwright/scripters/public';
import { CachedProductService } from '@/features/products/performance/cached-service';
import type {
  ProductScrapeProfileRunRequest,
  ProductScrapeProfileRunResponse,
} from '@/shared/contracts/products/scrape-profiles';
import type { PlaywrightActionExecutionSettings } from '@/shared/contracts/playwright-steps';

import { processScrapeDrafts } from './product-scrape-profiles.helpers';
import { summarizeOutcomes } from './product-scrape-profiles.outcomes';
import { buildRuntimeMetadata } from './product-scrape-profiles.runtime';
import { throwIfProductScrapeAborted } from './product-scrape-profile-abort';
import { prepareProductScrapeRun } from './product-scrape-profiles.runner-prepare';
import {
  pauseAndThrowIfAborted,
  reportScrapeProgress,
  resolveProductServiceOptions,
  shouldInvalidateProductCache,
} from './product-scrape-profiles.runner-utils';
import type {
  PreparedProductScrapeRun,
  ProductScrapeProfileRunOptions,
} from './product-scrape-profiles.runner-types';

type ProductScrapeOutcomeSummary = ReturnType<typeof summarizeOutcomes>;

const runProfileScripterDryRun = async ({
  catalogId,
  executionSettings,
  input,
  prepared,
  options,
}: {
  catalogId: string;
  executionSettings: PlaywrightActionExecutionSettings;
  input: ProductScrapeProfileRunRequest;
  prepared: PreparedProductScrapeRun;
  options: ProductScrapeProfileRunOptions;
}): Promise<ScripterImportSourceResult> =>
  await getDefaultScripterServer().dryRun({
    scripterId: prepared.profile.scripterId,
    enforceRobots: false,
    runtimeActionKey: prepared.profile.runtimeActionKey,
    executionSettings,
    options: {
      limit: input.limit,
      skipRecordsWithErrors: false,
      catalogDefaults: { catalogIds: [catalogId] },
      signal: options.signal,
      waitWhilePaused: options.waitWhilePaused,
    },
  });

const runScrapeSource = async (
  prepared: PreparedProductScrapeRun,
  input: ProductScrapeProfileRunRequest,
  options: ProductScrapeProfileRunOptions
): Promise<ScripterImportSourceResult> => {
  await pauseAndThrowIfAborted(options);
  await reportScrapeProgress(options.reportProgress, {
    message: `Running Playwright action ${prepared.runtimeAction.name}.`,
    stage: 'scrape_starting',
  });
  return await runProfileScripterDryRun({
    catalogId: prepared.catalog.id,
    executionSettings: prepared.runtimeAction.executionSettings,
    input,
    options,
    prepared,
  });
};

const processScrapedSource = async (
  prepared: PreparedProductScrapeRun,
  source: ScripterImportSourceResult,
  input: ProductScrapeProfileRunRequest,
  options: ProductScrapeProfileRunOptions
): Promise<ProductScrapeOutcomeSummary> => {
  await pauseAndThrowIfAborted(options);
  await reportScrapeProgress(options.reportProgress, {
    current: 0,
    message: `Scraped ${source.drafts.length} product record(s).`,
    stage: 'scrape_completed',
    total: source.drafts.length,
  });
  await reportScrapeProgress(options.reportProgress, {
    current: 0,
    message: prepared.dryRun ? 'Mapping scraped records.' : 'Importing scraped products.',
    stage: 'import_starting',
    total: source.drafts.length,
  });
  const outcomes = await processScrapeDrafts(source.drafts, {
    profile: prepared.profile,
    catalog: prepared.catalog,
    dryRun: prepared.dryRun,
    imageImportMode: prepared.imageImportMode,
    imageStepControls: prepared.imageStepControls,
    skipRecordsWithErrors: input.skipRecordsWithErrors ?? true,
    productServiceOptions: resolveProductServiceOptions(options.userId),
    priceGroups: prepared.priceGroups,
    sourcePriceCurrencyCode: prepared.sourcePriceCurrencyCode,
    draftTemplate: prepared.draftTemplate,
    draftTemplateCategoryAliases: prepared.draftTemplateCategoryAliases,
    draftTemplateLinkedParameterMetadata: prepared.draftTemplateLinkedParameterMetadata,
    reportProgress: options.reportProgress,
    signal: options.signal,
    waitWhilePaused: options.waitWhilePaused,
  });
  throwIfProductScrapeAborted(options.signal);
  return summarizeOutcomes(outcomes);
};

const reportImportCompleted = async (
  outcomeSummary: ProductScrapeOutcomeSummary,
  source: ScripterImportSourceResult,
  options: ProductScrapeProfileRunOptions
): Promise<void> => {
  await reportScrapeProgress(options.reportProgress, {
    current: source.drafts.length,
    message: `Imported ${outcomeSummary.createdCount} and updated ${outcomeSummary.updatedCount} product(s).`,
    stage: 'import_completed',
    total: source.drafts.length,
  });
};

const buildRunResponse = (
  prepared: PreparedProductScrapeRun,
  source: ScripterImportSourceResult,
  outcomeSummary: ProductScrapeOutcomeSummary,
  queueName: string | null | undefined
): ProductScrapeProfileRunResponse => ({
  profileId: prepared.profile.id,
  profileLabel: prepared.profile.label,
  dryRun: prepared.dryRun,
  catalog: { id: prepared.catalog.id, name: prepared.catalog.name },
  scrapedCount: source.drafts.length,
  createdCount: outcomeSummary.createdCount,
  updatedCount: outcomeSummary.updatedCount,
  skippedCount: outcomeSummary.skippedCount,
  failedCount: outcomeSummary.failedCount,
  issueCount: source.summary.totalIssues,
  products: outcomeSummary.products,
  runtime: buildRuntimeMetadata(prepared.runtimeAction, {
    imageImportMode: prepared.imageImportMode,
    imageStepControls: prepared.imageStepControls,
    queueName,
    runtimeActionKey: prepared.profile.runtimeActionKey,
  }),
  summary: source.summary,
});

export const runProductScrapeProfile = async (
  input: ProductScrapeProfileRunRequest,
  options: ProductScrapeProfileRunOptions = {}
): Promise<ProductScrapeProfileRunResponse> => {
  const prepared = await prepareProductScrapeRun(input, options);
  const source = await runScrapeSource(prepared, input, options);
  const outcomeSummary = await processScrapedSource(prepared, source, input, options);
  await reportImportCompleted(outcomeSummary, source, options);

  if (shouldInvalidateProductCache(prepared.dryRun, outcomeSummary)) {
    CachedProductService.invalidateAll();
  }

  return buildRunResponse(prepared, source, outcomeSummary, options.runtimeQueueName);
};
