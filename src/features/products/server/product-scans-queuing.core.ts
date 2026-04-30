import 'server-only';

import { randomUUID } from 'crypto';

import type { ProductScanBatchItem } from '@/shared/contracts/product-scans';
import { productService } from '@/shared/lib/products/services/productService';

import {
  hasDirectAmazonCandidateRequestInput,
  resolveAmazonSelectorProfile,
  resolveEffectiveAmazonRequestInput,
  resolveQueuedAmazonRuntimeKey,
  startAmazonQueuedProductScanRun,
} from './product-scans-queuing.amazon';
import { startSupplier1688QueuedProductScanRun } from './product-scans-queuing.supplier-1688';
import {
  createFailedBatchResult,
  createProductScanStartedRawResult,
  hydrateProductScanImageCandidates,
  readOptionalString,
  resolveProductScanRequestSequenceInput,
  resolveScanManualVerificationTimeoutMs,
  sanitizeProductScanImageCandidates,
} from './product-scans-service.helpers';
import {
  SCANNER_1688_MISSING_LOCAL_IMAGE_MESSAGE,
  SCANNER_1688_MISSING_PROFILE_MESSAGE,
} from './product-scans-sync-1688';
import { upsertProductScan } from './product-scans-repository';
import {
  resolveQueuedProductName,
  resolveStartedRun,
  type ProductScanImageCandidates,
  type ProductScannerSettings,
  type QueueBatchProductScansInput,
  type QueuedProductRecord,
  type StartedQueuedScanRun,
  type SupplierConnectionContext,
} from './product-scans-queuing.shared';

type ProductScanRequestSequenceInput = ReturnType<typeof resolveProductScanRequestSequenceInput>;

type PreparedQueuedProductScanItem = {
  amazonRuntimeKey: ReturnType<typeof resolveQueuedAmazonRuntimeKey>;
  effectiveRequestInput: Record<string, unknown>;
  hasDirectAmazonCandidateInput: boolean;
  imageCandidates: ProductScanImageCandidates;
  product: QueuedProductRecord;
  productName: string;
  requestedStepSequenceInput: ProductScanRequestSequenceInput;
  selectorProfile: string | null;
};

type PreparedQueueProductScanResult =
  | { kind: 'failed'; result: ProductScanBatchItem }
  | { item: PreparedQueuedProductScanItem; kind: 'ready' };

const resolveAllow1688UrlImageSearchFallback = (
  supplierConnectionContext: SupplierConnectionContext,
  scannerSettings: ProductScannerSettings
): boolean => {
  const connection = supplierConnectionContext?.connection;
  return (
    connection?.scanner1688AllowUrlImageSearchFallback ??
    scannerSettings.scanner1688?.allowUrlImageSearchFallback ??
    true
  ) !== false;
};

const resolveMissingImageMessage = (provider: QueueBatchProductScansInput['config']['provider']): string => {
  if (provider === 'amazon') return 'No usable product images for Amazon candidate search.';
  return SCANNER_1688_MISSING_LOCAL_IMAGE_MESSAGE;
};

const resolveSupplierConnectionFailure = (
  productId: string,
  supplierConnectionContext: SupplierConnectionContext
): ProductScanBatchItem | null => {
  if (supplierConnectionContext === null) {
    return createFailedBatchResult(productId, SCANNER_1688_MISSING_PROFILE_MESSAGE);
  }

  const playwrightStorageState = readOptionalString(
    supplierConnectionContext.connection.playwrightStorageState
  );
  if (playwrightStorageState !== null && playwrightStorageState.length > 0) return null;

  return createFailedBatchResult(
    productId,
    `1688 login required for profile ${supplierConnectionContext.connection.name}. Refresh the saved browser session before scanning.`
  );
};

