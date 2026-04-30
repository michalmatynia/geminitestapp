import 'server-only';

import type { PlaywrightEngineRunRecord } from '@/features/playwright/server';
import { createDefaultProductScannerSettings } from '@/features/products/scanner-settings';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import { productService } from '@/shared/lib/products/services/productService';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  buildProductScannerEngineRequestOptions,
  getProductScannerSettings,
} from './product-scanner-settings';
import { resolveAmazonScanDiagnosticCapture } from './product-scan-amazon-diagnostics';
import {
  buildAmazonScannerRequestRuntimeOptions,
  resolveAmazonImageSearchPageUrl,
  resolveAmazonImageSearchProvider,
  resolveAmazonProductScanRuntimeKey,
  resolveAmazonRuntimeActionDefinition,
} from './product-scans-service.helpers.amazon';
import {
  persistFailedSynchronization,
  persistSynchronizedScan,
  readOptionalString,
  resolveManualVerificationMessage,
  resolvePersistedProductScanSteps,
  resolveScanManualVerificationTimeoutMs,
  shouldAutoShowScannerCaptchaBrowser,
  toRecord,
  upsertPersistedProductScanStep,
  type AmazonScanRuntimeResult,
} from './product-scans-service.helpers';
import {
  attemptAmazonCaptchaStealthRetry,
  type AmazonCaptchaRetryContext,
} from './product-scans-sync-amazon-captcha.retry';
import { startAmazonCaptchaManualRetry } from './product-scans-sync-amazon-captcha.manual';
import { buildAmazonCaptchaStealthRetrySkippedStep } from './product-scans-sync-amazon-captcha.steps';

type SynchronizeAmazonStatusInput = {
  scan: ProductScanRecord;
  run: PlaywrightEngineRunRecord;
  engineRunId: string;
  resultValue: unknown;
  parsedResult: AmazonScanRuntimeResult;
};

const shouldAttemptAmazonCaptchaStealthRetry = (
  settingsOverrides: Record<string, unknown> | null,
  existingRawResult: Record<string, unknown>
): boolean =>
  existingRawResult['captchaStealthRetryStarted'] !== true &&
  settingsOverrides?.['proxyEnabled'] === true;

const shouldRecordAmazonCaptchaStealthRetrySkip = (
  settingsOverrides: Record<string, unknown> | null,
  existingRawResult: Record<string, unknown>
): boolean =>
  existingRawResult['captchaStealthRetryStarted'] !== true &&
  settingsOverrides?.['proxyEnabled'] !== true;

const loadScannerSettingsForCaptchaRetry = async (input: {
  scan: ProductScanRecord;
  engineRunId: string;
}): Promise<ReturnType<typeof createDefaultProductScannerSettings>> => {
  let scannerSettings = createDefaultProductScannerSettings();
  try {
    scannerSettings = await getProductScannerSettings();
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'synchronizeProductScan.loadScannerSettingsForCaptchaRetry',
      scanId: input.scan.id,
      productId: input.scan.productId,
      engineRunId: input.engineRunId,
    });
  }
  return scannerSettings;
};

const buildAmazonCaptchaRetryContext = async (input: {
  scan: ProductScanRecord;
  engineRunId: string;
  resultValue: unknown;
  parsedResult: AmazonScanRuntimeResult;
  existingRawResult: Record<string, unknown>;
  product: NonNullable<Awaited<ReturnType<typeof productService.getProductById>>>;
}): Promise<AmazonCaptchaRetryContext> => {
  const scannerSettings = await loadScannerSettingsForCaptchaRetry(input);
  const amazonRuntimeKey = resolveAmazonProductScanRuntimeKey(
    toRecord(input.scan.rawResult)?.['runtimeKey']
  );
  const amazonRuntimeAction = await resolveAmazonRuntimeActionDefinition(amazonRuntimeKey);
  const scannerEngineRequestOptions = buildProductScannerEngineRequestOptions(scannerSettings);
  const baseScannerRuntimeOptions = buildAmazonScannerRequestRuntimeOptions({
    scannerSettings,
    scannerEngineRequestOptions,
    actionExecutionSettings: amazonRuntimeAction?.executionSettings ?? null,
    actionPersonaId: amazonRuntimeAction?.personaId ?? null,
    runtimeKey: amazonRuntimeKey,
    forceHeadless: true,
  });

  return {
    ...input,
    scannerSettings,
    manualVerificationTimeoutMs: resolveScanManualVerificationTimeoutMs(scannerSettings),
    amazonRuntimeKey,
    amazonRuntimeAction,
    scannerEngineRequestOptions,
    baseScannerRuntimeOptions,
    amazonImageSearchProvider: resolveAmazonImageSearchProvider(
      input.scan.rawResult,
      scannerSettings
    ),
    amazonImageSearchPageUrl: resolveAmazonImageSearchPageUrl(
      input.scan.rawResult,
      scannerSettings
    ),
    amazonSelectorProfile:
      readOptionalString(toRecord(input.scan.rawResult)?.['selectorProfile'], 120) ?? 'amazon',
    diagnosticCapture: resolveAmazonScanDiagnosticCapture(input.scan.rawResult),
  };
};

