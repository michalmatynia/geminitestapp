import 'server-only';

import type { PlaywrightEngineRunRecord } from '@/features/playwright/server';
import { createDefaultProductScannerSettings } from '@/features/products/scanner-settings';
import type {
  ProductScanAmazonEvaluation,
  ProductScanAmazonProbe,
  ProductScanRecord,
} from '@/shared/contracts/product-scans';
import { productService } from '@/shared/lib/products/services/productService';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  buildProductScannerEngineRequestOptions,
  getProductScannerSettings,
} from './product-scanner-settings';
import {
  resolvePersistedProductScanSteps,
  resolveProductScanRequestSequenceInput,
  toRecord,
  type AmazonScanRuntimeResult,
} from './product-scans-service.helpers';
import {
  resolveAmazonImageSearchPageUrl,
  resolveAmazonImageSearchProvider,
  resolveAmazonProductScanRuntimeKey,
  resolveAmazonProbeEvaluatorConfig,
  resolveAmazonRuntimeActionDefinition,
  resolveAmazonTriageEvaluatorConfig,
} from './product-scans-service.helpers.amazon';
import {
  appendAmazonTriageStep,
  buildAmazonTriageRawResult,
  resolveAmazonTriageEvaluation,
  resolveAmazonTriageFallbackProvider,
  resolveAmazonTriageSelectedCandidate,
} from './product-scans-sync-amazon-triage.evaluation';
import {
  persistAmazonTriageEvaluationFailed,
  persistAmazonTriageNoCandidates,
  persistAmazonTriageProductNotFound,
  persistAmazonTriageUnexpectedFailure,
} from './product-scans-sync-amazon-triage.persistence';
import {
  startAmazonTriageFallbackProviderScan,
  type AmazonTriageQueueContext,
} from './product-scans-sync-amazon-triage.queue';
import { startAmazonTriageSelectedCandidateScan } from './product-scans-sync-amazon-triage.selected';

type SynchronizeAmazonStatusInput = {
  scan: ProductScanRecord;
  run: PlaywrightEngineRunRecord;
  engineRunId: string;
  resultValue: unknown;
  parsedResult: AmazonScanRuntimeResult;
};

type AmazonTriageReadyInput = SynchronizeAmazonStatusInput & {
  persistedAmazonProbe: ProductScanAmazonProbe;
  existingAmazonEvaluation: ProductScanAmazonEvaluation;
};

const loadScannerSettingsForCandidateTriage = async (input: {
  scan: ProductScanRecord;
  engineRunId: string;
}): Promise<ReturnType<typeof createDefaultProductScannerSettings>> => {
  let scannerSettings = createDefaultProductScannerSettings();
  try {
    scannerSettings = await getProductScannerSettings();
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'synchronizeProductScan.loadScannerSettingsForCandidateTriage',
      scanId: input.scan.id,
      productId: input.scan.productId,
      engineRunId: input.engineRunId,
    });
  }
  return scannerSettings;
};

const handleAmazonTriageOutcome = async (
  context: AmazonTriageQueueContext,
  input: AmazonTriageReadyInput
): Promise<ProductScanRecord> => {
  if (context.triageEvaluation.status === 'failed') {
    return await persistAmazonTriageEvaluationFailed({ ...input, ...context });
  }

  const fallbackProvider = resolveAmazonTriageFallbackProvider(context);
  if (fallbackProvider !== null) {
    return await startAmazonTriageFallbackProviderScan(context, fallbackProvider);
  }

  const selectedCandidate = resolveAmazonTriageSelectedCandidate(
    context.triageEvaluation,
    input.parsedResult
  );
  if (selectedCandidate !== null) {
    return await startAmazonTriageSelectedCandidateScan(context, selectedCandidate);
  }

  return await persistAmazonTriageNoCandidates({ ...input, ...context });
};

const buildAmazonTriageQueueContext = async (
  input: AmazonTriageReadyInput & {
    product: NonNullable<Awaited<ReturnType<typeof productService.getProductById>>>;
    finalizedAmazonSteps: ProductScanRecord['steps'];
  }
): Promise<AmazonTriageQueueContext> => {
  const scannerSettings = await loadScannerSettingsForCandidateTriage(input);
  const currentProvider = resolveAmazonImageSearchProvider(input.scan.rawResult, scannerSettings);
  const amazonRuntimeKey = resolveAmazonProductScanRuntimeKey(
    toRecord(input.scan.rawResult)?.['runtimeKey']
  );
  const amazonRuntimeAction = await resolveAmazonRuntimeActionDefinition(amazonRuntimeKey);
  const [probeEvaluatorConfig, triageEvaluatorConfig] = await Promise.all([
    resolveAmazonProbeEvaluatorConfig(scannerSettings),
    resolveAmazonTriageEvaluatorConfig(scannerSettings),
  ]);
  const triageEvaluation = await resolveAmazonTriageEvaluation({
    scan: input.scan,
    product: input.product,
    parsedResult: input.parsedResult,
    evaluatorConfig: triageEvaluatorConfig,
    currentProvider,
  });
  const finalizedAmazonSteps = appendAmazonTriageStep({
    steps: input.finalizedAmazonSteps,
    parsedResult: input.parsedResult,
    triageEvaluation,
    triageEvaluatorConfig,
    currentProvider,
  });

  return {
    ...input,
    finalizedAmazonSteps,
    triageEvaluation,
    triageRawResult: buildAmazonTriageRawResult(input.resultValue, triageEvaluation, currentProvider),
    scannerSettings,
    scannerEngineRequestOptions: buildProductScannerEngineRequestOptions(scannerSettings),
    amazonRuntimeKey,
    amazonRuntimeAction,
    currentProvider,
    imageSearchPageUrl: resolveAmazonImageSearchPageUrl(input.scan.rawResult, scannerSettings),
    probeEvaluatorConfig,
    triageEvaluatorConfig,
    requestedStepSequenceInput: resolveProductScanRequestSequenceInput(input.scan.rawResult),
  };
};

export async function synchronizeAmazonTriageReady(
  input: AmazonTriageReadyInput
): Promise<ProductScanRecord> {
  const finalizedAmazonSteps = resolvePersistedProductScanSteps(
    input.scan,
    input.parsedResult.steps
  );
  const product = await productService.getProductById(input.scan.productId);
  if (product === null) {
    return await persistAmazonTriageProductNotFound({
      ...input,
      steps: finalizedAmazonSteps,
      resultValue: input.resultValue,
    });
  }

  try {
    const context = await buildAmazonTriageQueueContext({
      ...input,
      product,
      finalizedAmazonSteps,
    });
    return await handleAmazonTriageOutcome(context, input);
  } catch (error) {
    return await persistAmazonTriageUnexpectedFailure({
      ...input,
      finalizedAmazonSteps,
      resultValue: input.resultValue,
      error,
    });
  }
}