const resolveImageCandidatesForQueuedProduct = async (input: {
  materializeUrlCandidates: boolean;
  product: QueuedProductRecord;
  requireLocalFile: boolean;
  runtime: QueueBatchProductScansInput['config']['runtime'];
}): Promise<ProductScanImageCandidates> => {
  const hydratedImageCandidates = await hydrateProductScanImageCandidates({
    product: input.product,
    imageCandidates: input.runtime.resolveImageCandidates(input.product),
  });
  return sanitizeProductScanImageCandidates(hydratedImageCandidates, {
    materializeUrlCandidates: input.materializeUrlCandidates,
    requireLocalFile: input.requireLocalFile,
  });
};

const resolvePreparedRequestContext = (input: {
  config: QueueBatchProductScansInput['config'];
  imageCandidates: ProductScanImageCandidates;
  product: QueuedProductRecord;
  requestInput: Record<string, unknown>;
}): Pick<
  PreparedQueuedProductScanItem,
  'amazonRuntimeKey' | 'effectiveRequestInput' | 'hasDirectAmazonCandidateInput' | 'selectorProfile'
> => {
  const effectiveRequestInput =
    input.config.provider === 'amazon'
      ? resolveEffectiveAmazonRequestInput({
          requestInput: input.requestInput,
          existingAsin: input.product.asin,
          hasUsableImageCandidates: input.imageCandidates.length > 0,
        })
      : input.requestInput;
  const hasDirectAmazonCandidateInput =
    input.config.provider === 'amazon' &&
    hasDirectAmazonCandidateRequestInput(effectiveRequestInput);

  return {
    amazonRuntimeKey: resolveQueuedAmazonRuntimeKey({
      config: input.config,
      effectiveRequestInput,
      hasDirectAmazonCandidateInput,
    }),
    effectiveRequestInput,
    hasDirectAmazonCandidateInput,
    selectorProfile:
      input.config.provider === 'amazon'
        ? resolveAmazonSelectorProfile(input.requestInput)
        : null,
  };
};

export const prepareQueuedProductScanItem = async (input: {
  productId: string;
  requestInput: Record<string, unknown>;
  scannerSettings: ProductScannerSettings;
  supplierConnectionContext: SupplierConnectionContext;
  config: QueueBatchProductScansInput['config'];
}): Promise<PreparedQueueProductScanResult> => {
  const product = await productService.getProductById(input.productId);
  if (product === null) return { kind: 'failed', result: createFailedBatchResult(input.productId, 'Product not found.') };

  const requireLocalFile =
    input.config.provider === '1688' &&
    !resolveAllow1688UrlImageSearchFallback(input.supplierConnectionContext, input.scannerSettings);
  const imageCandidates = await resolveImageCandidatesForQueuedProduct({
    materializeUrlCandidates: input.config.provider === '1688',
    product,
    requireLocalFile,
    runtime: input.config.runtime,
  });
  const requestContext = resolvePreparedRequestContext({
    config: input.config,
    imageCandidates,
    product,
    requestInput: input.requestInput,
  });
  if (imageCandidates.length === 0 && !requestContext.hasDirectAmazonCandidateInput) {
    return { kind: 'failed', result: createFailedBatchResult(input.productId, resolveMissingImageMessage(input.config.provider)) };
  }
  if (input.config.provider === '1688') {
    const failure = resolveSupplierConnectionFailure(input.productId, input.supplierConnectionContext);
    if (failure !== null) return { kind: 'failed', result: failure };
  }

  return {
    item: {
      ...requestContext,
      imageCandidates,
      product,
      productName: resolveQueuedProductName(product),
      requestedStepSequenceInput: resolveProductScanRequestSequenceInput(
        requestContext.effectiveRequestInput
      ),
    },
    kind: 'ready',
  };
};

