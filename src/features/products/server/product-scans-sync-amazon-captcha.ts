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
  resolveAmazonRuntimeActionName,
} from '@/shared/lib/browser-execution/amazon-runtime-constants';

import {
  AMAZON_PRODUCT_SCAN_PROVIDER,
  requireProductScanNativeRuntime,
} from './product-scan-providers';
import {
  buildProductScannerEngineRequestOptions,
  getProductScannerSettings,
} from './product-scanner-settings';

import {
  createProductScanStartedRawResult,
  normalizeErrorMessage,
  persistFailedSynchronization,
  persistSynchronizedScan,
  resolveManualVerificationMessage,
  resolvePersistedProductScanSteps,
  upsertPersistedProductScanStep,
  resolveProductScanRequestSequenceInput,
  resolveScanManualVerificationTimeoutMs,
  shouldAutoShowScannerCaptchaBrowser,
  readOptionalString,
  toRecord,
  type AmazonScanRuntimeResult,
} from './product-scans-service.helpers';

import {
  buildAmazonScannerRequestRuntimeOptions,
  resolveAmazonImageSearchProvider,
  resolveAmazonImageSearchPageUrl,
  resolveAmazonImageSearchProviderHistory,
  resolveAmazonProductScanRuntimeKey,
  resolveAmazonProbeEvaluatorConfig,
  resolveAmazonRuntimeActionDefinition,
  resolveAmazonScanRuntimeTimeoutMs,
  resolveAmazonTriageEvaluatorConfig,
} from './product-scans-service.helpers.amazon';
import { resolveAmazonScanDiagnosticCapture } from './product-scan-amazon-diagnostics';

const amazonScanRuntime = requireProductScanNativeRuntime(AMAZON_PRODUCT_SCAN_PROVIDER);

type SynchronizeAmazonStatusInput = {
  scan: ProductScanRecord;
  run: PlaywrightEngineRunRecord;
  engineRunId: string;
  resultValue: unknown;
  parsedResult: AmazonScanRuntimeResult;
};

const shouldAttemptAmazonCaptchaStealthRetry = (
  settingsOverrides: Record<string, unknown> | null | undefined,
  existingRawResult: Record<string, unknown>
): boolean =>
  existingRawResult['captchaStealthRetryStarted'] !== true &&
  settingsOverrides?.['proxyEnabled'] === true;

const buildAmazonCaptchaStealthRetrySkippedStep = (input: {
  scan: ProductScanRecord;
  previousRunId: string;
  parsedResult: AmazonScanRuntimeResult;
}): ProductScanRecord['steps'][number] =>
  ({
    key: 'google_stealth_retry_skipped',
    label: 'Skip automatic Google retry',
    group: 'google_lens',
    status: 'skipped',
    resultCode: 'proxy_unavailable',
    message:
      'Skipped automatic Google retry because no proxy is configured; continuing to manual verification settings.',
    details: [
      { label: 'Retry mode', value: 'Rotate proxy session' },
      { label: 'Skip reason', value: 'Proxy is not enabled for this scanner runtime' },
      { label: 'Previous run ID', value: input.previousRunId },
      { label: 'Blocked stage', value: input.parsedResult.stage },
      { label: 'Blocked URL', value: input.parsedResult.currentUrl },
    ].filter(
      (
        detail
      ): detail is {
        label: string;
        value: string;
      } => typeof detail.value === 'string' && detail.value.trim() !== ''
    ),
    url: input.parsedResult.currentUrl,
    attempt:
      input.scan.steps.filter((step) => step.key === 'google_stealth_retry_skipped').length + 1,
    retryOf: input.previousRunId,
    inputSource: 'url',
    candidateId: null,
    candidateRank: null,
    warning: null,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: null,
  }) satisfies ProductScanRecord['steps'][number];

