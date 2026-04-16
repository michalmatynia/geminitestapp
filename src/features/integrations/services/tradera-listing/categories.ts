import 'server-only';

import { getResolvedActionStepManifest } from '@/shared/lib/browser-execution/runtime-action-resolver.server';
import { generateBrowserExecutionStepsInit } from '@/shared/lib/browser-execution/generate-browser-steps';
import { logger } from '@/shared/utils/logger';
import { TRADERA_PUBLIC_CATEGORIES_URL } from '@/features/integrations/constants/tradera';
import { buildTraderaCategoryScrapeScript } from '@/features/integrations/services/tradera-listing/category-scrape-script';
import { type IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import { type TraderaCategoryRecord } from '@/shared/contracts/integrations/tradera';
import { AppError, AppErrorCodes } from '@/shared/errors/app-error';
import { isObjectRecord } from '@/shared/utils/object-utils';
import {
  buildPlaywrightEngineRunFailureMeta,
  collectPlaywrightEngineRunFailureMessages,
  createTraderaCategoryScrapePlaywrightInstance,
  runPlaywrightScrapeScript,
  runPlaywrightScrapeTask,
} from '@/features/playwright/server';

const CATEGORY_SCRAPE_TIMEOUT_MS = 300_000;

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
  if (!isObjectRecord(value)) {
    return null;
  }

  const id = extractTrimmedString(value['id']);
  const name = extractTrimmedString(value['name']);
  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    parentId: normalizeParentId(value['parentId']),
  };
};

const normalizeCategories = (value: unknown): TraderaCategoryRecord[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const deduped = new Map<string, TraderaCategoryRecord>();
  for (const item of value) {
    const normalized = normalizeCategoryRecord(item);
    if (!normalized) {
      continue;
    }
    if (!deduped.has(normalized.id)) {
      deduped.set(normalized.id, normalized);
    }
  }

  return Array.from(deduped.values());
};

const buildFailureMeta = (
  run: Awaited<ReturnType<typeof runPlaywrightScrapeScript>>['run']
): Record<string, unknown> => {
  return {
    ...buildPlaywrightEngineRunFailureMeta(run),
  };
};

const toCategoryFetchError = (
  run: Awaited<ReturnType<typeof runPlaywrightScrapeScript>>['run'],
  connectionId: string
): Error => {
  const failureMessages = collectPlaywrightEngineRunFailureMessages(run);
  const rawMessage = failureMessages[0] ?? null;

  return new AppError(
    rawMessage ?? 'Tradera categories could not be fetched from the public categories pages.',
    {
      code: AppErrorCodes.operationFailed,
      httpStatus: 422,
      meta: {
        ...buildFailureMeta(run),
        connectionId,
      },
      expected: true,
    }
  );
};

export const fetchTraderaCategoriesForConnection = async (
  connection: IntegrationConnectionRecord
): Promise<TraderaCategoryRecord[]> => {
  const executionStepsInit = generateBrowserExecutionStepsInit(
    await getResolvedActionStepManifest('tradera_fetch_categories')
  );

  return runPlaywrightScrapeTask({
    execute: async () =>
      runPlaywrightScrapeScript({
        script: buildTraderaCategoryScrapeScript(executionStepsInit),
        input: {
          connectionId: connection.id,
          traderaConfig: {
            categoriesUrl: TRADERA_PUBLIC_CATEGORIES_URL,
          },
        },
        connection,
        instance: createTraderaCategoryScrapePlaywrightInstance({
          connectionId: connection.id,
          integrationId: connection.integrationId,
        }),
        timeoutMs: CATEGORY_SCRAPE_TIMEOUT_MS,
        startUrl: TRADERA_PUBLIC_CATEGORIES_URL,
        capture: {
          screenshot: true,
          html: true,
        },
      }),
    mapResult: async ({ run, rawResult, finalUrl }) => {
      if (run.status === 'failed') {
        throw toCategoryFetchError(run, connection.id);
      }

      const categories = normalizeCategories(rawResult['categories']);
      const categorySource = extractTrimmedString(rawResult['categorySource']);
      const withParent = categories.filter(
        (category) => category.parentId && category.parentId !== '0'
      );

      logger.info('[tradera-category-fetch]', {
        categorySource,
        total: categories.length,
        withParentCount: withParent.length,
        rootCount: categories.length - withParent.length,
        scrapedFrom: extractTrimmedString(rawResult['scrapedFrom']),
        sampleCategories: categories.slice(0, 5).map((category) => ({
          id: category.id,
          name: category.name,
          parentId: category.parentId,
        })),
        crawlStats: isObjectRecord(rawResult['crawlStats']) ? rawResult['crawlStats'] : null,
        runLogs: (Array.isArray(run.logs) ? run.logs : [])
          .filter((line) => typeof line === 'string' && line.includes('tradera.category'))
          .slice(-20),
      });

      if (categories.length === 0) {
        throw new AppError(
          'Tradera categories could not be scraped from the public categories pages — the taxonomy page structure may have changed. Configure Tradera API credentials (App ID and App Key) on the connection to fetch categories via the Tradera SOAP API instead.',
          {
            code: AppErrorCodes.operationFailed,
            httpStatus: 422,
            meta: {
              ...buildFailureMeta(run),
              connectionId: connection.id,
              finalUrl,
              categorySource: extractTrimmedString(rawResult['categorySource']),
              scrapedFrom: extractTrimmedString(rawResult['scrapedFrom']),
              diagnostics: isObjectRecord(rawResult['diagnostics'])
                ? rawResult['diagnostics']
                : null,
              crawlStats: isObjectRecord(rawResult['crawlStats']) ? rawResult['crawlStats'] : null,
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
  });
};
