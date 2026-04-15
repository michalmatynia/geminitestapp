import 'server-only';

import {
  type PlaywrightEngineRunRecord,
} from '@/features/playwright/server';
import {
  createDefaultProductScannerSettings,
} from '@/features/products/scanner-settings';
import {
  type ProductScanAmazonEvaluation,
  type ProductScanAmazonProbe,
  type ProductScanRecord,
} from '@/shared/contracts/product-scans';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  evaluateAmazonScanCandidateMatch,
  triageAmazonScanCandidates,
  type AmazonCandidateTriageEvaluationResult,
} from './product-scan-amazon-evaluator';
import {
  getProductScannerSettings,
  resolveProductScannerAmazonCandidateEvaluatorTriageConfig,
  resolveProductScannerAmazonCandidateEvaluatorProbeConfig,
} from './product-scanner-settings';

import {
  toRecord,
  readOptionalString,
  resolvePersistedProductScanSteps,
  upsertPersistedProductScanStep,
  persistSynchronizedScan,
  resolveScanManualVerificationTimeoutMs,
  resolvePersistableScanUrl,
} from './product-scans-service.helpers';

import {
  appendAmazonAiStageSummary,
  buildAmazonEvaluationStageSummary,
  resolveAmazonEvaluationStepStatus,
  resolveAmazonEvaluationStepResultCode,
  resolveAmazonEvaluationMessage,
  buildAmazonEvaluationStepDetails,
  resolveNextAmazonEvaluationStepAttempt,
  resolveLatestAmazonCandidateStepMeta,
  resolveAmazonCandidateTriageStepStatus,
  resolveAmazonCandidateTriageStepResultCode,
  resolveAmazonCandidateTriageMessage,
  resolveAmazonImageSearchProvider,
} from './product-scans-service.helpers.amazon';

export async function synchronizeAmazonCaptchaRequired({
  scan,
  engineRunId,
  resultValue,
  parsedResult,
}: {
  scan: ProductScanRecord;
  run: PlaywrightEngineRunRecord;
  engineRunId: string;
  resultValue: unknown;
  parsedResult: any;
}): Promise<ProductScanRecord> {
  const existingRawResult = toRecord(scan.rawResult) ?? {};
  const manualVerificationMessage =
    readOptionalString(parsedResult.message) ??
    'Amazon requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.';

  return await persistSynchronizedScan(scan, {
    engineRunId,
    status: 'running',
    steps: resolvePersistedProductScanSteps(scan, parsedResult.steps),
    rawResult: {
      ...existingRawResult,
      ...toRecord(resultValue),
      manualVerificationPending: true,
      manualVerificationMessage,
      manualVerificationTimeoutMs: resolveScanManualVerificationTimeoutMs(existingRawResult),
    },
    error: null,
    asinUpdateStatus: 'pending',
    asinUpdateMessage: manualVerificationMessage,
    completedAt: null,
  });
}

export async function synchronizeAmazonTriageReady({
  scan,
  run,
  engineRunId,
  resultValue,
  parsedResult,
  persistedAmazonProbe,
  existingAmazonEvaluation,
}: {
  scan: ProductScanRecord;
  run: PlaywrightEngineRunRecord;
  engineRunId: string;
  resultValue: unknown;
  parsedResult: any;
  persistedAmazonProbe: ProductScanAmazonProbe;
  existingAmazonEvaluation: ProductScanAmazonEvaluation;
}): Promise<ProductScanRecord> {
  let scannerSettings = createDefaultProductScannerSettings();
  try {
    scannerSettings = (await getProductScannerSettings()) ?? scannerSettings;
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'synchronizeAmazonTriageReady.loadScannerSettings',
      scanId: scan.id,
      productId: scan.productId,
    });
  }

  const triageConfig = await resolveProductScannerAmazonCandidateEvaluatorTriageConfig(scannerSettings);
  let triageResult: AmazonCandidateTriageEvaluationResult | null = null;
  let finalizedSteps = resolvePersistedProductScanSteps(scan, parsedResult.steps);
  let triageRawResult = resultValue;

  if (triageConfig.enabled) {
    triageResult = await triageAmazonScanCandidates({
      scan,
      parsedResult,
      run,
      evaluatorConfig: triageConfig,
    });

    finalizedSteps = upsertPersistedProductScanStep(finalizedSteps, {
      key: 'amazon_ai_triage',
      label: 'Triage Amazon candidates',
      group: 'amazon',
      status: resolveAmazonCandidateTriageStepStatus(triageResult),
      resultCode: resolveAmazonCandidateTriageStepResultCode(triageResult),
      message: resolveAmazonCandidateTriageMessage(triageResult),
      details: {
        evaluation: triageResult,
      },
    });

    triageRawResult = appendAmazonAiStageSummary(
      resultValue,
      buildAmazonEvaluationStageSummary(triageResult as any, {
        stage: 'candidate_triage',
        candidateRankBefore: null,
        provider: resolveAmazonImageSearchProvider(scan.rawResult, scannerSettings),
      })
    );
  }

  if (triageResult?.status === 'failed') {
    const message = triageResult.error || 'Amazon candidate triage failed.';
    return await persistSynchronizedScan(scan, {
      engineRunId,
      status: 'failed',
      asin: null,
      matchedImageId: parsedResult.matchedImageId,
      title: null,
      price: null,
      url: null,
      description: null,
      amazonDetails: null,
      amazonProbe: persistedAmazonProbe,
      amazonEvaluation: existingAmazonEvaluation,
      steps: finalizedSteps,
      rawResult: triageRawResult,
      error: message,
      asinUpdateStatus: 'failed',
      asinUpdateMessage: message,
      completedAt: run.completedAt ?? new Date().toISOString(),
    });
  }

  return await persistSynchronizedScan(scan, {
    engineRunId,
    status: 'running',
    steps: finalizedSteps,
    rawResult: triageRawResult,
    error: null,
    asinUpdateStatus: 'pending',
    asinUpdateMessage: 'Amazon candidates triaged, moving to extraction...',
    completedAt: null,
  });
}