const persistAmazonCaptchaSettingsFailure = (
  context: AmazonCaptchaRetryContext,
  nextSteps: ProductScanRecord['steps']
): Promise<ProductScanRecord> => {
  const message =
    'Google Lens requested captcha verification, and scanner settings are configured to fail instead of reopening a visible browser.';
  return persistSynchronizedScan(context.scan, {
    status: 'failed',
    steps: nextSteps,
    error: message,
    asinUpdateStatus: 'failed',
    asinUpdateMessage: message,
    completedAt: new Date().toISOString(),
  });
};

const attemptAmazonCaptchaStealthRetryIfEnabled = async (input: {
  context: AmazonCaptchaRetryContext;
  nextSteps: ProductScanRecord['steps'];
  baseSettingsOverrides: Record<string, unknown> | null;
}): Promise<ProductScanRecord | null> => {
  if (
    !shouldAttemptAmazonCaptchaStealthRetry(
      input.baseSettingsOverrides,
      input.context.existingRawResult
    )
  ) {
    return null;
  }
  return await attemptAmazonCaptchaStealthRetry(input.context, input.nextSteps);
};

const appendAmazonCaptchaStealthRetrySkippedStep = (input: {
  context: AmazonCaptchaRetryContext;
  nextSteps: ProductScanRecord['steps'];
  baseSettingsOverrides: Record<string, unknown> | null;
}): ProductScanRecord['steps'] => {
  if (
    !shouldRecordAmazonCaptchaStealthRetrySkip(
      input.baseSettingsOverrides,
      input.context.existingRawResult
    )
  ) {
    return input.nextSteps;
  }
  return upsertPersistedProductScanStep(
    input.nextSteps,
    buildAmazonCaptchaStealthRetrySkippedStep({
      scan: { ...input.context.scan, steps: input.nextSteps },
      previousRunId: input.context.engineRunId,
      parsedResult: input.context.parsedResult,
    })
  );
};

export async function synchronizeAmazonCaptchaRequired({
  scan,
  engineRunId,
  resultValue,
  parsedResult,
}: SynchronizeAmazonStatusInput): Promise<ProductScanRecord> {
  const manualVerificationMessage = resolveManualVerificationMessage(parsedResult.message);
  const existingRawResult = toRecord(scan.rawResult) ?? {};
  let nextSteps = resolvePersistedProductScanSteps(scan, parsedResult.steps);

  if (
    existingRawResult['captchaRetryStarted'] === true ||
    existingRawResult['captchaManualRetryStarted'] === true
  ) {
    return await persistFailedSynchronization(
      scan,
      'Google Lens captcha verification was still required after reopening the browser.'
    );
  }

  const product = await productService.getProductById(scan.productId);
  if (product === null) {
    return await persistFailedSynchronization(
      scan,
      'Product not found while reopening the Amazon scan for captcha verification.'
    );
  }

  const context = await buildAmazonCaptchaRetryContext({
    scan,
    engineRunId,
    resultValue,
    parsedResult,
    existingRawResult,
    product,
  });
  const baseSettingsOverrides = toRecord(context.baseScannerRuntimeOptions.settingsOverrides);

  const stealthRetryResult = await attemptAmazonCaptchaStealthRetryIfEnabled({
    context,
    nextSteps,
    baseSettingsOverrides,
  });
  if (stealthRetryResult !== null) return stealthRetryResult;

  nextSteps = appendAmazonCaptchaStealthRetrySkippedStep({
    context,
    nextSteps,
    baseSettingsOverrides,
  });

  if (!shouldAutoShowScannerCaptchaBrowser(context.scannerSettings)) {
    return await persistAmazonCaptchaSettingsFailure(context, nextSteps);
  }

  return await startAmazonCaptchaManualRetry(context, nextSteps, manualVerificationMessage);
}