const buildAmazonCaptchaStealthRetryStep = (input: {
  scan: ProductScanRecord;
  previousRunId: string;
  retryRunId: string;
  retryRunStatus: 'queued' | 'running';
  parsedResult: AmazonScanRuntimeResult;
}): ProductScanRecord['steps'][number] =>
  ({
    key: 'google_stealth_retry',
    label: 'Retry Google candidate search with fresh proxy session',
    group: 'google_lens',
    status: 'completed',
    resultCode: input.retryRunStatus === 'running' ? 'run_started' : 'run_queued',
    message:
      'Queued an automatic Google retry with a fresh proxy session before manual fallback.',
    details: [
      { label: 'Retry mode', value: 'Rotate proxy session' },
      { label: 'Previous run ID', value: input.previousRunId },
      { label: 'Retry run ID', value: input.retryRunId },
      { label: 'Blocked stage', value: input.parsedResult.stage },
      { label: 'Blocked URL', value: input.parsedResult.currentUrl },
    ].filter(
      (
        detail
      ): detail is {
        label: string;
        value: string;
      } => typeof detail.value === 'string' && detail.value.trim() !== ''
    ),
    url: input.parsedResult.currentUrl,
    attempt:
      input.scan.steps.filter((step) => step.key === 'google_stealth_retry').length + 1,
    retryOf: input.previousRunId,
    inputSource: 'url',
    candidateId: null,
    candidateRank: null,
    warning: null,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: null,
  }) satisfies ProductScanRecord['steps'][number];

