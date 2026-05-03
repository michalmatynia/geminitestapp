import 'server-only';

import { logger } from '@/shared/utils/logger';
import { getIntegrationRepository } from '@/features/integrations/services/integration-repository';
import { type IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import { type TraderaCategoryRecord } from '@/shared/contracts/integrations/tradera';
import { AppError, AppErrorCodes } from '@/shared/errors/app-error';
import { buildResolvedActionSteps } from '@/shared/lib/browser-execution/runtime-action-resolver.server';
import { StepTracker } from '@/shared/lib/browser-execution/step-tracker';
import { type TraderaCategorySequencerResult } from '@/shared/lib/browser-execution/sequencers/tradera-category-sequencer-types';
import { TraderaListingFormCategorySequencer } from '@/shared/lib/browser-execution/sequencers/TraderaListingFormCategorySequencer';
import type { PlaywrightSequencerContext } from '@/shared/lib/browser-execution/sequencers/PlaywrightSequencer';
import {
  createTraderaStandardListingPlaywrightInstance,
} from '@/features/playwright/server/instances';
import {
  type OpenPlaywrightConnectionNativeTaskSessionResult,
} from '@/features/playwright/server/browser-session';
import {
  persistPlaywrightConnectionStorageState,
} from '@/features/playwright/server/storage-state';
import {
  runPlaywrightConnectionNativeTask,
} from '@/features/playwright/server/native-task';
import type { TraderaSystemSettings } from '@/features/integrations/constants/tradera';
import type { TraderaCategoryFetchBrowserMode } from '@/shared/contracts/integrations/marketplace';
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
  failOnDrillFailures?: boolean;
  drillFailureMessage?: string;
  minCategoryCount?: number;
};

type CategoryFetchEmptyAssertionInput = {
  categories: TraderaCategoryRecord[];
  connection: IntegrationConnectionRecord;
  config: CategoryFetchResultConfig;
  result: TraderaCategorySequencerResult;
};

const TRADERA_LISTING_FORM_MIN_CATEGORY_COUNT = 643;

const LISTING_FORM_CATEGORY_FETCH_CONFIG: CategoryFetchResultConfig = {
  logLabel: '[tradera-listing-form-category-fetch]',
  noResultMessage: 'Tradera listing form category sequencer produced no result.',
  emptyMessage:
    'No categories could be scraped from the Tradera listing form category picker. Ensure the connection session is authenticated and the listing form is accessible.',
  recoveryAction: 'tradera_configure_api_credentials',
  recoveryMessage: 'Authenticate the Tradera connection session, then retry category fetch.',
  failOnDrillFailures: true,
  drillFailureMessage:
    'Tradera listing form category picker stopped responding mid-crawl, so the category tree is incomplete. Re-authenticate the Tradera connection session, then retry category fetch.',
  minCategoryCount: TRADERA_LISTING_FORM_MIN_CATEGORY_COUNT,
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

function assertCategoryFetchResult(
  result: TraderaCategorySequencerResult | null,
  connection: IntegrationConnectionRecord,
  config: CategoryFetchResultConfig
): asserts result is TraderaCategorySequencerResult {
  if (result !== null) return;

  throw new AppError(config.noResultMessage, {
    code: AppErrorCodes.operationFailed,
    httpStatus: 422,
    meta: { connectionId: connection.id },
    expected: false,
  });
}

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

const readDrillFailureCount = (
  crawlStats: TraderaCategorySequencerResult['crawlStats']
): number => {
  if (crawlStats === null || typeof crawlStats !== 'object') return 0;
  const value = (crawlStats)['drillFailureCount'];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
};

const assertNoDrillFailures = (
  result: TraderaCategorySequencerResult,
  connection: IntegrationConnectionRecord,
  config: CategoryFetchResultConfig
): void => {
  if (!config.failOnDrillFailures) return;
  const drillFailureCount = readDrillFailureCount(result.crawlStats);
  if (drillFailureCount === 0) return;

  throw new AppError(
    config.drillFailureMessage ?? config.emptyMessage,
    {
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
    }
  );
};

const assertMinimumCategoryCount = ({
  categories,
  connection,
  config,
  result,
}: CategoryFetchEmptyAssertionInput): void => {
  const minCategoryCount = config.minCategoryCount;
  if (minCategoryCount === undefined || categories.length >= minCategoryCount) return;

  throw new AppError(
    `Tradera listing form category fetch returned only ${String(
      categories.length
    )} categories; expected at least ${String(
      minCategoryCount
    )}. The category tree is incomplete. Re-authenticate the Tradera connection session, then retry category fetch.`,
    {
      code: AppErrorCodes.operationFailed,
      httpStatus: 422,
      meta: {
        connectionId: connection.id,
        scrapedFrom: result.scrapedFrom,
        categorySource: result.categorySource,
        categoryCount: categories.length,
        minCategoryCount,
        diagnostics: result.diagnostics,
        crawlStats: result.crawlStats,
        recoveryAction: config.recoveryAction,
        recoveryMessage: config.recoveryMessage,
      },
      expected: true,
    }
  );
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
  assertNoDrillFailures(result, connection, config);
  assertMinimumCategoryCount({ categories, connection, config, result });

  return categories;
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
  const reauthenticate = async (): Promise<boolean> => {
    try {
      await persistListingFormCategorySession(
        connection,
        session,
        systemSettings.listingFormUrl
      );
      return true;
    } catch (error: unknown) {
      logger.warn('[tradera-listing-form-category-fetch] reauthentication failed', {
        connectionId: connection.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  };
  const sequencer = new TraderaListingFormCategorySequencer(
    buildCategorySequencerContext(session, tracker),
    { listingFormUrl: systemSettings.listingFormUrl, reauthenticate }
  );

  return runCategoryFetchSequencer({
    connection,
    config: LISTING_FORM_CATEGORY_FETCH_CONFIG,
    sequencer,
  });
};

export const fetchTraderaCategoriesFromListingFormForConnection = async (
  connection: IntegrationConnectionRecord,
  systemSettings: Pick<TraderaSystemSettings, 'listingFormUrl'> & {
    browserMode?: TraderaCategoryFetchBrowserMode;
  }
): Promise<TraderaCategoryRecord[]> => {
  return runPlaywrightConnectionNativeTask<TraderaCategoryRecord[]>({
    connection,
    instance: createTraderaStandardListingPlaywrightInstance({
      connectionId: connection.id,
      integrationId: connection.integrationId,
    }),
    runtimeActionKey: 'tradera_fetch_categories',
    requestedBrowserMode: systemSettings.browserMode,
    execute: (session) =>
      fetchListingFormCategoriesInSession(connection, systemSettings, session),
    getErrorMessage: (error) =>
      error instanceof Error ? error.message : 'Tradera listing form category fetch failed',
  });
};
