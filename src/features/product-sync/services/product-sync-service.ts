import 'server-only';

import {
  getDefaultProductSyncProfile,
  hasActiveProductSyncRun,
  updateProductSyncRun,
} from '@/features/product-sync/services/product-sync-repository';
import {
  buildEffectiveProductSyncFieldRules,
} from '@/shared/contracts/product-sync';
import type {
  ProductSyncPreview,
  ProductSyncSingleProductResponse,
  ProductSyncRunRecord,
} from '@/shared/contracts/product-sync';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';

import {
  buildBlockedSyncPreview,
  buildLinkedProductSyncPlan,
  fetchBaseDetailsMap,
  resolveBaseConnectionContext,
  resolveBaseFieldPresentationMetadata,
  resolveManualBaseSyncTarget,
  syncSingleLinkedProduct,
  toProductSyncPreviewProfile,
  toTrimmedString,
} from './product-sync-processor';

export { processProductSyncRun, runBaseListingBackfill } from './product-sync-processor';

/**
 * Get a preview of synchronization changes for a specific product.
 */
export const getProductBaseSyncPreview = async (
  productId: string
): Promise<ProductSyncPreview | null> => {
  const normalizedProductId = toTrimmedString(productId);
  if (!normalizedProductId) return null;

  const productRepository = await getProductRepository();
  const product = await productRepository.getProductById(normalizedProductId);
  if (!product) return null;

  const profile = await getDefaultProductSyncProfile();
  if (!profile) {
    return buildBlockedSyncPreview({
      status: 'missing_profile',
      disabledReason:
        'No Base.com sync profile is configured. Create one in Synchronization Engine settings.',
      profile: null,
      product,
      resolvedTargetSource: 'none',
    });
  }

  let connectionContext;
  try {
    connectionContext = await resolveBaseConnectionContext(profile);
  } catch (error) {
    return buildBlockedSyncPreview({
      status: 'connection_error',
      disabledReason:
        error instanceof Error ? error.message : 'Base.com connection resolution failed.',
      profile,
      product,
      linkedBaseProductId: toTrimmedString(product.baseProductId) || null,
      resolvedTargetSource: toTrimmedString(product.baseProductId) ? 'product' : 'none',
    });
  }

  const resolvedTarget = await resolveManualBaseSyncTarget({
    product,
    connectionId: profile.connectionId,
    token: connectionContext.token,
    inventoryId: connectionContext.inventoryId,
  });
  if (!resolvedTarget.baseProductId) {
    return buildBlockedSyncPreview({
      status: 'missing_base_link',
      disabledReason:
        'This product is not linked to a Base.com product for the active sync profile connection.',
      profile,
      product,
      connectionName: connectionContext.connectionName,
      resolvedTargetSource: 'none',
    });
  }

  const baseRecord = (
    await fetchBaseDetailsMap(
      connectionContext.token,
      connectionContext.inventoryId,
      [resolvedTarget.baseProductId]
    )
  ).get(resolvedTarget.baseProductId) ?? null;

  if (!baseRecord) {
    return buildBlockedSyncPreview({
      status: 'missing_base_record',
      disabledReason: `Base product ${resolvedTarget.baseProductId} was not found in inventory ${connectionContext.inventoryId}.`,
      profile,
      product,
      linkedBaseProductId: resolvedTarget.baseProductId,
      connectionName: connectionContext.connectionName,
      resolvedTargetSource: resolvedTarget.linkedVia,
    });
  }

  const baseFieldPresentationMetadata = await resolveBaseFieldPresentationMetadata({
    connectionContext,
    rules: buildEffectiveProductSyncFieldRules(profile.fieldRules),
  });
  const plan = buildLinkedProductSyncPlan({
    product,
    baseRecord,
    profile,
    baseProductId: resolvedTarget.baseProductId,
    persistBaseProductId:
      resolvedTarget.linkedVia === 'listing' || resolvedTarget.linkedVia === 'sku_backfill',
    baseFieldPresentationMetadata,
  });
  const hasActiveRun = await hasActiveProductSyncRun(profile.id);

  return {
    status: hasActiveRun ? 'profile_run_active' : 'ready',
    canSync: !hasActiveRun,
    disabledReason: hasActiveRun
      ? 'A scheduled or queued sync run is already using this Base.com sync profile.'
      : null,
    profile: toProductSyncPreviewProfile(profile, {
      connectionName: connectionContext.connectionName,
    }),
    linkedBaseProductId: resolvedTarget.baseProductId,
    resolvedTargetSource: resolvedTarget.linkedVia,
    fields: plan.fields,
  };
};

/**
 * Run a manual sync for a specific product.
 */
export const runProductBaseSync = async (
  productId: string
): Promise<ProductSyncSingleProductResponse | null> => {
  const normalizedProductId = toTrimmedString(productId);
  if (!normalizedProductId) return null;

  const productRepository = await getProductRepository();
  const product = await productRepository.getProductById(normalizedProductId);
  if (!product) return null;

  const profile = await getDefaultProductSyncProfile();
  if (!profile) {
    throw new Error('No Base.com sync profile is configured.');
  }

  const hasActiveRun = await hasActiveProductSyncRun(profile.id);
  if (hasActiveRun) {
    throw new Error('A scheduled or queued sync run is already using this Base.com sync profile.');
  }

  const connectionContext = await resolveBaseConnectionContext(profile);
  const resolvedTarget = await resolveManualBaseSyncTarget({
    product,
    connectionId: profile.connectionId,
    token: connectionContext.token,
    inventoryId: connectionContext.inventoryId,
  });
  if (!resolvedTarget.baseProductId) {
    throw new Error(
      'This product is not linked to a Base.com product for the active sync profile connection.'
    );
  }

  const baseRecord = (
    await fetchBaseDetailsMap(
      connectionContext.token,
      connectionContext.inventoryId,
      [resolvedTarget.baseProductId]
    )
  ).get(resolvedTarget.baseProductId) ?? null;

  const result = await syncSingleLinkedProduct({
    product,
    baseProductId: resolvedTarget.baseProductId,
    baseRecord,
    profile,
    integrationId: connectionContext.integrationId,
    connectionId: connectionContext.connectionId,
    inventoryId: connectionContext.inventoryId,
    token: connectionContext.token,
  });

  const preview = await getProductBaseSyncPreview(normalizedProductId);
  if (!preview) return null;

  return {
    preview,
    result,
  };
};

/**
 * Assign a background queue job to a sync run.
 */
export const assignQueueJobToProductSyncRun = async (
  runId: string,
  queueJobId: string
): Promise<ProductSyncRunRecord> => {
  return updateProductSyncRun(runId, {
    queueJobId: toTrimmedString(queueJobId) || null,
  });
};
