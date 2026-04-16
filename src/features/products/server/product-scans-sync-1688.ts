import 'server-only';

import {
  buildPlaywrightEngineRunFailureMeta,
  collectPlaywrightEngineRunFailureMessages,
  readPlaywrightEngineRun,
  resolvePlaywrightEngineRunOutputs,
} from '@/features/playwright/server';
import { type PlaywrightConnectionSettingsOverridesInput } from '@/features/playwright/server/connection-runtime';
import {
  createDefaultProductScannerSettings,
} from '@/features/products/scanner-settings';
import {
  type ProductScanRecord,
  type ProductScanStatus,
} from '@/shared/contracts/product-scans';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { productService } from '@/shared/lib/products/services/productService';

import { evaluate1688SupplierCandidateMatch } from './product-scan-1688-evaluator';
import {
  getProductScanProviderDefinition,
  type ProductScanProviderRuntime,
} from './product-scan-providers';
import {
  getProductScannerSettings,
  resolveProductScanner1688CandidateEvaluatorConfig,
} from './product-scanner-settings';

import {
  PRODUCT_SCAN_ORPHANED_ACTIVE_MAX_AGE_MS,
  toRecord,
  readOptionalString,
  normalizeErrorMessage,
  resolvePersistableScanUrl,
  resolveIsoAgeMs,
  resolveScanEngineRunId,
  resolveScanManualVerificationTimeoutMs,
  areProductScanStepsEqual,
  resolvePersistedProductScanSteps,
  persistSynchronizedScan,
  persistFailedSynchronization,
  parse1688ScanScriptResult,
} from './product-scans-service.helpers';

export const SCANNER_1688_MISSING_PROFILE_MESSAGE =
  'No 1688 browser profile is configured. Create or select a 1688 connection before scanning.';
export const SCANNER_1688_MANUAL_VERIFICATION_MESSAGE =
  '1688 requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.';
export const SCANNER_1688_MISSING_LOCAL_IMAGE_MESSAGE =
  'No local product image file available for 1688 supplier reverse image scan.';
export const SCANNER_1688_UNUSABLE_IMAGE_INPUT_PATTERN =
  /Product image candidate did not include a usable filepath or URL for 1688 scanning/i;
export const SCANNER_1688_DEFAULT_LOCALE = 'zh-CN';
export const SCANNER_1688_DEFAULT_TIMEZONE_ID = 'Asia/Shanghai';
export const SCANNER_1688_DEFAULT_SLOW_MO_MS = 140;

export const supplierScanRuntime: ProductScanProviderRuntime = getProductScanProviderDefinition('1688').runtime!;

export const resolve1688ManualVerificationMessage = (
  value: unknown,
  fallback?: unknown
): string => {
  const normalized =
    readOptionalString(value) ??
    readOptionalString(fallback) ??
    SCANNER_1688_MANUAL_VERIFICATION_MESSAGE;
  if (/continue automatically/i.test(normalized)) {
    return normalized;
  }
  if (/requested login/i.test(normalized)) {
    return normalized;
  }
  return SCANNER_1688_MANUAL_VERIFICATION_MESSAGE;
};

export const normalize1688ScanFailureMessage = (value: unknown, fallback: string): string => {
  const normalized = normalizeErrorMessage(value, fallback);
  return SCANNER_1688_UNUSABLE_IMAGE_INPUT_PATTERN.test(normalized)
    ? SCANNER_1688_MISSING_LOCAL_IMAGE_MESSAGE
    : normalized;
};

export const resolve1688ConnectionEngineSettings = (
  settings: Record<string, unknown>,
  options: { forceVisible: boolean }
): PlaywrightConnectionSettingsOverridesInput => {
  const slowMo = settings['slowMo'];
  const mouseJitter = settings['mouseJitter'];
  return {
    ...settings,
    ...(options.forceVisible ? { headless: false } : {}),
    locale: readOptionalString(settings['locale']) ?? SCANNER_1688_DEFAULT_LOCALE,
    timezoneId:
      readOptionalString(settings['timezoneId']) ?? SCANNER_1688_DEFAULT_TIMEZONE_ID,
    humanizeMouse:
      typeof settings['humanizeMouse'] === 'boolean' ? settings['humanizeMouse'] : true,
    mouseJitter:
      typeof mouseJitter === 'number' && Number.isFinite(mouseJitter) && mouseJitter >= 0
        ? mouseJitter
        : 5,
    slowMo:
      typeof slowMo === 'number' && Number.isFinite(slowMo) && slowMo > 0
        ? slowMo
        : SCANNER_1688_DEFAULT_SLOW_MO_MS,
    clickDelayMin:
      typeof settings['clickDelayMin'] === 'number' ? settings['clickDelayMin'] : 80,
    clickDelayMax:
      typeof settings['clickDelayMax'] === 'number' ? settings['clickDelayMax'] : 220,
    inputDelayMin:
      typeof settings['inputDelayMin'] === 'number' ? settings['inputDelayMin'] : 50,
    inputDelayMax:
      typeof settings['inputDelayMax'] === 'number' ? settings['inputDelayMax'] : 160,
    actionDelayMin:
      typeof settings['actionDelayMin'] === 'number' ? settings['actionDelayMin'] : 250,
    actionDelayMax:
      typeof settings['actionDelayMax'] === 'number' ? settings['actionDelayMax'] : 900,
  } as PlaywrightConnectionSettingsOverridesInput;
};