const buildAmazonCaptchaManualRetryStep = (input: {
  scan: ProductScanRecord;
  previousRunId: string;
  retryRunId: string;
  retryRunStatus: 'queued' | 'running';
  parsedResult: AmazonScanRuntimeResult;
  recoveryPath: 'After captcha block' | 'After automatic retry';
}): ProductScanRecord['steps'][number] =>
  ({
    key: 'google_manual_retry',
    label: 'Open Google candidate search in visible browser',
    group: 'google_lens',
    status: 'completed',
    resultCode: input.retryRunStatus === 'running' ? 'run_started' : 'run_queued',
    message:
      input.retryRunStatus === 'running'
        ? 'Opened a visible browser for Google captcha verification.'
        : 'Queued a visible browser for Google captcha verification.',
    details: [
      { label: 'Recovery path', value: input.recoveryPath },
      { label: 'Retry mode', value: 'Visible browser' },
      { label: 'Previous run ID', value: input.previousRunId },
      { label: 'Retry run ID', value: input.retryRunId },
      { label: 'Blocked stage', value: input.parsedResult.stage },
      { label: 'Opened URL', value: input.parsedResult.currentUrl },
    ].filter(
      (
        detail
      ): detail is {
        label: string;
        value: string;
      } => typeof detail.value === 'string' && detail.value.trim() !== ''
    ),
    url: input.parsedResult.currentUrl,
    attempt:
      input.scan.steps.filter((step) => step.key === 'google_manual_retry').length + 1,
    retryOf: input.previousRunId,
    inputSource: 'url',
    candidateId: null,
    candidateRank: null,
    warning: null,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: null,
  }) satisfies ProductScanRecord['steps'][number];

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
  const amazonRuntimeKey = resolveAmazonProductScanRuntimeKey(
    toRecord(scan.rawResult)?.['runtimeKey']
  );
  const amazonRuntimeAction = await resolveAmazonRuntimeActionDefinition(amazonRuntimeKey);
  const scannerEngineRequestOptions =
    buildProductScannerEngineRequestOptions(scannerSettings);
  const baseScannerRuntimeOptions = buildAmazonScannerRequestRuntimeOptions({
    scannerSettings,
    scannerEngineRequestOptions,
    actionExecutionSettings: amazonRuntimeAction?.executionSettings ?? null,
    actionPersonaId: amazonRuntimeAction?.personaId ?? null,
    runtimeKey: amazonRuntimeKey,
    forceHeadless: true,
  });
  const baseSettingsOverrides = toRecord(baseScannerRuntimeOptions.settingsOverrides);
  const amazonImageSearchProvider = resolveAmazonImageSearchProvider(
    scan.rawResult,
    scannerSettings
  );
  const amazonImageSearchPageUrl = resolveAmazonImageSearchPageUrl(
    scan.rawResult,
    scannerSettings
  );
  const amazonSelectorProfile =
    readOptionalString(toRecord(scan.rawResult)?.['selectorProfile'], 120) ?? 'amazon';
  const diagnosticCapture = resolveAmazonScanDiagnosticCapture(scan.rawResult);

  if (
    shouldAttemptAmazonCaptchaStealthRetry(
      baseSettingsOverrides,
      existingRawResult
    )
  ) {
    const claimedScan = await persistSynchronizedScan(scan, {
      engineRunId: null,
      status: 'running',
      steps: nextSteps,
      rawResult: {
        ...existingRawResult,
        ...(toRecord(resultValue) ?? {}),
        previousRunId: engineRunId,
        captchaStealthRetryStarted: true,
        captchaStealthRetryMode: 'rotate',
        manualVerificationPending: false,
        manualVerificationMessage: null,
        manualVerificationTimeoutMs,
      },
      error: null,
      asinUpdateStatus: 'pending',
      asinUpdateMessage: null,
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
      const stealthSettingsOverrides = {
        ...(toRecord(baseScannerRuntimeOptions.settingsOverrides) ?? {}),
        headless: true,
        proxySessionAffinity: true,
        proxySessionMode: 'rotate',
      };
      const runRetry = await startPlaywrightEngineTask({
        request: {
          runtimeKey: amazonScanRuntime.runtimeKey,
          actionId: amazonRuntimeAction?.id ?? null,
          actionName:
            amazonRuntimeAction?.name ??
            resolveAmazonRuntimeActionName(amazonScanRuntime.runtimeKey),
          selectorProfile: amazonSelectorProfile,
          input: amazonScanRuntime.buildRequestInput({
            productId: product.id,
            productName: claimedScan.productName,
            existingAsin: product.asin,
            imageCandidates: claimedScan.imageCandidates,
            imageSearchProvider: amazonImageSearchProvider,
            imageSearchPageUrl: amazonImageSearchPageUrl,
            selectorProfile: amazonSelectorProfile,
            allowManualVerification: false,
            manualVerificationTimeoutMs,
            triageOnlyOnAmazonCandidates: amazonCandidateTriageEnabled,
            probeOnlyOnAmazonMatch: amazonCandidateEvaluatorEnabled,
            ...requestedStepSequenceInput,
          }),
          timeoutMs: resolveAmazonScanRuntimeTimeoutMs({
            allowManualVerification: false,
            manualVerificationTimeoutMs,
          }),
          browserEngine: 'chromium',
          ...baseScannerRuntimeOptions,
          settingsOverrides: stealthSettingsOverrides,
          capture: diagnosticCapture,
          preventNewPages: true,
        },
        ownerUserId: claimedScan.updatedBy?.trim() || null,
        instance: createCustomPlaywrightInstance({
          family: 'scrape',
          label: 'Amazon captcha stealth retry',
          tags: ['product', 'amazon', 'scan', 'google-lens-candidate-search', 'captcha-stealth-retry'],
        }),
      });

      const retryRunStatus = runRetry.status === 'running' ? 'running' : 'queued';
      const retryStep = buildAmazonCaptchaStealthRetryStep({
        scan: claimedScan,
        previousRunId: engineRunId,
        retryRunId: runRetry.runId,
        retryRunStatus,
        parsedResult,
      });
      return await persistSynchronizedScan(claimedScan, {
        engineRunId: runRetry.runId,
        status: retryRunStatus,
        steps: upsertPersistedProductScanStep(claimedScan.steps, retryStep),
        rawResult: {
          ...toRecord(claimedScan.rawResult),
          ...createProductScanStartedRawResult({
            runId: runRetry.runId,
            status: runRetry.status,
            runtimeKey: amazonScanRuntime.runtimeKey,
            actionId: amazonRuntimeAction?.id ?? null,
            selectorProfile: amazonSelectorProfile,
            imageSearchProvider: amazonImageSearchProvider,
            imageSearchPageUrl: amazonImageSearchPageUrl,
            imageSearchProviderHistory: resolveAmazonImageSearchProviderHistory(
              claimedScan.rawResult,
              amazonImageSearchProvider
            ),
            allowManualVerification: false,
            manualVerificationTimeoutMs,
            previousRunId: engineRunId,
            previousResult: resultValue,
            manualVerificationPending: false,
            manualVerificationMessage: null,
            recordDiagnostics: diagnosticCapture.trace === true,
            ...requestedStepSequenceInput,
          }),
          captchaStealthRetryStarted: true,
          captchaStealthRetryMode: 'rotate',
          captchaStealthRetryRunId: runRetry.runId,
          manualVerificationPending: false,
          manualVerificationMessage: null,
        },
        error: null,
        asinUpdateStatus: 'pending',
        asinUpdateMessage: null,
        completedAt: null,
      });
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'product-scans.service',
        action: 'synchronizeProductScan.startCaptchaStealthRetry',
        scanId: claimedScan.id,
        productId: claimedScan.productId,
        engineRunId,
      });
    }
  }

  if (
    existingRawResult['captchaStealthRetryStarted'] !== true &&
    baseSettingsOverrides?.['proxyEnabled'] !== true
  ) {
    nextSteps = upsertPersistedProductScanStep(
      nextSteps,
      buildAmazonCaptchaStealthRetrySkippedStep({
        scan: { ...scan, steps: nextSteps },
        previousRunId: engineRunId,
        parsedResult,
      })
    );
  }

  if (!shouldAutoShowScannerCaptchaBrowser(scannerSettings)) {
    const message =
      'Google Lens requested captcha verification, and scanner settings are configured to fail instead of reopening a visible browser.';
    return await persistSynchronizedScan(scan, {
      status: 'failed',
      steps: nextSteps,
      error: message,
      asinUpdateStatus: 'failed',
      asinUpdateMessage: message,
      completedAt: new Date().toISOString(),
    });
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
    const scannerRuntimeOptions = buildAmazonScannerRequestRuntimeOptions({
      scannerSettings,
      scannerEngineRequestOptions,
      actionExecutionSettings: amazonRuntimeAction?.executionSettings ?? null,
      actionPersonaId: amazonRuntimeAction?.personaId ?? null,
      runtimeKey: amazonRuntimeKey,
      forceHeadless: false,
    });
    const runRetry = await startPlaywrightEngineTask({
      request: {
        runtimeKey: amazonScanRuntime.runtimeKey,
        actionId: amazonRuntimeAction?.id ?? null,
        actionName:
          amazonRuntimeAction?.name ??
          resolveAmazonRuntimeActionName(amazonScanRuntime.runtimeKey),
        selectorProfile: amazonSelectorProfile,
        input: amazonScanRuntime.buildRequestInput({
          productId: product.id,
          productName: claimedScan.productName,
          existingAsin: product.asin,
          imageCandidates: claimedScan.imageCandidates,
          imageSearchProvider: amazonImageSearchProvider,
          imageSearchPageUrl: amazonImageSearchPageUrl,
          selectorProfile: amazonSelectorProfile,
          allowManualVerification: true,
          manualVerificationTimeoutMs,
          triageOnlyOnAmazonCandidates: amazonCandidateTriageEnabled,
          probeOnlyOnAmazonMatch: amazonCandidateEvaluatorEnabled,
          ...requestedStepSequenceInput,
        }),
        timeoutMs: resolveAmazonScanRuntimeTimeoutMs({
          allowManualVerification: true,
          manualVerificationTimeoutMs,
        }),
        browserEngine: 'chromium',
        ...scannerRuntimeOptions,
        capture: diagnosticCapture,
        preventNewPages: true,
      },
      ownerUserId: claimedScan.updatedBy?.trim() || null,
      instance: createCustomPlaywrightInstance({
        family: 'scrape',
        label: 'Amazon candidate search manual verification',
        tags: ['product', 'amazon', 'scan', 'google-lens-candidate-search', 'manual-verification'],
      }),
    });

    const retryRunStatus = runRetry.status === 'running' ? 'running' : 'queued';
    const retryManualVerificationPending = retryRunStatus === 'running';
    const manualRetryStep = buildAmazonCaptchaManualRetryStep({
      scan: claimedScan,
      previousRunId: engineRunId,
      retryRunId: runRetry.runId,
      retryRunStatus,
      parsedResult,
      recoveryPath:
        existingRawResult['captchaStealthRetryStarted'] === true
          ? 'After automatic retry'
          : 'After captcha block',
    });

    return await persistSynchronizedScan(claimedScan, {
      engineRunId: runRetry.runId,
      status: retryRunStatus,
      steps: upsertPersistedProductScanStep(claimedScan.steps, manualRetryStep),
      rawResult: {
        ...toRecord(claimedScan.rawResult),
        ...createProductScanStartedRawResult({
          runId: runRetry.runId,
          status: runRetry.status,
          runtimeKey: amazonScanRuntime.runtimeKey,
          actionId: amazonRuntimeAction?.id ?? null,
          selectorProfile: amazonSelectorProfile,
          imageSearchProvider: amazonImageSearchProvider,
          imageSearchPageUrl: amazonImageSearchPageUrl,
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
          recordDiagnostics: diagnosticCapture.trace === true,
          ...requestedStepSequenceInput,
        }),
        captchaRetryStarted: true,
        captchaManualRetryStarted: true,
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
