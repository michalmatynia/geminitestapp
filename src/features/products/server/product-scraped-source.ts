import 'server-only';

import { getProductListingRepository } from '@/features/integrations/server';
import type { ProductScrapedSourceActionResponse } from '@/shared/contracts/products/scraped-source';

import {
  STATUS_CHECK_TIMEOUT_MS,
  buildMarketplaceData,
  ensureScrapedSourceListing,
  persistScrapedSourceStatus,
  responseFor,
  resolveStatusCheckMessage,
  resolveStatusCheckStatus,
} from './product-scraped-source-common';
export { runScrapedSourcePurchase } from './product-scraped-source-purchase';

export const linkScrapedSourceProduct = async (
  productId: string
): Promise<ProductScrapedSourceActionResponse> => {
  const context = await ensureScrapedSourceListing(productId, 'linked');
  return responseFor({
    productId: context.product.id,
    listingId: context.listing.id,
    status: 'linked',
    sourceUrl: context.sourceUrl,
    message: 'Scraped source connection linked.',
  });
};

export const checkScrapedSourceProductStatus = async (
  productId: string
): Promise<ProductScrapedSourceActionResponse> => {
  const context = await ensureScrapedSourceListing(productId, 'linked');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STATUS_CHECK_TIMEOUT_MS);
  const checkedAt = new Date().toISOString();
  try {
    const response = await fetch(context.sourceUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 StudIQ scraped-source-status-check',
      },
    });
    const status = resolveStatusCheckStatus(response.status);
    await persistScrapedSourceStatus(context, {
      status,
      checkedAt,
      httpStatus: response.status,
    });
    return responseFor({
      productId: context.product.id,
      listingId: context.listing.id,
      status,
      sourceUrl: context.sourceUrl,
      checkedAt,
      message: resolveStatusCheckMessage(status),
    });
  } catch {
    const status = 'check_failed';
    await persistScrapedSourceStatus(context, {
      status,
      checkedAt,
      httpStatus: null,
    });
    return responseFor({
      productId: context.product.id,
      listingId: context.listing.id,
      status,
      sourceUrl: context.sourceUrl,
      checkedAt,
      message: 'Could not reach scraped source page.',
    });
  } finally {
    clearTimeout(timeout);
  }
};

export const prepareScrapedSourcePurchase = async (
  productId: string
): Promise<ProductScrapedSourceActionResponse> => {
  const context = await ensureScrapedSourceListing(productId, 'purchase_review_required');
  const checkedAt = new Date().toISOString();
  await (await getProductListingRepository()).updateListing(context.listing.id, {
    status: 'purchase_review_required',
    lastStatusCheckAt: checkedAt,
    marketplaceData: {
      ...buildMarketplaceData({
        product: context.product,
        sourceUrl: context.sourceUrl,
        host: context.host,
        status: 'purchase_review_required',
        checkedAt,
      }),
      purchase: {
        mode: 'manual_review',
        preparedAt: checkedAt,
        sourceUrl: context.sourceUrl,
      },
    },
  });
  return responseFor({
    productId: context.product.id,
    listingId: context.listing.id,
    status: 'purchase_review_required',
    sourceUrl: context.sourceUrl,
    checkedAt,
    message: 'Purchase page prepared for manual review. No checkout action was submitted.',
  });
};
