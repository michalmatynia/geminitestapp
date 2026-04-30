import 'server-only';

import {
  createCustomPlaywrightInstance,
  startPlaywrightEngineTask,
  type PlaywrightEngineRunRecord,
} from '@/features/playwright/server';
import { createDefaultProductScannerSettings } from '@/features/products/scanner-settings';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import type { ProductWithImages } from '@/shared/contracts/products';
import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';
import {
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
  resolveAmazonRuntimeActionName,
} from '@/shared/lib/browser-execution/amazon-runtime-constants';
import { productService } from '@/shared/lib/products/services/productService';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { AMAZON_PRODUCT_SCAN_PROVIDER, requireProductScanNativeRuntime } from './product-scan-providers';
import {
  buildProductScannerEngineRequestOptions,
  getProductScannerSettings,
} from './product-scanner-settings';
import { resolveAmazonScanDiagnosticCapture } from './product-scan-amazon-diagnostics';
import {
  readOptionalString,
  resolveScanManualVerificationTimeoutMs,
  shouldAutoShowScannerCaptchaBrowser,
  toRecord,
  type AmazonScanRuntimeResult,
  type resolveProductScanRequestSequenceInput,
} from './product-scans-service.helpers';
import {
  buildAmazonScannerRequestRuntimeOptions,
  resolveAmazonImageSearchFallbackProvider,
  resolveAmazonImageSearchPageUrl,
  resolveAmazonImageSearchProvider,
  resolveAmazonImageSearchProviderHistory,
  resolveAmazonProbeEvaluatorConfig,
  resolveAmazonScanRuntimeTimeoutMs,
  resolveAmazonTriageEvaluatorConfig,
} from './product-scans-service.helpers.amazon';
import { persistAmazonFallbackProviderRun } from './product-scans-sync-amazon-fallback.persistence';
import type { AmazonScanRuntimeKey } from './product-scans-sync-amazon.runtime';
import { resolveScanOwnerUserId } from './product-scans-sync-amazon.runtime';

const amazonScanRuntime = requireProductScanNativeRuntime(AMAZON_PRODUCT_SCAN_PROVIDER);

type ScannerSettings = ReturnType<typeof createDefaultProductScannerSettings>;
type ScannerEngineRequestOptions = ReturnType<typeof buildProductScannerEngineRequestOptions>;
type ScannerRuntimeOptions = ReturnType<typeof buildAmazonScannerRequestRuntimeOptions>;
type FallbackProvider = NonNullable<
  ReturnType<typeof resolveAmazonImageSearchFallbackProvider>
>;
export type FallbackRun = Awaited<ReturnType<typeof startPlaywrightEngineTask>>;

export type AmazonFallbackProviderRetryInput = {
  scan: ProductScanRecord;
  run: PlaywrightEngineRunRecord;
  engineRunId: string;
  resultValue: unknown;
  parsedResult: AmazonScanRuntimeResult;
  currentAmazonRuntimeKey: AmazonScanRuntimeKey;
  currentAmazonRuntimeAction: PlaywrightAction | null;
  requestedStepSequenceInput: ReturnType<typeof resolveProductScanRequestSequenceInput>;
  persistedAmazonProbe: ProductScanRecord['amazonProbe'];
  existingAmazonEvaluation: ProductScanRecord['amazonEvaluation'];
};

export type FallbackRetryContext = AmazonFallbackProviderRetryInput & {
  product: ProductWithImages;
  scannerSettings: ScannerSettings;
  scannerEngineRequestOptions: ScannerEngineRequestOptions;
  scannerRuntimeOptions: ScannerRuntimeOptions;
  amazonImageSearchProvider: ReturnType<typeof resolveAmazonImageSearchProvider>;
  fallbackProvider: FallbackProvider;
  amazonImageSearchPageUrl: ReturnType<typeof resolveAmazonImageSearchPageUrl>;
  amazonSelectorProfile: string;
  manualVerificationTimeoutMs: number;
  providerHistory: ReturnType<typeof resolveAmazonImageSearchProviderHistory>;
  triageEvaluatorEnabled: boolean;
  probeEvaluatorEnabled: boolean;
  isCandidateSearchRuntime: boolean;
};

type FallbackProviderProduct = {
  product: ProductWithImages;
  provider: {
    currentProvider: ReturnType<typeof resolveAmazonImageSearchProvider>;
    fallbackProvider: FallbackProvider;
  };
};

const loadScannerSettingsForGoogleCandidatesFallback = async (
  input: AmazonFallbackProviderRetryInput
): Promise<ScannerSettings> => {
  let scannerSettings = createDefaultProductScannerSettings();
  try {
    scannerSettings = await getProductScannerSettings();
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'synchronizeProductScan.loadScannerSettingsForGoogleCandidatesFallback',
      scanId: input.scan.id,
      productId: input.scan.productId,
      engineRunId: input.engineRunId,
    });
  }
  return scannerSettings;
};

const resolveFallbackProvider = (
  input: AmazonFallbackProviderRetryInput,
  scannerSettings: ScannerSettings
): { currentProvider: ReturnType<typeof resolveAmazonImageSearchProvider>; fallbackProvider: FallbackProvider } | null => {
  const currentProvider = resolveAmazonImageSearchProvider(input.scan.rawResult, scannerSettings);
  const fallbackProvider = resolveAmazonImageSearchFallbackProvider({
    rawResult: input.scan.rawResult,
    scannerSettings,
    currentProvider,
    imageCandidates: input.scan.imageCandidates,
  });
  return fallbackProvider === null ? null : { currentProvider, fallbackProvider };
};

