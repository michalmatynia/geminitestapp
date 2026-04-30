import 'server-only';

import type {
  ProductScanAmazonEvaluation,
} from '@/shared/contracts/product-scans';
import {
  readOptionalString,
  resolveScanManualVerificationTimeoutMs,
  shouldAutoShowScannerCaptchaBrowser,
  toRecord,
} from './product-scans-service.helpers';
import {
  buildAmazonEvaluationStageSummary,
  resolveAmazonImageSearchPageUrl,
  resolveAmazonImageSearchProvider,
  resolveLatestAmazonCandidateStepMeta,
  type AmazonAiStageSummary,
} from './product-scans-service.helpers.amazon';
import type { AmazonMatchedContext } from './product-scans-sync-amazon-matched.types';

export type RejectedAmazonEvaluation = NonNullable<ProductScanAmazonEvaluation> & {
  status: 'rejected';
};

export type AmazonRejectedMatchedContext = AmazonMatchedContext & {
  amazonEvaluation: RejectedAmazonEvaluation;
};

export type RejectedQueueStatus = 'queued' | 'running';

export type RejectedRuntimeContext = AmazonRejectedMatchedContext & {
  allowManualVerification: boolean;
  amazonImageSearchPageUrl: ReturnType<typeof resolveAmazonImageSearchPageUrl>;
  amazonImageSearchProvider: ReturnType<typeof resolveAmazonImageSearchProvider>;
  amazonSelectorProfile: string;
  manualVerificationTimeoutMs: number;
};

export const createRejectedRuntimeContext = (
  context: AmazonRejectedMatchedContext
): RejectedRuntimeContext => {
  const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(
    context.scannerSettings
  );
  return {
    ...context,
    allowManualVerification: shouldAutoShowScannerCaptchaBrowser(context.scannerSettings),
    amazonImageSearchPageUrl: resolveAmazonImageSearchPageUrl(
      context.scan.rawResult,
      context.scannerSettings
    ),
    amazonImageSearchProvider: resolveAmazonImageSearchProvider(
      context.scan.rawResult,
      context.scannerSettings
    ),
    amazonSelectorProfile:
      readOptionalString(toRecord(context.scan.rawResult)?.['selectorProfile'], 120) ?? 'amazon',
    manualVerificationTimeoutMs,
  };
};

export const resolveRejectedQueueStatus = (
  status: string
): RejectedQueueStatus => status === 'running' ? 'running' : 'queued';

export const buildRejectedAiStageSummary = (
  context: RejectedRuntimeContext
): AmazonAiStageSummary => {
  const latestCandidateMeta = resolveLatestAmazonCandidateStepMeta(
    context.finalizedAmazonSteps
  );
  return buildAmazonEvaluationStageSummary(context.amazonEvaluation, {
    stage: 'extraction_evaluate',
    candidateRankBefore: latestCandidateMeta.candidateRank,
    provider: context.amazonImageSearchProvider,
  });
};
