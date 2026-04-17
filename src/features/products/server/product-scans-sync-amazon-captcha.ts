import 'server-only';

import {
  createCustomPlaywrightInstance,
  startPlaywrightEngineTask,
  type PlaywrightEngineRunRecord,
} from '@/features/playwright/server';
import {
  createDefaultProductScannerSettings,
} from '@/features/products/scanner-settings';
import {
  type ProductScanRecord,
} from '@/shared/contracts/product-scans';
import { productService } from '@/shared/lib/products/services/productService';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  AMAZON_PRODUCT_SCAN_PROVIDER,
  type ProductScanScriptProviderRuntime,
} from './product-scan-providers';
import {
  buildProductScannerEngineRequestOptions,
  getProductScannerSettings,
} from './product-scanner-settings';

import {
  AMAZON_SCAN_TIMEOUT_MS,
  createAmazonScanStartedRawResult,
  normalizeErrorMessage,
  persistFailedSynchronization,
  persistSynchronizedScan,
  resolveManualVerificationMessage,
  resolvePersistedProductScanSteps,
  resolveProductScanRequestSequenceInput,
  resolveScanManualVerificationTimeoutMs,
  shouldAutoShowScannerCaptchaBrowser,
  toRecord,
  type AmazonScanScriptResult,
} from './product-scans-service.helpers';

import {
  buildAmazonScannerRequestRuntimeOptions,
  resolveAmazonImageSearchProvider,
  resolveAmazonImageSearchProviderHistory,
  resolveAmazonProbeEvaluatorConfig,
  resolveAmazonTriageEvaluatorConfig,
} from './product-scans-service.helpers.amazon';

const amazonScanRuntime = AMAZON_PRODUCT_SCAN_PROVIDER.runtime! as ProductScanScriptProviderRuntime;

type SynchronizeAmazonStatusInput = {
  scan: ProductScanRecord;
  run: PlaywrightEngineRunRecord;
  engineRunId: string;
  resultValue: unknown;
  parsedResult: AmazonScanScriptResult;
};

