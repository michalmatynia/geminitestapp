import 'server-only';

import { createDefaultProductScannerSettings } from '@/features/products/scanner-settings';
import type {
  ProductScanRecord,
  ProductScanStatus,
  ProductScanStep,
  ProductScanSupplierEvaluation,
} from '@/shared/contracts/product-scans';
import { productService } from '@/shared/lib/products/services/productService';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { evaluate1688SupplierCandidateMatch } from './product-scan-1688-evaluator';
import {
  getProductScannerSettings,
  resolveProductScanner1688CandidateEvaluatorConfig,
} from './product-scanner-settings';
import {
  persistFailedSynchronization,
  persistSynchronizedScan,
  readOptionalString,
  resolvePersistableScanUrl,
  resolvePersistedProductScanSteps,
  toRecord,
} from './product-scans-service.helpers';
import {
  normalize1688ScanFailureMessage,
  resolve1688ManualVerificationMessage,
} from './product-scans-sync-1688-settings';
import type { ProductScan1688SyncContext } from './product-scans-sync-1688.types';

type SupplierEvaluatorConfig = Awaited<
  ReturnType<typeof resolveProductScanner1688CandidateEvaluatorConfig>
>;

type Completed1688State = {
  finalizedSteps: ProductScanStep[];
  nextStatus: ProductScanStatus;
  nextMessage: string;
  supplierEvaluation: ProductScanSupplierEvaluation;
};

type SupplierEvaluationResolution =
  | {
      kind: 'finalized';
      state: Completed1688State;
    }
  | {
      kind: 'persisted';
      scan: ProductScanRecord;
    };

const resolveInitialCompletedStatus = (
  context: ProductScan1688SyncContext
): ProductScanStatus => (context.parsedResult.status === 'no_match' ? 'no_match' : 'completed');

const resolveDefaultCompletedMessage = (status: ProductScanStatus): string =>
  status === 'no_match'
    ? 'No 1688 supplier page matched the scanned product image.'
    : '1688 supplier reverse image scan completed.';

const buildInitialCompletedState = (context: ProductScan1688SyncContext): Completed1688State => {
  const nextStatus = resolveInitialCompletedStatus(context);
  return {
    finalizedSteps: resolvePersistedProductScanSteps(context.scan, context.productScanStepSource),
    nextStatus,
    nextMessage: context.parsedResult.message ?? resolveDefaultCompletedMessage(nextStatus),
    supplierEvaluation: context.parsedResult.supplierEvaluation,
  };
};

const loadSupplierEvaluatorConfig = async (
  context: ProductScan1688SyncContext
): Promise<SupplierEvaluatorConfig> => {
  let scannerSettings = createDefaultProductScannerSettings();
  try {
    scannerSettings = await getProductScannerSettings();
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: 'synchronize1688ProductScan.loadScannerSettingsForSupplierEvaluator',
      scanId: context.scan.id,
      productId: context.scan.productId,
      engineRunId: context.engineRunId,
    });
  }
  return await resolveProductScanner1688CandidateEvaluatorConfig(scannerSettings);
};

const shouldEvaluateSupplierCandidate = (
  evaluatorConfig: SupplierEvaluatorConfig,
  state: Completed1688State
): boolean =>
  evaluatorConfig.enabled &&
  evaluatorConfig.mode !== 'disabled' &&
  state.nextStatus === 'completed' &&
  state.supplierEvaluation === null;

const persist1688EvaluationFailure = async (
  context: ProductScan1688SyncContext,
  message: string
): Promise<ProductScanRecord> =>
  await persistFailedSynchronization(
    context.scan,
    message,
    '1688 supplier reverse image scan failed.'
  );

const resolveRejectedSupplierMessage = (
  supplierEvaluation: ProductScanSupplierEvaluation
): string =>
  readOptionalString(supplierEvaluation?.reasons[0]) ??
  '1688 supplier candidate was rejected by AI.';

const resolveSupplierEvaluationStepStatus = (
  supplierEvaluation: ProductScanSupplierEvaluation
): ProductScanStep['status'] => (supplierEvaluation?.status === 'approved' ? 'completed' : 'failed');

const resolveSupplierEvaluationStepResultCode = (
  supplierEvaluation: ProductScanSupplierEvaluation
): string =>
  supplierEvaluation?.status === 'approved' ? 'candidates_triaged' : 'triage_rejected';

const resolveSupplierEvaluationStepMessage = (
  supplierEvaluation: ProductScanSupplierEvaluation,
  nextMessage: string
): string =>
  supplierEvaluation?.status === 'approved' ? '1688 supplier candidate approved by AI.' : nextMessage;

