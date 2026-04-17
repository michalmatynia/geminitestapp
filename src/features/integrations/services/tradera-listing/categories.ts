import 'server-only';

import { logger } from '@/shared/utils/logger';
import { TRADERA_PUBLIC_CATEGORIES_URL } from '@/features/integrations/constants/tradera';
import { type IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import { type TraderaCategoryRecord } from '@/shared/contracts/integrations/tradera';
import { AppError, AppErrorCodes } from '@/shared/errors/app-error';
import { buildResolvedActionSteps } from '@/shared/lib/browser-execution/runtime-action-resolver.server';
import { StepTracker } from '@/shared/lib/browser-execution/step-tracker';
import { TraderaCategorySequencer } from '@/shared/lib/browser-execution/sequencers/TraderaCategorySequencer';
import {
  createTraderaCategoryScrapePlaywrightInstance,
  runPlaywrightConnectionNativeTask,
} from '@/features/playwright/server';

const extractTrimmedString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const normalizeParentId = (value: unknown): string => {
  const normalized = extractTrimmedString(value);
  if (!normalized || normalized === '0' || normalized.toLowerCase() === 'null') {
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
  if (!id || !name) {
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
    execute: async (session) => {
      const tracker = StepTracker.fromSteps(
        await buildResolvedActionSteps('tradera_fetch_categories')
      );

      const sequencer = new TraderaCategorySequencer(
        {
          page: session.page,
          tracker,
          actionKey: 'tradera_fetch_categories',
          emit: () => undefined,
          log: (msg, ctx) => {
            logger.info(msg, ctx as Record<string, unknown>);
          },
        },
        { categoriesUrl: TRADERA_PUBLIC_CATEGORIES_URL }
      );

      await sequencer.run();

      const result = sequencer.result;

      if (!result) {
        throw new AppError(
          'Tradera category sequencer produced no result.',
          {
            code: AppErrorCodes.operationFailed,
            httpStatus: 422,
            meta: { connectionId: connection.id },
            expected: false,
          }
        );
      }

      const categories = normalizeCategories(result.categories);
      const withParent = categories.filter(
        (category) => category.parentId && category.parentId !== '0'
      );

      logger.info('[tradera-category-fetch]', {
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

      if (categories.length === 0) {
        throw new AppError(
          'Tradera categories could not be scraped from the public categories pages — the taxonomy page structure may have changed. Configure Tradera API credentials (App ID and App Key) on the connection to fetch categories via the Tradera SOAP API instead.',
          {
            code: AppErrorCodes.operationFailed,
            httpStatus: 422,
            meta: {
              connectionId: connection.id,
              scrapedFrom: result.scrapedFrom,
              categorySource: result.categorySource,
              diagnostics: result.diagnostics,
              crawlStats: result.crawlStats,
              recoveryAction: 'tradera_configure_api_credentials',
              recoveryMessage:
                'Add Tradera API App ID and App Key to this connection, then retry category fetch.',
            },
            expected: true,
          }
        );
      }

      return categories;
    },
    getErrorMessage: (error) =>
      error instanceof Error ? error.message : 'Tradera category fetch failed',
  });
};
