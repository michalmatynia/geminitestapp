import 'server-only';

import {
  toRecord,
  readOptionalString,
} from './product-scans-service.helpers.base';
import {
  normalizeParsedAmazonDetails,
  normalizeParsedAmazonProbe,
  normalizeParsedSupplierDetails,
  normalizeParsedSupplierProbe,
  normalizeParsedSupplierEvaluation,
  normalizeParsedCandidateUrls,
  normalizeParsedAmazonCandidateResults,
  normalizeParsedAmazonCandidatePreviews,
  normalizeParsedProductScanSteps,
} from './product-scans-service.helpers.steps';
import type {
  AmazonScanRuntimeResult,
  SupplierScanRuntimeResult,
} from './product-scans-service.types';

const AMAZON_SCAN_RUNTIME_STATUSES = [
  'matched',
  'probe_ready',
  'triage_ready',
  'no_match',
  'failed',
  'captcha_required',
  'running',
] satisfies AmazonScanRuntimeResult['status'][];

const SUPPLIER_SCAN_RUNTIME_STATUSES = [
  'matched',
  'probe_ready',
  'no_match',
  'failed',
  'captcha_required',
  'running',
] satisfies SupplierScanRuntimeResult['status'][];

const resolveAmazonScanRuntimeStatus = (rawStatus: string): AmazonScanRuntimeResult['status'] => {
  if (AMAZON_SCAN_RUNTIME_STATUSES.includes(rawStatus as AmazonScanRuntimeResult['status'])) {
    return rawStatus as AmazonScanRuntimeResult['status'];
  }
  return 'failed';
};

const resolveSupplierScanRuntimeStatus = (rawStatus: string): SupplierScanRuntimeResult['status'] => {
  if (SUPPLIER_SCAN_RUNTIME_STATUSES.includes(rawStatus as SupplierScanRuntimeResult['status'])) {
    return rawStatus as SupplierScanRuntimeResult['status'];
  }
  return 'failed';
};

export const parseAmazonScanRuntimeResult = (value: unknown): AmazonScanRuntimeResult => {
  const record = toRecord(value) ?? {};
  const status = resolveAmazonScanRuntimeStatus(readOptionalString(record['status']) ?? 'failed');

  return {
    status,
    asin: readOptionalString(record['asin']),
    title: readOptionalString(record['title']),
    price: readOptionalString(record['price']),
    url: readOptionalString(record['url']),
    description: readOptionalString(record['description']),
    amazonDetails: normalizeParsedAmazonDetails(record['amazonDetails']),
    amazonProbe: normalizeParsedAmazonProbe(record['amazonProbe']),
    candidateUrls: normalizeParsedCandidateUrls(record['candidateUrls']),
    candidateResults: normalizeParsedAmazonCandidateResults(record['candidateResults']),
    candidatePreviews: normalizeParsedAmazonCandidatePreviews(record['candidatePreviews']),
    matchedImageId: readOptionalString(record['matchedImageId']),
    message: readOptionalString(record['message']),
    currentUrl: readOptionalString(record['currentUrl']),
    stage: readOptionalString(record['stage']),
    steps: normalizeParsedProductScanSteps(record['steps']),
  };
};

export const parse1688ScanRuntimeResult = (value: unknown): SupplierScanRuntimeResult => {
  const record = toRecord(value) ?? {};
  const status = resolveSupplierScanRuntimeStatus(readOptionalString(record['status']) ?? 'failed');

  return {
    status,
    title: readOptionalString(record['title']),
    price: readOptionalString(record['price']),
    url: readOptionalString(record['url']),
    description: readOptionalString(record['description']),
    supplierDetails: normalizeParsedSupplierDetails(record['supplierDetails']),
    supplierProbe: normalizeParsedSupplierProbe(record['supplierProbe']),
    supplierEvaluation: normalizeParsedSupplierEvaluation(record['supplierEvaluation']),
    candidateUrls: normalizeParsedCandidateUrls(record['candidateUrls']),
    matchedImageId: readOptionalString(record['matchedImageId']),
    message: readOptionalString(record['message']),
    currentUrl: readOptionalString(record['currentUrl']),
    stage: readOptionalString(record['stage']),
    steps: normalizeParsedProductScanSteps(record['steps']),
  };
};
