import 'server-only';

import { logger } from '@/shared/utils/logger';
import { TRADERA_PUBLIC_CATEGORIES_URL } from '@/features/integrations/constants/tradera';
import { getIntegrationRepository } from '@/features/integrations/server';
import { type IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import { type TraderaCategoryRecord } from '@/shared/contracts/integrations/tradera';
import { AppError, AppErrorCodes } from '@/shared/errors/app-error';
import { buildResolvedActionSteps } from '@/shared/lib/browser-execution/runtime-action-resolver.server';
import { StepTracker } from '@/shared/lib/browser-execution/step-tracker';
import {
  TraderaCategorySequencer,
  type TraderaCategorySequencerResult,
} from '@/shared/lib/browser-execution/sequencers/TraderaCategorySequencer';
import { TraderaListingFormCategorySequencer } from '@/shared/lib/browser-execution/sequencers/TraderaListingFormCategorySequencer';
import type { PlaywrightSequencerContext } from '@/shared/lib/browser-execution/sequencers/PlaywrightSequencer';
import {
  createTraderaCategoryScrapePlaywrightInstance,
  createTraderaStandardListingPlaywrightInstance,
  type OpenPlaywrightConnectionNativeTaskSessionResult,
  persistPlaywrightConnectionStorageState,
  runPlaywrightConnectionNativeTask,
} from '@/features/playwright/server';
import type { TraderaSystemSettings } from '@/features/integrations/constants/tradera';
import { ensureLoggedIn } from './tradera-browser-auth';

type CategoryFetchSequencer = {
  run: () => Promise<void>;
  result: TraderaCategorySequencerResult | null;
};

type CategoryFetchResultConfig = {
  logLabel: string;
  noResultMessage: string;
  emptyMessage: string;
  recoveryAction: string;
  recoveryMessage: string;
};

type CategoryFetchEmptyAssertionInput = {
  categories: TraderaCategoryRecord[];
  connection: IntegrationConnectionRecord;
  config: CategoryFetchResultConfig;
  result: TraderaCategorySequencerResult;
};

const PUBLIC_CATEGORY_FETCH_CONFIG: CategoryFetchResultConfig = {
  logLabel: '[tradera-category-fetch]',
  noResultMessage: 'Tradera category sequencer produced no result.',
  emptyMessage:
    'Tradera categories could not be scraped from the public categories pages — the taxonomy page structure may have changed. Retry category fetch using Listing form picker if it is available for this connection.',
  recoveryAction: 'tradera_retry_alternate_category_fetch',
  recoveryMessage:
    'Retry category fetch using Listing form picker if it is available for this connection.',
};

const LISTING_FORM_CATEGORY_FETCH_CONFIG: CategoryFetchResultConfig = {
  logLabel: '[tradera-listing-form-category-fetch]',
  noResultMessage: 'Tradera listing form category sequencer produced no result.',
  emptyMessage:
    'No categories could be scraped from the Tradera listing form category picker. Ensure the connection session is authenticated and the listing form is accessible.',
  recoveryAction: 'tradera_configure_api_credentials',
  recoveryMessage: 'Authenticate the Tradera connection session, then retry category fetch.',
};

const extractTrimmedString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const normalizeParentId = (value: unknown): string => {
  const normalized = extractTrimmedString(value);
  if (
    normalized === null ||
    normalized === '0' ||
    normalized.toLowerCase() === 'null'
  ) {
    return '0';
  }
  return normalized;
};

const normalizeCategoryRecord = (value: unknown): TraderaCategoryRecord | null => {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = extractTrimmedString(record['id']);
  const name = extractTrimmedString(record['name']);
  if (id === null || name === null) {
    return null;
  }

  return {
    id,
    name,
    parentId: normalizeParentId(record['parentId']),
  };
};

const normalizeCategories = (
  value: Array<{ id: string; name: string; parentId: string }>
): TraderaCategoryRecord[] => {
  const deduped = new Map<string, TraderaCategoryRecord>();
  for (const item of value) {
    const normalized = normalizeCategoryRecord(item);
    if (!normalized) continue;
    if (!deduped.has(normalized.id)) {
      deduped.set(normalized.id, normalized);
    }
  }
  return Array.from(deduped.values());
};

const buildCategoryFetchTracker = async (): Promise<StepTracker> =>
  StepTracker.fromSteps(await buildResolvedActionSteps('tradera_fetch_categories'));

const buildCategorySequencerContext = (
  session: Pick<OpenPlaywrightConnectionNativeTaskSessionResult, 'page'>,
  tracker: StepTracker
): PlaywrightSequencerContext => ({
  page: session.page,
  tracker,
  actionKey: 'tradera_fetch_categories',
  emit: () => undefined,
  log: (msg, ctx) => {
    logger.info(msg, ctx as Record<string, unknown>);
  },
});

const isChildCategory = (category: TraderaCategoryRecord): boolean =>
  category.parentId.length > 0 && category.parentId !== '0';

const logCategoryFetchResult = (
  result: TraderaCategorySequencerResult,
  categories: TraderaCategoryRecord[],
  config: CategoryFetchResultConfig
): void => {
  const withParent = categories.filter(isChildCategory);

  logger.info(config.logLabel, {
    categorySource: result.categorySource,
    total: categories.length,
    withParentCount: withParent.length,
    rootCount: categories.length - withParent.length,
    scrapedFrom: result.scrapedFrom,
    sampleCategories: categories.slice(0, 5).map((category) => ({
      id: category.id,
      name: category.name,
      parentId: category.parentId,
    })),
    crawlStats: result.crawlStats,
  });
};

const assertCategoryFetchResult = (
  result: TraderaCategorySequencerResult | null,
  connection: IntegrationConnectionRecord,
  config: CategoryFetchResultConfig
): asserts result is TraderaCategorySequencerResult => {
  if (result !== null) return;

  throw new AppError(config.noResultMessage, {
    code: AppErrorCodes.operationFailed,
    httpStatus: 422,
    meta: { connectionId: connection.id },
    expected: false,
  });
};

const assertCategoriesWereScraped = ({
  categories,
  connection,
  config,
  result,
}: CategoryFetchEmptyAssertionInput): void => {
  if (categories.length > 0) return;

  throw new AppError(config.emptyMessage, {
    code: AppErrorCodes.operationFailed,
    httpStatus: 422,
    meta: {
      connectionId: connection.id,
      scrapedFrom: result.scrapedFrom,
      categorySource: result.categorySource,
      diagnostics: result.diagnostics,
      crawlStats: result.crawlStats,
      recoveryAction: config.recoveryAction,
      recoveryMessage: config.recoveryMessage,
    },
    expected: true,
  });
};

const runCategoryFetchSequencer = async ({
  connection,
  config,
  sequencer,
}: {
  connection: IntegrationConnectionRecord;
  config: CategoryFetchResultConfig;
  sequencer: CategoryFetchSequencer;
}): Promise<TraderaCategoryRecord[]> => {
  await sequencer.run();
  const result = sequencer.result;

  assertCategoryFetchResult(result, connection, config);
  const categories = normalizeCategories(result.categories);
  logCategoryFetchResult(result, categories, config);
  assertCategoriesWereScraped({ categories, connection, config, result });

  return categories;
};

const fetchPublicCategoriesInSession = async (
  connection: IntegrationConnectionRecord,
  session: OpenPlaywrightConnectionNativeTaskSessionResult
): Promise<TraderaCategoryRecord[]> => {
  const tracker = await buildCategoryFetchTracker();
  const sequencer = new TraderaCategorySequencer(
    buildCategorySequencerContext(session, tracker),
    { categoriesUrl: TRADERA_PUBLIC_CATEGORIES_URL }
  );

  return runCategoryFetchSequencer({
    connection,
    config: PUBLIC_CATEGORY_FETCH_CONFIG,
    sequencer,
  });
};

const persistListingFormCategorySession = async (
  connection: IntegrationConnectionRecord,
  session: OpenPlaywrightConnectionNativeTaskSessionResult,
  listingFormUrl: string
): Promise<void> => {
  await ensureLoggedIn(session.page, connection, listingFormUrl, {
    inputBehavior: session.runtime.settings,
  });
  await persistPlaywrightConnectionStorageState({
    connectionId: connection.id,
    storageState: await session.context.storageState(),
    updatedAt: new Date().toISOString(),
    repo: getIntegrationRepository(),
  });
};

const fetchListingFormCategoriesInSession = async (
  connection: IntegrationConnectionRecord,
  systemSettings: Pick<TraderaSystemSettings, 'listingFormUrl'>,
  session: OpenPlaywrightConnectionNativeTaskSessionResult
): Promise<TraderaCategoryRecord[]> => {
  const tracker = await buildCategoryFetchTracker();
  await persistListingFormCategorySession(
    connection,
    session,
    systemSettings.listingFormUrl
  );
  const sequencer = new TraderaListingFormCategorySequencer(
    buildCategorySequencerContext(session, tracker),
    { listingFormUrl: systemSettings.listingFormUrl }
  );

  return runCategoryFetchSequencer({
    connection,
    config: LISTING_FORM_CATEGORY_FETCH_CONFIG,
    sequencer,
  });
};

export const fetchTraderaCategoriesForConnection = async (
  connection: IntegrationConnectionRecord
): Promise<TraderaCategoryRecord[]> => {
  return runPlaywrightConnectionNativeTask<TraderaCategoryRecord[]>({
    connection,
    instance: createTraderaCategoryScrapePlaywrightInstance({
      connectionId: connection.id,
      integrationId: connection.integrationId,
    }),
    runtimeActionKey: 'tradera_fetch_categories',
    execute: (session) => fetchPublicCategoriesInSession(connection, session),
    getErrorMessage: (error) =>
      error instanceof Error ? error.message : 'Tradera category fetch failed',
  });
};

export const fetchTraderaCategoriesFromListingFormForConnection = async (
  connection: IntegrationConnectionRecord,
  systemSettings: Pick<TraderaSystemSettings, 'listingFormUrl'>
): Promise<TraderaCategoryRecord[]> => {
  return runPlaywrightConnectionNativeTask<TraderaCategoryRecord[]>({
    connection,
    instance: createTraderaStandardListingPlaywrightInstance({
      connectionId: connection.id,
      integrationId: connection.integrationId,
    }),
    runtimeActionKey: 'tradera_fetch_categories',
    execute: (session) =>
      fetchListingFormCategoriesInSession(connection, systemSettings, session),
    getErrorMessage: (error) =>
      error instanceof Error ? error.message : 'Tradera listing form category fetch failed',
  });
};
