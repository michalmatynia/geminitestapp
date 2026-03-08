import { IntegrationConnectionRecord, ProductListing } from '@/shared/contracts/integrations';
import { decryptSecret } from '@/features/integrations/server';
import { internalError, notFoundError } from '@/shared/errors/app-error';
import {
  DEFAULT_TRADERA_API_CATEGORY_ID,
  DEFAULT_TRADERA_API_PAYMENT_CONDITION,
  DEFAULT_TRADERA_API_SHIPPING_CONDITION,
} from './config';
import { toPositiveInt, toRecord } from './utils';
import {
  addTraderaShopItem,
  TraderaApiCredentials,
} from '@/features/integrations/services/tradera-api-client';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';

export const resolveTraderaApiCredentials = (
  connection: IntegrationConnectionRecord
): TraderaApiCredentials => {
  const appId = toPositiveInt(connection.traderaApiAppId);
  const userId = toPositiveInt(connection.traderaApiUserId);
  const appKey = connection.traderaApiAppKey
    ? decryptSecret(connection.traderaApiAppKey).trim()
    : '';
  const token = connection.traderaApiToken ? decryptSecret(connection.traderaApiToken).trim() : '';

  if (!appId) {
    throw internalError('Tradera API App ID is missing. Update the connection credentials.');
  }
  if (!userId) {
    throw internalError('Tradera API User ID is missing. Update the connection credentials.');
  }
  if (!appKey) {
    throw internalError('Tradera API App Key is missing. Update the connection credentials.');
  }
  if (!token) {
    throw internalError('Tradera API token is missing. Update the connection credentials.');
  }

  return {
    appId,
    appKey,
    userId,
    token,
    sandbox: connection.traderaApiSandbox ?? false,
  };
};

export const resolveTraderaApiCategoryId = (
  listing: ProductListing,
  product: { categoryId?: string | null | undefined }
): number => {
  const listingData = toRecord(listing.marketplaceData);
  const traderaData = toRecord(listingData['tradera']);
  const fromMarketplaceData = toPositiveInt(traderaData['categoryId']);
  if (fromMarketplaceData) return fromMarketplaceData;

  const fromProduct = toPositiveInt(product?.categoryId ?? null);
  if (fromProduct) return fromProduct;

  const fromEnv = toPositiveInt(process.env['TRADERA_API_DEFAULT_CATEGORY_ID']);
  return fromEnv ?? DEFAULT_TRADERA_API_CATEGORY_ID;
};

export const runTraderaApiListing = async ({
  listing,
  connection,
}: {
  listing: ProductListing;
  connection: IntegrationConnectionRecord;
}): Promise<{
  externalListingId: string;
  listingUrl?: string;
  metadata?: Record<string, unknown>;
}> => {
  const productRepository = await getProductRepository();
  const product = await productRepository.getProductById(listing.productId);
  if (!product) {
    throw notFoundError('Product not found', { productId: listing.productId });
  }

  const credentials = resolveTraderaApiCredentials(connection);
  const title =
    product.name_en ||
    product.name_pl ||
    product.name_de ||
    product.sku ||
    `Listing ${listing.productId}`;
  const description =
    product.description_en || product.description_pl || product.description_de || title;
  const normalizedPrice =
    typeof product.price === 'number' && Number.isFinite(product.price) && product.price > 0
      ? product.price
      : 1;
  const quantity =
    typeof product.stock === 'number' && Number.isFinite(product.stock) && product.stock > 0
      ? Math.floor(product.stock)
      : 1;
  const categoryId = resolveTraderaApiCategoryId(listing, product);
  const addResult = await addTraderaShopItem({
    credentials,
    input: {
      title,
      description,
      categoryId,
      price: normalizedPrice,
      quantity,
      shippingCondition: DEFAULT_TRADERA_API_SHIPPING_CONDITION,
      paymentCondition: DEFAULT_TRADERA_API_PAYMENT_CONDITION,
    },
  });

  return {
    externalListingId: String(addResult.itemId),
    listingUrl: `https://www.tradera.com/item/${addResult.itemId}`,
    metadata: {
      mode: 'api',
      requestId: addResult.requestId,
      requestResultCode: addResult.resultCode,
      requestResultMessage: addResult.resultMessage,
      categoryId,
      quantity,
      sandbox: credentials.sandbox ?? false,
    },
  };
};
