import 'server-only';

import { getIntegrationRepository, getProductListingRepository } from '@/features/integrations/server';
import { startPlaywrightConnectionEngineTask } from '@/features/playwright/server';
import { resolvePlaywrightActionRunsHref } from '@/features/playwright/utils/action-runs-links';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import type { ProductScrapedSourceActionResponse } from '@/shared/contracts/products/scraped-source';
import { notFoundError } from '@/shared/errors/app-error';
import { decryptSecret } from '@/shared/lib/security/encryption';

import {
  buildMarketplaceData,
  ensureScrapedSourceListing,
  normalizeString,
  responseFor,
  type ScrapedSourceListingContext,
} from './product-scraped-source-common';
import { SCRAPED_SOURCE_PURCHASE_SCRIPT } from './product-scraped-source-purchase-script';

const PURCHASE_TIMEOUT_MS = 180_000;

type PurchaseCredentials = {
  username: string;
  password: string;
};

const optionalNonEmptyString = (value: string): string | null =>
  value.length > 0 ? value : null;

const resolvePurchaseCredentials = (
  connection: IntegrationConnectionRecord
): PurchaseCredentials => ({
  username: normalizeString(connection.username),
  password:
    typeof connection.password === 'string' && connection.password.trim().length > 0
      ? decryptSecret(connection.password)
      : '',
});

const buildPurchaseRequestInput = (
  context: ScrapedSourceListingContext,
  credentials: PurchaseCredentials
): Record<string, unknown> => ({
  productId: context.product.id,
  listingId: context.listing.id,
  title: context.product.name,
  sku: context.product.sku ?? null,
  sourceUrl: context.sourceUrl,
  host: context.host,
  username: optionalNonEmptyString(credentials.username),
  password: optionalNonEmptyString(credentials.password),
  checkoutMode: 'manual_review',
  submitOrder: false,
});

const markPurchaseQueued = async (
  context: ScrapedSourceListingContext,
  startedAt: string,
  runId: string,
  actionRunUrl: string
): Promise<void> => {
  const listingRepository = await getProductListingRepository();
  await listingRepository.updateListing(context.listing.id, {
    status: 'purchase_queued',
    lastStatusCheckAt: startedAt,
    marketplaceData: {
      ...buildMarketplaceData({
        product: context.product,
        sourceUrl: context.sourceUrl,
        host: context.host,
        status: 'purchase_queued',
        checkedAt: startedAt,
      }),
      purchase: {
        mode: 'playwright_manual_review',
        preparedAt: startedAt,
        runId,
        actionRunUrl,
        sourceUrl: context.sourceUrl,
        submitOrder: false,
      },
    },
  });
};

const startPurchaseAutomationTask = (
  connection: IntegrationConnectionRecord,
  context: ScrapedSourceListingContext,
  credentials: PurchaseCredentials
): ReturnType<typeof startPlaywrightConnectionEngineTask> =>
  startPlaywrightConnectionEngineTask({
    connection,
    browserBehaviorOwner: 'action',
    request: {
      script: SCRAPED_SOURCE_PURCHASE_SCRIPT,
      actionName: 'Scraped Source Purchase',
      selectorProfile: context.host,
      startUrl: context.sourceUrl,
      input: buildPurchaseRequestInput(context, credentials),
      timeoutMs: PURCHASE_TIMEOUT_MS,
      failureHoldOpenMs: 30_000,
      preventNewPages: true,
      browserEngine: 'chromium',
      policyAllowedHosts: [context.host],
      capture: {
        screenshot: true,
        html: true,
      },
    },
    instance: {
      kind: 'custom',
      family: 'listing',
      label: 'Scraped source purchase',
      connectionId: connection.id,
      integrationId: connection.integrationId,
      listingId: context.listing.id,
      tags: ['scraped-source', 'purchase', context.host],
    },
    resolveEngineRequestConfig: (runtime) => ({
      settings: {
        ...runtime.settings,
        headless: false,
      },
      browserPreference: runtime.browserPreference,
    }),
  });

export const runScrapedSourcePurchase = async (
  productId: string
): Promise<ProductScrapedSourceActionResponse> => {
  const context = await ensureScrapedSourceListing(productId, 'purchase_review_required');
  const integrationRepository = getIntegrationRepository();
  const connection = await integrationRepository.getConnectionById(context.listing.connectionId);
  if (connection === null) {
    throw notFoundError('Scraped source connection was not found.', {
      productId: context.product.id,
      connectionId: context.listing.connectionId,
    });
  }

  const credentials = resolvePurchaseCredentials(connection);
  const startedAt = new Date().toISOString();
  const task = await startPurchaseAutomationTask(connection, context, credentials);
  const runId = task.run.runId;
  const actionRunUrl = resolvePlaywrightActionRunsHref({ runId });
  await markPurchaseQueued(context, startedAt, runId, actionRunUrl);

  return responseFor({
    productId: context.product.id,
    listingId: context.listing.id,
    status: 'purchase_queued',
    sourceUrl: context.sourceUrl,
    checkedAt: startedAt,
    runId,
    actionRunUrl,
    message: 'Purchase automation started in a headed Playwright run for manual review.',
  });
};