export async function synchronizeAmazonCaptchaRequired({
  scan,
  engineRunId,
  resultValue,
  parsedResult,
}: SynchronizeAmazonStatusInput): Promise<ProductScanRecord> {
  const manualVerificationMessage = resolveManualVerificationMessage(parsedResult.message);
  const existingRawResult = toRecord(scan.rawResult) ?? {};
  const nextSteps = resolvePersistedProductScanSteps(scan, parsedResult.steps);

  if (existingRawResult['captchaRetryStarted'] === true) {
    return await persistFailedSynchronization(
      scan,
      'Google Lens captcha verification was still required after reopening the browser.'
    );
  }

  const product = await productService.getProductById(scan.productId);
  if (!product) {
    return await persistFailedSynchronization(
      scan,
      'Product not found while reopening the Amazon scan for captcha verification.'
    );
  }

  let scannerSettings = createDefaultProductScannerSettings();
  try {
    scannerSettings = (await getProductScannerSettings()) ?? scannerSettings;
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'synchronizeProductScan.loadScannerSettingsForCaptchaRetry',
      scanId: scan.id,
      productId: scan.productId,
      engineRunId,
    });
  }

  const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(scannerSettings);
  if (!shouldAutoShowScannerCaptchaBrowser(scannerSettings)) {
    return await persistFailedSynchronization(
      scan,
      'Google Lens requested captcha verification, and scanner settings are configured to fail instead of reopening a visible browser.'
    );
  }

  const claimedScan = await persistSynchronizedScan(scan, {
    engineRunId: null,
    status: 'running',
    steps: nextSteps,
    rawResult: {
      ...existingRawResult,
      ...(toRecord(resultValue) ?? {}),
      previousRunId: engineRunId,
      captchaRetryStarted: true,
      manualVerificationPending: true,
      manualVerificationMessage,
      manualVerificationTimeoutMs,
    },
    error: null,
    asinUpdateStatus: 'pending',
    asinUpdateMessage: manualVerificationMessage,
    completedAt: null,
  });
  const requestedStepSequenceInput = resolveProductScanRequestSequenceInput(claimedScan.rawResult);

  try {
    const amazonCandidateEvaluatorEnabled = (
      await resolveAmazonProbeEvaluatorConfig(scannerSettings)
    ).enabled;
    const amazonCandidateTriageEnabled = (
      await resolveAmazonTriageEvaluatorConfig(scannerSettings)
    ).enabled;
    const scannerEngineRequestOptions =
      buildProductScannerEngineRequestOptions(scannerSettings);
    const scannerRuntimeOptions = buildAmazonScannerRequestRuntimeOptions({
      scannerSettings,
      scannerEngineRequestOptions,
      forceHeadless: false,
    });
    const amazonImageSearchProvider = resolveAmazonImageSearchProvider(
      claimedScan.rawResult,
      scannerSettings
    );
    const runRetry = await startPlaywrightEngineTask({
      request: {
        script: amazonScanRuntime.script,
        input: amazonScanRuntime.buildRequestInput({
          productId: product.id,
          productName: claimedScan.productName,
          existingAsin: product.asin,
          imageCandidates: claimedScan.imageCandidates,
          imageSearchProvider: amazonImageSearchProvider,
          allowManualVerification: true,
          manualVerificationTimeoutMs,
          triageOnlyOnAmazonCandidates: amazonCandidateTriageEnabled,
          probeOnlyOnAmazonMatch: amazonCandidateEvaluatorEnabled,
          ...requestedStepSequenceInput,
        }),
        timeoutMs: Math.max(AMAZON_SCAN_TIMEOUT_MS, manualVerificationTimeoutMs + 60_000),
        browserEngine: 'chromium',
        ...scannerRuntimeOptions,
        capture: {
          screenshot: true,
          html: true,
        },
        preventNewPages: true,
      },
      ownerUserId: claimedScan.updatedBy?.trim() || null,
      instance: createCustomPlaywrightInstance({
        family: 'scrape',
        label: 'Amazon reverse image ASIN scan',
        tags: ['product', 'amazon', 'scan', 'google-reverse-image', 'manual-verification'],
      }),
    });

    const retryRunStatus = runRetry.status === 'running' ? 'running' : 'queued';
    const retryManualVerificationPending = retryRunStatus === 'running';

    return await persistSynchronizedScan(claimedScan, {
      engineRunId: runRetry.runId,
      status: retryRunStatus,
      steps: claimedScan.steps,
      rawResult: {
        ...toRecord(claimedScan.rawResult),
        ...createAmazonScanStartedRawResult({
          runId: runRetry.runId,
          status: runRetry.status,
          imageSearchProvider: amazonImageSearchProvider,
          imageSearchProviderHistory: resolveAmazonImageSearchProviderHistory(
            claimedScan.rawResult,
            amazonImageSearchProvider
          ),
          allowManualVerification: true,
          manualVerificationTimeoutMs,
          previousRunId: engineRunId,
          previousResult: resultValue,
          manualVerificationPending: retryManualVerificationPending,
          manualVerificationMessage: retryManualVerificationPending
            ? manualVerificationMessage
            : null,
          ...requestedStepSequenceInput,
        }),
        captchaRetryStarted: true,
        ...(retryManualVerificationPending
          ? {
              manualVerificationPending: true,
              manualVerificationMessage,
            }
          : {
              manualVerificationPending: false,
              manualVerificationMessage: null,
            }),
      },
      error: null,
      asinUpdateStatus: 'pending',
      asinUpdateMessage: retryManualVerificationPending ? manualVerificationMessage : null,
      completedAt: null,
    });
  } catch (error: unknown) {
    const message = normalizeErrorMessage(
      error,
      'Failed to reopen the Amazon scan in a visible browser for captcha verification.'
    );
    return await persistSynchronizedScan(claimedScan, {
      status: 'failed',
      steps: claimedScan.steps,
      rawResult: {
        ...toRecord(claimedScan.rawResult),
        retryStartError: message,
      },
      error: message,
      asinUpdateStatus: 'failed',
      asinUpdateMessage: message,
      completedAt: new Date().toISOString(),
    });
  }
}