export async function synchronize1688ProductScan(scan: ProductScanRecord): Promise<ProductScanRecord> {
  const engineRunId = resolveScanEngineRunId(scan);

  if (!engineRunId) {
    const ageMs =
      resolveIsoAgeMs(scan.updatedAt) ??
      resolveIsoAgeMs(scan.createdAt) ??
      resolveIsoAgeMs(scan.completedAt);
    if (ageMs != null && ageMs >= PRODUCT_SCAN_ORPHANED_ACTIVE_MAX_AGE_MS) {
      return await persistFailedSynchronization(
        scan,
        '1688 supplier scan is missing its Playwright engine run id.',
        '1688 supplier reverse image scan failed.'
      );
    }

    return scan;
  }

  try {
    let run;
    try {
      run = await readPlaywrightEngineRun(engineRunId);
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'product-scans.service',
        action: 'synchronize1688ProductScan.readRun',
        scanId: scan.id,
        productId: scan.productId,
        engineRunId,
      });
      return scan;
    }

    if (!run) {
      return await persistFailedSynchronization(
        scan,
        `Playwright engine run ${engineRunId} was not found.`,
        '1688 supplier reverse image scan failed.'
      );
    }

    const { resultValue, finalUrl } = resolvePlaywrightEngineRunOutputs(run.result);
    const parsedResult = parse1688ScanScriptResult(resultValue);

    if (run.status === 'queued' || run.status === 'running') {
      const existingRawResult = toRecord(scan.rawResult) ?? {};
      const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(existingRawResult);
      const nextSteps = resolvePersistedProductScanSteps(scan, parsedResult.steps);
      const manualVerificationPending =
        parsedResult.status === 'captcha_required' ||
        (existingRawResult['manualVerificationPending'] === true &&
          (parsedResult.status === 'running' || parsedResult.status == null));
      const activeMessage =
        manualVerificationPending
          ? resolve1688ManualVerificationMessage(
              parsedResult.message,
              existingRawResult['manualVerificationMessage'] ?? scan.asinUpdateMessage
            )
          : null;
      const nextRawResult =
        manualVerificationPending
          ? {
              ...existingRawResult,
              ...resultValue,
              runId: engineRunId,
              runStatus: run.status,
              manualVerificationPending: true,
              manualVerificationMessage: activeMessage,
              manualVerificationTimeoutMs,
            }
          : {
              ...existingRawResult,
              ...resultValue,
              runId: engineRunId,
              runStatus: run.status,
              manualVerificationPending: false,
              manualVerificationMessage: null,
              manualVerificationTimeoutMs,
            };

      const shouldPersistActiveState =
        scan.status !== run.status ||
        scan.engineRunId !== engineRunId ||
        !areProductScanStepsEqual(scan.steps, nextSteps) ||
        JSON.stringify(existingRawResult) !== JSON.stringify(nextRawResult) ||
        (activeMessage ?? null) !== (scan.asinUpdateMessage ?? null) ||
        (manualVerificationPending &&
          existingRawResult['manualVerificationPending'] !== true) ||
        (!manualVerificationPending &&
          (existingRawResult['manualVerificationPending'] === true ||
            readOptionalString(existingRawResult['manualVerificationMessage']) != null));

      if (!shouldPersistActiveState) {
        return scan;
      }

      return await persistSynchronizedScan(scan, {
        engineRunId,
        status: run.status,
        steps: nextSteps,
        rawResult: nextRawResult,
        error: null,
        asinUpdateStatus: 'not_needed',
        asinUpdateMessage: activeMessage,
        completedAt: null,
      });
    }

    if (run.status === 'failed') {
      const failureMessages = collectPlaywrightEngineRunFailureMessages(run);
      const failureMessage = normalizeErrorMessage(
        failureMessages[0],
        '1688 supplier reverse image scan failed.'
      );

      return await persistSynchronizedScan(scan, {
        engineRunId,
        status: 'failed',
        steps: resolvePersistedProductScanSteps(scan, parsedResult.steps),
        error: failureMessage,
        rawResult: buildPlaywrightEngineRunFailureMeta(run, { includeRawResult: true }),
        asinUpdateStatus: 'not_needed',
        asinUpdateMessage: failureMessage,
        completedAt: run.completedAt ?? new Date().toISOString(),
      });
    }

    if (run.status !== 'completed') {
      return scan;
    }

    if (parsedResult.status === 'captcha_required') {
      return await persistFailedSynchronization(
        scan,
        resolve1688ManualVerificationMessage(
          parsedResult.message,
          toRecord(scan.rawResult)?.['manualVerificationMessage'] ?? scan.asinUpdateMessage
        ),
        '1688 supplier reverse image scan failed.'
      );
    }

    if (parsedResult.status === 'failed') {
      return await persistFailedSynchronization(
        scan,
        normalize1688ScanFailureMessage(
          parsedResult.message,
          '1688 supplier reverse image scan failed.'
        ),
        '1688 supplier reverse image scan failed.'
      );
    }

    const resolvedScanUrl = resolvePersistableScanUrl(parsedResult.url, parsedResult.currentUrl, finalUrl);
    let finalizedSteps = resolvePersistedProductScanSteps(scan, parsedResult.steps);
    let nextStatus: ProductScanStatus = parsedResult.status === 'no_match' ? 'no_match' : 'completed';
    let nextMessage =
      parsedResult.message ??
      (nextStatus === 'no_match'
        ? 'No 1688 supplier page matched the scanned product image.'
        : '1688 supplier reverse image scan completed.');
    let supplierEvaluation = parsedResult.supplierEvaluation;

    let scannerSettings = createDefaultProductScannerSettings();
    try {
      scannerSettings = (await getProductScannerSettings()) ?? scannerSettings;
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'product-scans.service',
        action: 'synchronize1688ProductScan.loadScannerSettingsForSupplierEvaluator',
        scanId: scan.id,
        productId: scan.productId,
        engineRunId,
      });
    }

    const evaluatorConfig = await resolveProductScanner1688CandidateEvaluatorConfig(scannerSettings);
    if (evaluatorConfig.enabled && evaluatorConfig.mode !== 'disabled' && nextStatus === 'completed' && !supplierEvaluation) {
      const product = await productService.getProductById(scan.productId);
      if (!product) {
        return await persistFailedSynchronization(
          scan,
          'Product not found while evaluating 1688 supplier candidate.',
          '1688 supplier reverse image scan failed.'
        );
      }
      supplierEvaluation = await evaluate1688SupplierCandidateMatch({
        scan,
        parsedResult,
        run,
        product,
        evaluatorConfig,
      });

      if (!supplierEvaluation) {
        const message = '1688 supplier candidate evaluation failed.';
        return await persistFailedSynchronization(
          scan,
          message,
          '1688 supplier reverse image scan failed.'
        );
      }

      if (supplierEvaluation.status === 'failed') {
        const message = supplierEvaluation.error || '1688 supplier candidate evaluation failed.';
        return await persistFailedSynchronization(
          scan,
          message,
          '1688 supplier reverse image scan failed.'
        );
      }

      if (supplierEvaluation.status === 'rejected') {
        nextStatus = 'no_match';
        nextMessage = supplierEvaluation.reasons[0] || '1688 supplier candidate was rejected by AI.';
      }

      finalizedSteps = resolvePersistedProductScanSteps(scan, [
        ...(parsedResult.steps ?? []),
        {
          key: 'supplier_ai_evaluate',
          label: 'Evaluate 1688 supplier candidate match',
          group: 'supplier' as const,
          attempt: null,
          candidateId: null,
          inputSource: null,
          warning: null,
          url: null,
          startedAt: null,
          completedAt: null,
          durationMs: null,
          status: supplierEvaluation.status === 'approved' ? 'completed' : 'failed',
          resultCode:
            supplierEvaluation.status === 'approved' ? 'candidates_triaged' : 'triage_rejected',
          message:
            supplierEvaluation.status === 'approved'
              ? '1688 supplier candidate approved by AI.'
              : nextMessage,
          details: [
            {
              label: 'AI Evaluation',
              value: JSON.stringify(supplierEvaluation).slice(0, 500),
            },
          ],
        },
      ]);
    }

    return await persistSynchronizedScan(scan, {
      engineRunId,
      status: nextStatus,
      matchedImageId: parsedResult.matchedImageId,
      title: parsedResult.title,
      price: parsedResult.price,
      url: resolvedScanUrl,
      description: parsedResult.description,
      amazonDetails: null,
      amazonProbe: null,
      amazonEvaluation: null,
      supplierEvaluation,
      steps: finalizedSteps,
      rawResult: resultValue,
      error: (nextStatus as string) === 'failed' ? nextMessage : null,
      asinUpdateStatus: 'not_needed',
      asinUpdateMessage: nextMessage,
      completedAt: run.completedAt ?? new Date().toISOString(),
    });
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'synchronize1688ProductScan.catch',
      scanId: scan.id,
      productId: scan.productId,
      engineRunId,
    });
    return scan;
  }
}