const buildSupplierEvaluationStep = (
  supplierEvaluation: ProductScanSupplierEvaluation,
  nextMessage: string
): ProductScanStep => ({
  key: 'supplier_ai_evaluate',
  label: 'Evaluate 1688 supplier candidate match',
  group: 'supplier',
  attempt: null,
  candidateId: null,
  inputSource: null,
  warning: null,
  url: null,
  startedAt: null,
  completedAt: null,
  durationMs: null,
  status: resolveSupplierEvaluationStepStatus(supplierEvaluation),
  resultCode: resolveSupplierEvaluationStepResultCode(supplierEvaluation),
  message: resolveSupplierEvaluationStepMessage(supplierEvaluation, nextMessage),
  details: [
    {
      label: 'AI Evaluation',
      value: JSON.stringify(supplierEvaluation).slice(0, 500),
    },
  ],
});

const applySupplierEvaluationToState = (
  context: ProductScan1688SyncContext,
  state: Completed1688State,
  supplierEvaluation: NonNullable<ProductScanSupplierEvaluation>
): Completed1688State => {
  const nextStatus = supplierEvaluation.status === 'rejected' ? 'no_match' : state.nextStatus;
  const nextMessage =
    supplierEvaluation.status === 'rejected'
      ? resolveRejectedSupplierMessage(supplierEvaluation)
      : state.nextMessage;

  return {
    ...state,
    nextStatus,
    nextMessage,
    supplierEvaluation,
    finalizedSteps: resolvePersistedProductScanSteps(context.scan, [
      ...context.productScanStepSource,
      buildSupplierEvaluationStep(supplierEvaluation, nextMessage),
    ]),
  };
};

const evaluateSupplierCandidateIfNeeded = async (
  context: ProductScan1688SyncContext,
  state: Completed1688State
): Promise<SupplierEvaluationResolution> => {
  const evaluatorConfig = await loadSupplierEvaluatorConfig(context);
  if (shouldEvaluateSupplierCandidate(evaluatorConfig, state) === false) {
    return { kind: 'finalized', state };
  }

  const product = await productService.getProductById(context.scan.productId);
  if (product === null) {
    return {
      kind: 'persisted',
      scan: await persist1688EvaluationFailure(
        context,
        'Product not found while evaluating 1688 supplier candidate.'
      ),
    };
  }

  const supplierEvaluation = await evaluate1688SupplierCandidateMatch({
    scan: context.scan,
    parsedResult: context.parsedResult,
    run: context.run,
    product,
    evaluatorConfig,
  });
  if (supplierEvaluation === null) {
    return {
      kind: 'persisted',
      scan: await persist1688EvaluationFailure(
        context,
        '1688 supplier candidate evaluation failed.'
      ),
    };
  }
  if (supplierEvaluation.status === 'failed') {
    return {
      kind: 'persisted',
      scan: await persist1688EvaluationFailure(
        context,
        readOptionalString(supplierEvaluation.error) ?? '1688 supplier candidate evaluation failed.'
      ),
    };
  }

  return { kind: 'finalized', state: applySupplierEvaluationToState(context, state, supplierEvaluation) };
};

export const syncCompleted1688ProductScan = async (
  context: ProductScan1688SyncContext
): Promise<ProductScanRecord> => {
  const rawResult = toRecord(context.scan.rawResult) ?? {};
  if (context.parsedResult.status === 'captcha_required') {
    return await persist1688EvaluationFailure(
      context,
      resolve1688ManualVerificationMessage(
        context.parsedResult.message,
        rawResult['manualVerificationMessage'] ?? context.scan.asinUpdateMessage
      )
    );
  }
  if (context.parsedResult.status === 'failed') {
    return await persistFailedSynchronization(
      context.scan,
      normalize1688ScanFailureMessage(
        context.parsedResult.message,
        '1688 supplier reverse image scan failed.'
      )
    );
  }

  const evaluationResolution = await evaluateSupplierCandidateIfNeeded(
    context,
    buildInitialCompletedState(context)
  );
  if (evaluationResolution.kind === 'persisted') return evaluationResolution.scan;

  const state = evaluationResolution.state;
  return await persistSynchronizedScan(context.scan, {
    engineRunId: context.engineRunId,
    status: state.nextStatus,
    matchedImageId: context.parsedResult.matchedImageId,
    title: context.parsedResult.title,
    price: context.parsedResult.price,
    url: resolvePersistableScanUrl(
      context.parsedResult.url,
      context.parsedResult.currentUrl,
      context.finalUrl
    ),
    description: context.parsedResult.description,
    amazonDetails: null,
    amazonProbe: null,
    amazonEvaluation: null,
    supplierEvaluation: state.supplierEvaluation,
    steps: state.finalizedSteps,
    rawResult: context.resultValue,
    error: null,
    asinUpdateStatus: 'not_needed',
    asinUpdateMessage: state.nextMessage,
    completedAt: context.run.completedAt ?? new Date().toISOString(),
  });
};
