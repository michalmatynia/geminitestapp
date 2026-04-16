import 'server-only';

import {
  type ProductScanAmazonDetails,
  type ProductScanAmazonProbe,
  type ProductScanStep,
  type ProductScanSupplierDetails,
  type ProductScanSupplierEvaluation,
  type ProductScanSupplierProbe,
} from '@/shared/contracts/product-scans';

export type AmazonScanScriptResult = {
  status:
    | 'matched'
    | 'probe_ready'
    | 'triage_ready'
    | 'no_match'
    | 'failed'
    | 'captcha_required'
    | 'running';
  asin: string | null;
  title: string | null;
  price: string | null;
  url: string | null;
  description: string | null;
  amazonDetails: ProductScanAmazonDetails;
  amazonProbe: ProductScanAmazonProbe;
  candidateUrls: string[];
  candidateResults: AmazonScanCandidateResult[];
  matchedImageId: string | null;
  message: string | null;
  currentUrl: string | null;
  stage: string | null;
  steps: ProductScanStep[];
};

export type SupplierScanScriptResult = {
  status:
    | 'matched'
    | 'probe_ready'
    | 'no_match'
    | 'failed'
    | 'captcha_required'
    | 'running';
  title: string | null;
  price: string | null;
  url: string | null;
  description: string | null;
  supplierDetails: ProductScanSupplierDetails;
  supplierProbe: ProductScanSupplierProbe;
  supplierEvaluation: ProductScanSupplierEvaluation;
  candidateUrls: string[];
  matchedImageId: string | null;
  message: string | null;
  currentUrl: string | null;
  stage: string | null;
  steps: ProductScanStep[];
};

export type AmazonScanCandidateResult = {
  url: string;
  score: number | null;
  asin: string | null;
  marketplaceDomain: string | null;
  title: string | null;
  snippet: string | null;
  rank: number | null;
};
