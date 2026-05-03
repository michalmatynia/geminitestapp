import 'server-only';

import type {
  ProductScanAmazonMismatchLabel,
  ProductScanAmazonRecommendedAction,
  ProductScanAmazonRejectionCategory,
} from '@/shared/contracts/product-scans';

export type ProductScanCandidateTriageEvaluationCandidate = {
  url: string;
  rankBefore: number;
  rankAfter: number | null;
  confidence: number | null;
  keep: boolean;
  asin: string | null;
  marketplaceDomain: string | null;
  title: string | null;
  snippet: string | null;
  pageLanguage: string | null;
  languageAccepted: boolean | null;
  recommendedAction: ProductScanAmazonRecommendedAction | null;
  rejectionCategory: ProductScanAmazonRejectionCategory | null;
  reasons: string[];
  mismatchLabels: ProductScanAmazonMismatchLabel[];
};

export type ProductScanCandidateTriageEvaluationResult = {
  status: 'approved' | 'rejected' | 'skipped' | 'failed';
  stage: 'candidate_triage';
  confidence: number | null;
  threshold: number | null;
  recommendedAction: ProductScanAmazonRecommendedAction | null;
  rejectionCategory: ProductScanAmazonRejectionCategory | null;
  reasons: string[];
  mismatchLabels: ProductScanAmazonMismatchLabel[];
  modelId: string | null;
  brainApplied: Record<string, unknown> | null;
  candidates: ProductScanCandidateTriageEvaluationCandidate[];
  keptCandidateUrls: string[];
  provider: string | null;
  error: string | null;
  evaluatedAt: string | null;
};
