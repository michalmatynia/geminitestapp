import type {
  ProductScanAmazonDetails as ProductScanAmazonDetailsValue,
  ProductScanRecord,
  ProductScanStep,
} from '@/shared/contracts/product-scans';

export type DetailField = {
  label: string;
  value: string | null | undefined;
};

export type AmazonDetails = NonNullable<ProductScanAmazonDetailsValue>;
export type AmazonAttribute = AmazonDetails['attributes'][number];

export type AmazonAttributeGroup = {
  entries: AmazonAttribute[];
  source: string;
};

export type AmazonExtractionProvenance = {
  candidateId: string | null;
  candidateRank: number | null;
  extractionResultLabel: string | null;
  inputSourceLabel: string | null;
  retryOf: string | null;
  reusedProbe: boolean;
};

export type AmazonRejectedCandidateHistoryEntry = {
  attempt: number;
  candidateId: string | null;
  candidateRank: number | null;
  confidenceLabel: string | null;
  message: string | null;
  mismatch: string | null;
  modelId: string | null;
  reason: string | null;
  rejectionKind: 'language' | 'product';
  url: string | null;
};

export type AmazonRejectedCandidateBreakdown = {
  languageRejectedCount: number;
  productRejectedCount: number;
  totalCount: number;
};

export type AmazonScanQualitySummary = {
  primaryLabel: 'Strong match' | 'Partial extraction' | 'Scraped info';
  usedCaptcha: boolean;
  usedFallback: boolean;
};

export type ProductScanAmazonDetailsScan = Pick<
  ProductScanRecord,
  'amazonDetails' | 'amazonEvaluation' | 'amazonProbe' | 'asin' | 'description' | 'title'
> & {
  steps?: ProductScanStep[] | null;
};

export type ProductScanAmazonQualityScan = Pick<
  ProductScanRecord,
  'amazonDetails' | 'asin' | 'description' | 'title'
> & {
  steps?: ProductScanStep[] | null;
};