const resolveFallbackProviderProduct = async (
  input: AmazonFallbackProviderRetryInput,
  scannerSettings: ScannerSettings
): Promise<FallbackProviderProduct | null> => {
  const provider = resolveFallbackProvider(input, scannerSettings);
  if (provider === null) return null;
  const product = await productService.getProductById(input.scan.productId);
  return product === null ? null : { provider, product };
};

const createFallbackRetryContext = async (
  input: AmazonFallbackProviderRetryInput,
  scannerSettings: ScannerSettings
): Promise<FallbackRetryContext | null> => {
  const fallbackProduct = await resolveFallbackProviderProduct(input, scannerSettings);
  if (fallbackProduct === null) return null;
  const scannerEngineRequestOptions = buildProductScannerEngineRequestOptions(scannerSettings);
  const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(scannerSettings);
  const [triageConfig, probeConfig] = await Promise.all([
    resolveAmazonTriageEvaluatorConfig(scannerSettings),
    resolveAmazonProbeEvaluatorConfig(scannerSettings),
  ]);
  return {
    ...input,
    product: fallbackProduct.product,
    scannerSettings,
    scannerEngineRequestOptions,
    scannerRuntimeOptions: buildAmazonScannerRequestRuntimeOptions({
      scannerSettings,
      scannerEngineRequestOptions,
      actionExecutionSettings: input.currentAmazonRuntimeAction?.executionSettings ?? null,
      actionPersonaId: input.currentAmazonRuntimeAction?.personaId ?? null,
      runtimeKey: input.currentAmazonRuntimeKey,
    }),
    amazonImageSearchProvider: fallbackProduct.provider.currentProvider,
    fallbackProvider: fallbackProduct.provider.fallbackProvider,
    amazonImageSearchPageUrl: resolveAmazonImageSearchPageUrl(input.scan.rawResult, scannerSettings),
    amazonSelectorProfile:
      readOptionalString(toRecord(input.scan.rawResult)?.['selectorProfile'], 120) ?? 'amazon',
    manualVerificationTimeoutMs,
    providerHistory: resolveAmazonImageSearchProviderHistory(input.scan.rawResult, fallbackProduct.provider.currentProvider),
    triageEvaluatorEnabled: triageConfig.enabled,
    probeEvaluatorEnabled: probeConfig.enabled,
    isCandidateSearchRuntime:
      input.currentAmazonRuntimeKey === AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
  };
};

const startAmazonFallbackProviderRun = async (
  context: FallbackRetryContext
): Promise<FallbackRun> => {
  const allowManualVerification = shouldAutoShowScannerCaptchaBrowser(context.scannerSettings);
  return await startPlaywrightEngineTask({
    request: {
      runtimeKey: context.currentAmazonRuntimeKey,
      actionId: context.currentAmazonRuntimeAction?.id ?? null,
      actionName:
        context.currentAmazonRuntimeAction?.name ??
        resolveAmazonRuntimeActionName(context.currentAmazonRuntimeKey),
      selectorProfile: context.amazonSelectorProfile,
      input: amazonScanRuntime.buildRequestInput({
        productId: context.product.id,
        productName: context.scan.productName,
        existingAsin: context.product.asin,
        imageCandidates: context.scan.imageCandidates,
        runtimeKey: context.currentAmazonRuntimeKey,
        imageSearchProvider: context.fallbackProvider,
        imageSearchPageUrl: context.amazonImageSearchPageUrl,
        selectorProfile: context.amazonSelectorProfile,
        allowManualVerification,
        manualVerificationTimeoutMs: context.manualVerificationTimeoutMs,
        triageOnlyOnAmazonCandidates: context.isCandidateSearchRuntime ? false : context.triageEvaluatorEnabled,
        collectAmazonCandidatePreviews: context.isCandidateSearchRuntime,
        probeOnlyOnAmazonMatch: context.isCandidateSearchRuntime ? false : context.probeEvaluatorEnabled,
        skipAmazonProbe: false,
        ...context.requestedStepSequenceInput,
      }),
      timeoutMs: resolveAmazonScanRuntimeTimeoutMs({
        allowManualVerification,
        manualVerificationTimeoutMs: context.manualVerificationTimeoutMs,
      }),
      browserEngine: 'chromium',
      ...context.scannerRuntimeOptions,
      capture: resolveAmazonScanDiagnosticCapture(context.scan.rawResult),
      preventNewPages: true,
    },
    ownerUserId: resolveScanOwnerUserId(context.scan),
    instance: createCustomPlaywrightInstance({
      family: 'scrape',
      label: 'Amazon fallback provider scan',
      tags: ['product', 'amazon', 'scan', 'provider-fallback'],
    }),
  });
};

export const retryAmazonScanWithFallbackProviderAfterNoCandidates = async (
  input: AmazonFallbackProviderRetryInput
): Promise<ProductScanRecord | null> => {
  if (input.currentAmazonRuntimeKey === AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY) {
    return null;
  }

  const scannerSettings = await loadScannerSettingsForGoogleCandidatesFallback(input);
  try {
    const context = await createFallbackRetryContext(input, scannerSettings);
    if (context === null) return null;
    return await persistAmazonFallbackProviderRun(
      context,
      await startAmazonFallbackProviderRun(context)
    );
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'synchronizeProductScan.retryGoogleCandidatesFallback',
      scanId: input.scan.id,
      productId: input.scan.productId,
      engineRunId: input.engineRunId,
    });
    return null;
  }
};