export async function synchronizeAmazonProbeReady({
  scan,
  run,
  engineRunId,
  resultValue,
  parsedResult,
  persistedAmazonProbe,
  existingAmazonEvaluation,
  finalUrl,
}: {
  scan: ProductScanRecord;
  run: PlaywrightEngineRunRecord;
  engineRunId: string;
  resultValue: unknown;
  parsedResult: any;
  persistedAmazonProbe: ProductScanAmazonProbe;
  existingAmazonEvaluation: ProductScanAmazonEvaluation;
  finalUrl: string | null;
}): Promise<ProductScanRecord> {
  const resolvedScanUrl = resolvePersistableScanUrl(parsedResult.url, parsedResult.currentUrl, finalUrl);
  let finalizedAmazonSteps = resolvePersistedProductScanSteps(scan, parsedResult.steps);
  let amazonEvaluation: ProductScanAmazonEvaluation = existingAmazonEvaluation;

  let scannerSettings = createDefaultProductScannerSettings();
  try {
    scannerSettings = (await getProductScannerSettings()) ?? scannerSettings;
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'synchronizeAmazonProbeReady.loadScannerSettings',
      scanId: scan.id,
      productId: scan.productId,
    });
  }

  const probeConfig = await resolveProductScannerAmazonCandidateEvaluatorProbeConfig(scannerSettings);
  let probeRawResult = resultValue;

  if (probeConfig.enabled) {
    amazonEvaluation = await evaluateAmazonScanCandidateMatch({
      scan,
      product: null, // Ideally pass product here if available
      parsedResult,
      run,
      stage: 'probe_evaluate',
      evaluatorConfig: probeConfig,
    });
    const latestCandidateMeta = resolveLatestAmazonCandidateStepMeta(finalizedAmazonSteps);

    finalizedAmazonSteps = upsertPersistedProductScanStep(finalizedAmazonSteps, {
      key: 'amazon_ai_evaluate',
      label: 'Evaluate Amazon candidate match',
      group: 'amazon',
      attempt: resolveNextAmazonEvaluationStepAttempt(finalizedAmazonSteps),
      candidateId: latestCandidateMeta.candidateId ?? parsedResult.matchedImageId,
      candidateRank: latestCandidateMeta.candidateRank,
      status: resolveAmazonEvaluationStepStatus(amazonEvaluation),
      resultCode: resolveAmazonEvaluationStepResultCode(amazonEvaluation),
      message: resolveAmazonEvaluationMessage(amazonEvaluation),
      details: buildAmazonEvaluationStepDetails(amazonEvaluation, probeConfig, 'probe'),
      url: amazonEvaluation?.evidence?.candidateUrl ?? resolvedScanUrl ?? latestCandidateMeta.url,
    });

    probeRawResult = appendAmazonAiStageSummary(
      resultValue,
      buildAmazonEvaluationStageSummary(amazonEvaluation, {
        stage: 'probe_evaluate',
        candidateRankBefore: latestCandidateMeta.candidateRank,
        provider: resolveAmazonImageSearchProvider(scan.rawResult, scannerSettings),
      })
    );
  }

  if (amazonEvaluation?.status === 'failed') {
    const message = resolveAmazonEvaluationMessage(amazonEvaluation);
    return await persistSynchronizedScan(scan, {
      engineRunId,
      status: 'failed',
      asin: null,
      matchedImageId: parsedResult.matchedImageId,
      title: null,
      price: null,
      url: null,
      description: null,
      amazonDetails: null,
      amazonProbe: persistedAmazonProbe,
      amazonEvaluation,
      steps: finalizedAmazonSteps,
      rawResult: probeRawResult,
      error: message,
      asinUpdateStatus: 'failed',
      asinUpdateMessage: message,
      completedAt: run.completedAt ?? new Date().toISOString(),
    });
  }

  return await persistSynchronizedScan(scan, {
    engineRunId,
    status: 'running',
    steps: finalizedAmazonSteps,
    rawResult: probeRawResult,
    error: null,
    asinUpdateStatus: 'pending',
    asinUpdateMessage: 'Amazon candidate match evaluated, continuing probe...',
    completedAt: null,
  });
}