export const startQueuedProductScanRun = async (input: {
  config: QueueBatchProductScansInput['config'];
  forceVisible?: boolean;
  item: PreparedQueuedProductScanItem;
  ownerUserId?: string | null;
  scannerSettings: ProductScannerSettings;
  supplierConnectionContext: SupplierConnectionContext;
}): Promise<StartedQueuedScanRun | ProductScanBatchItem> => {
  if (input.config.provider === 'amazon' && input.item.amazonRuntimeKey !== null) {
    return startAmazonQueuedProductScanRun({
      amazonRuntimeKey: input.item.amazonRuntimeKey,
      config: input.config,
      effectiveRequestInput: input.item.effectiveRequestInput,
      imageCandidates: input.item.imageCandidates,
      manualVerificationTimeoutMs: resolveScanManualVerificationTimeoutMs(input.scannerSettings),
      ownerUserId: input.ownerUserId,
      product: input.item.product,
      productName: input.item.productName,
      requestedStepSequenceInput: input.item.requestedStepSequenceInput,
      scannerSettings: input.scannerSettings,
      selectorProfile: input.item.selectorProfile ?? 'amazon',
    });
  }
  if (input.config.provider === '1688' && input.supplierConnectionContext !== null) {
    return startSupplier1688QueuedProductScanRun({
      config: input.config,
      forceVisible: input.forceVisible,
      imageCandidates: input.item.imageCandidates,
      manualVerificationTimeoutMs: resolveScanManualVerificationTimeoutMs(input.scannerSettings),
      ownerUserId: input.ownerUserId,
      product: input.item.product,
      productName: input.item.productName,
      requestedStepSequenceInput: input.item.requestedStepSequenceInput,
      scannerSettings: input.scannerSettings,
      supplierConnectionContext: input.supplierConnectionContext,
    });
  }
  return createFailedBatchResult(input.item.product.id, 'Failed to queue scan: missing connection.');
};

const resolveQueuedScanMessage = (
  provider: QueueBatchProductScansInput['config']['provider'],
  status: 'queued' | 'running'
): string => {
  if (provider === '1688') {
    return status === 'running' ? '1688 supplier scan running.' : '1688 supplier scan queued.';
  }
  return status === 'running' ? 'Amazon candidate search running.' : 'Amazon candidate search queued.';
};

export const persistQueuedProductScan = async (input: {
  config: QueueBatchProductScansInput['config'];
  item: PreparedQueuedProductScanItem;
  ownerUserId?: string | null;
  runtime: StartedQueuedScanRun;
}): Promise<ProductScanBatchItem> => {
  const startedRun = resolveStartedRun(input.runtime.run);
  if (startedRun === null) {
    return createFailedBatchResult(input.item.product.id, 'Failed to queue scan.');
  }

  const scan = await upsertProductScan({
    id: randomUUID(),
    productId: input.item.product.id,
    provider: input.config.provider,
    scanType: 'supplier_reverse_image',
    status: startedRun.status,
    engineRunId: startedRun.runId,
    productName: input.item.productName,
    asin: input.item.product.asin,
    imageCandidates: input.item.imageCandidates,
    asinUpdateStatus: 'pending',
    asinUpdateMessage:
      startedRun.status === 'running' ? 'Product scan running.' : 'Product scan queued.',
    rawResult: createProductScanStartedRawResult({
      runId: startedRun.runId,
      status: startedRun.status,
      runtimeKey: input.runtime.runtimeKey ?? input.config.runtime.runtimeKey,
      actionId: input.runtime.actionId,
      selectorProfile: input.runtime.selectorProfile,
      imageSearchProvider: input.runtime.imageSearchProvider,
      imageSearchPageUrl: input.runtime.imageSearchPageUrl,
      allowManualVerification: input.runtime.allowManualVerification,
      manualVerificationTimeoutMs: input.runtime.manualVerificationTimeoutMs,
      ...input.item.requestedStepSequenceInput,
      recordDiagnostics: input.runtime.recordDiagnostics,
    }),
    updatedBy: input.ownerUserId ?? null,
  });

  return {
    productId: input.item.product.id,
    scanId: scan.id,
    runId: startedRun.runId,
    status: startedRun.status,
    currentStatus: startedRun.status,
    message: resolveQueuedScanMessage(input.config.provider, startedRun.status),
  };
};

export type { PreparedQueuedProductScanItem };
