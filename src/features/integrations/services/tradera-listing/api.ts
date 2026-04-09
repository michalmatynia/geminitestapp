import { decryptSecret } from '@/features/integrations/server';
import { getExternalCategoryRepository } from '@/features/integrations/services/external-category-repository';
import {
  addTraderaShopItem,
  TraderaApiCredentials,
  TraderaPublicApiCredentials,
} from '@/features/integrations/services/tradera-api-client';
import { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import { ProductListing } from '@/shared/contracts/integrations/listings';
import { internalError, notFoundError } from '@/shared/errors/app-error';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import { resolveMarketplaceAwareProductCopy } from '@/shared/lib/products/utils/marketplace-content-overrides';

import {
  DEFAULT_TRADERA_API_CATEGORY_ID,
  DEFAULT_TRADERA_API_PAYMENT_CONDITION,
  DEFAULT_TRADERA_API_SHIPPING_CONDITION,
} from './config';
import { resolveTraderaCategoryMappingResolutionForProduct, resolveToLeafCategory } from './category-mapping';
import { resolveTraderaShippingGroupResolutionForProduct } from './shipping-group';
import { toPositiveInt, toRecord } from './utils';

const decryptTrimmedSecret = (value: string | null | undefined): string =>
  value ? decryptSecret(value).trim() : '';

const requirePositiveCredential = (value: number | null, message: string): number => {
  if (!value) {
    throw internalError(message);
  }
  return value;
};

const requireSecretCredential = (value: string, message: string): string => {
  if (!value) {
    throw internalError(message);
  }
  return value;
};

export const resolveTraderaApiCredentials = (
  connection: IntegrationConnectionRecord
): TraderaApiCredentials => {
  return {
    appId: requirePositiveCredential(
      toPositiveInt(connection.traderaApiAppId),
      'Tradera API App ID is missing. Update the connection credentials.'
    ),
    appKey: requireSecretCredential(
      decryptTrimmedSecret(connection.traderaApiAppKey),
      'Tradera API App Key is missing. Update the connection credentials.'
    ),
    userId: requirePositiveCredential(
      toPositiveInt(connection.traderaApiUserId),
      'Tradera API User ID is missing. Update the connection credentials.'
    ),
    token: requireSecretCredential(
      decryptTrimmedSecret(connection.traderaApiToken),
      'Tradera API token is missing. Update the connection credentials.'
    ),
    sandbox: connection.traderaApiSandbox ?? false,
  };
};

export const resolveTraderaPublicApiCredentials = (
  connection: IntegrationConnectionRecord
): TraderaPublicApiCredentials => {
  return {
    appId: requirePositiveCredential(
      toPositiveInt(connection.traderaApiAppId),
      'Tradera API App ID is missing. Update the connection credentials.'
    ),
    appKey: requireSecretCredential(
      decryptTrimmedSecret(connection.traderaApiAppKey),
      'Tradera API App Key is missing. Update the connection credentials.'
    ),
    sandbox: connection.traderaApiSandbox ?? false,
  };
};

export type ResolvedTraderaApiCategoryId = {
  categoryId: number;
  source: 'marketplaceData' | 'categoryMapper' | 'product' | 'env' | 'default';
  categoryPath: string | null;
  categoryName: string | null;
  categoryMappingReason: string | null;
  categoryMatchScope: string | null;
  categoryInternalCategoryId: string | null;
  /** Set when a non-leaf category was automatically resolved to its first leaf descendant */
  categoryLeafAutoResolved: boolean;
  /** The original non-leaf category ID, when leaf auto-resolution occurred */
  categoryLeafOriginalExternalId: string | null;
};

export const resolveTraderaApiCategoryId = async (
  listing: ProductListing,
  product: {
    categoryId?: string | null | undefined;
    id?: string | null | undefined;
    catalogId?: string | null | undefined;
    catalogs?: Array<{ catalogId?: string | null | undefined }> | null | undefined;
  },
  options?: {
    /** When provided, enables on-demand SOAP leaf resolution for non-leaf categories */
    publicCredentials?: TraderaPublicApiCredentials;
  }
): Promise<ResolvedTraderaApiCategoryId> => {
  const listingData = toRecord(listing.marketplaceData);
  const traderaData = toRecord(listingData['tradera']);
  const fromMarketplaceData = toPositiveInt(traderaData['categoryId']);
  if (fromMarketplaceData) {
    return {
      categoryId: fromMarketplaceData,
      source: 'marketplaceData',
      categoryPath: null,
      categoryName: null,
      categoryMappingReason: null,
      categoryMatchScope: null,
      categoryInternalCategoryId: null,
      categoryLeafAutoResolved: false,
      categoryLeafOriginalExternalId: null,
    };
  }

  const categoryMapping = await resolveTraderaCategoryMappingResolutionForProduct({
    connectionId: listing.connectionId,
    product: product as never,
  });
  const mappedCategory = categoryMapping.mapping;
  const fromCategoryMapper = toPositiveInt(mappedCategory?.externalCategoryId ?? null);
  if (fromCategoryMapper) {
    const externalCategoryId = String(fromCategoryMapper);
    const externalCategoryRepo = getExternalCategoryRepository();
    const leafResolution = await resolveToLeafCategory({
      connectionId: listing.connectionId,
      externalCategoryId,
      externalCategoryRepo,
      credentials: options?.publicCredentials,
    });
    const resolvedId = toPositiveInt(leafResolution.resolvedExternalCategoryId) ?? fromCategoryMapper;
    return {
      categoryId: resolvedId,
      source: 'categoryMapper',
      categoryPath: leafResolution.resolvedPath ?? mappedCategory?.externalCategoryPath ?? null,
      categoryName: leafResolution.resolvedName ?? mappedCategory?.externalCategoryName ?? null,
      categoryMappingReason: categoryMapping.reason,
      categoryMatchScope: categoryMapping.matchScope,
      categoryInternalCategoryId: categoryMapping.internalCategoryId,
      categoryLeafAutoResolved: leafResolution.autoResolved,
      categoryLeafOriginalExternalId: leafResolution.originalExternalCategoryId,
    };
  }

  const fromProduct = toPositiveInt(product?.categoryId ?? null);
  if (fromProduct) {
    return {
      categoryId: fromProduct,
      source: 'product',
      categoryPath: null,
      categoryName: null,
      categoryMappingReason: categoryMapping.reason,
      categoryMatchScope: categoryMapping.matchScope,
      categoryInternalCategoryId: categoryMapping.internalCategoryId,
      categoryLeafAutoResolved: false,
      categoryLeafOriginalExternalId: null,
    };
  }

  const fromEnv = toPositiveInt(process.env['TRADERA_API_DEFAULT_CATEGORY_ID']);
  if (fromEnv) {
    return {
      categoryId: fromEnv,
      source: 'env',
      categoryPath: null,
      categoryName: null,
      categoryMappingReason: categoryMapping.reason,
      categoryMatchScope: categoryMapping.matchScope,
      categoryInternalCategoryId: categoryMapping.internalCategoryId,
      categoryLeafAutoResolved: false,
      categoryLeafOriginalExternalId: null,
    };
  }

  return {
    categoryId: DEFAULT_TRADERA_API_CATEGORY_ID,
    source: 'default',
    categoryPath: null,
    categoryName: null,
    categoryMappingReason: categoryMapping.reason,
    categoryMatchScope: categoryMapping.matchScope,
    categoryInternalCategoryId: categoryMapping.internalCategoryId,
    categoryLeafAutoResolved: false,
    categoryLeafOriginalExternalId: null,
  };
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
  const publicCredentials = resolveTraderaPublicApiCredentials(connection);
  const { title, description } = resolveMarketplaceAwareProductCopy({
    product,
    integrationId: listing.integrationId,
    preferredLocales: ['en', 'pl', 'de'],
  });
  const normalizedPrice =
    typeof product.price === 'number' && Number.isFinite(product.price) && product.price > 0
      ? product.price
      : 1;
  const quantity =
    typeof product.stock === 'number' && Number.isFinite(product.stock) && product.stock > 0
      ? Math.floor(product.stock)
      : 1;
  const {
    categoryId,
    source: categorySource,
    categoryPath,
    categoryName,
    categoryMappingReason,
    categoryMatchScope,
    categoryInternalCategoryId,
    categoryLeafAutoResolved,
    categoryLeafOriginalExternalId,
  } = await resolveTraderaApiCategoryId(listing, product, { publicCredentials });
  const shippingGroupResolution = await resolveTraderaShippingGroupResolutionForProduct({
    product,
  });
  const shippingCondition =
    shippingGroupResolution.shippingCondition || DEFAULT_TRADERA_API_SHIPPING_CONDITION;
  const shippingConditionSource = shippingGroupResolution.shippingCondition
    ? 'shippingGroup'
    : 'default';
  const addResult = await addTraderaShopItem({
    credentials,
    input: {
      title,
      description,
      categoryId,
      price: normalizedPrice,
      quantity,
      shippingCondition,
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
      categorySource,
      categoryPath,
      categoryName,
      categoryMappingReason,
      categoryMatchScope,
      categoryInternalCategoryId,
      categoryLeafAutoResolved,
      categoryLeafOriginalExternalId,
      shippingGroupId: shippingGroupResolution.shippingGroupId,
      shippingGroupName: shippingGroupResolution.shippingGroup?.name ?? null,
      shippingGroupSource: shippingGroupResolution.shippingGroupSource,
      shippingCondition,
      shippingPriceEur: shippingGroupResolution.shippingPriceEur,
      shippingConditionSource,
      shippingConditionReason: shippingGroupResolution.reason,
      matchedCategoryRuleIds: shippingGroupResolution.matchedCategoryRuleIds,
      matchingShippingGroupIds: shippingGroupResolution.matchingShippingGroupIds,
      quantity,
      sandbox: credentials.sandbox ?? false,
    },
  };
};
