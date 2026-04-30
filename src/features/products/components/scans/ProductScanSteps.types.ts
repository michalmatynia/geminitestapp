import type {
  ProductScanStep,
  ProductScanStepGroup,
  ProductScanStepStatus,
} from '@/shared/contracts/product-scans';

export type StepStatus = ProductScanStepStatus;
export type ResolvedProductScanStepGroup = ProductScanStepGroup;

export type ProductScanActiveStepSummary = {
  phaseLabel: string;
  stepLabel: string;
  message: string | null;
  attempt: number | null;
  inputSource: string | null;
};

export type ProductScanLatestOutcomeSummary = {
  kind: 'failed' | 'stalled';
  phaseLabel: string;
  sourceLabel: string | null;
  stepLabel: string;
  message: string | null;
  resultCodeLabel: string | null;
  attempt: number | null;
  inputSource: string | null;
  url: string | null;
  timingLabel: string | null;
};

export type ProductScanContinuationSummary = {
  badgeLabel: string;
  contextLabel: string | null;
  phaseLabel: string;
  stepLabel: string;
  message: string | null;
  resultCodeLabel: string | null;
  attempt: number | null;
  nextUrl: string | null;
  nextUrlLabel: string | null;
  rejectedUrl: string | null;
  rejectedUrlLabel: string | null;
  rejectionKind: 'language' | 'product' | null;
};

export type ProductScanRejectedCandidateSummary = {
  rejectedCount: number;
  languageRejectedCount: number;
  latestRejectedUrl: string | null;
  latestReason: string | null;
  latestRejectionKind: 'language' | 'product' | null;
};

export type ProductScanEvaluationPolicySummary = {
  executionLabel: string | null;
  modelSource: string | null;
  modelLabel: string | null;
  thresholdLabel: string | null;
  scopeLabel: string | null;
  similarityDecisionLabel: string | null;
  languageGateLabel: string | null;
  languageDetectionLabel: string | null;
};

export type ProductScanEvaluationExecutionSummary = {
  badgeLabel: string;
  detailLabel: string | null;
};

export type ProductScanContinuationContext = {
  step: ProductScanStep;
  rejectedUrl: string | null;
  nextUrl: string | null;
  rejectionKind: 'language' | 'product' | null;
};

export type ProductScanStepGroupView = {
  group: ProductScanStepGroup;
  steps: ProductScanStep[];
};

export type ProductScanStepsStats = {
  warningCount: number;
  failedCount: number;
  retryCount: number;
  amazonCandidateAttemptCount: number;
  supplierCandidateAttemptCount: number;
};
