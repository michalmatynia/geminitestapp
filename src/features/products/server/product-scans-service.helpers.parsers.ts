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

export const parseAmazonScanRuntimeResult = (value: unknown): AmazonScanRuntimeResult => {
  const record = toRecord(value);
  const rawStatus = readOptionalString(record?.['status']) ?? 'failed';

  const status = (['matched', 'probe_ready', 'triage_ready', 'no_match', 'failed', 'captcha_required', 'running'].includes(rawStatus)
    ? rawStatus
    : 'failed') as AmazonScanRuntimeResult['status'];

  return {
    status,
    asin: readOptionalString(record?.['asin']),
    title: readOptionalString(record?.['title']),
    price: readOptionalString(record?.['price']),
    url: readOptionalString(record?.['url']),
    description: readOptionalString(record?.['description']),
    amazonDetails: normalizeParsedAmazonDetails(record?.['amazonDetails']),
    amazonProbe: normalizeParsedAmazonProbe(record?.['amazonProbe']),
    candidateUrls: normalizeParsedCandidateUrls(record?.['candidateUrls']),
    candidateResults: normalizeParsedAmazonCandidateResults(record?.['candidateResults']),
    candidatePreviews: normalizeParsedAmazonCandidatePreviews(record?.['candidatePreviews']),
    matchedImageId: readOptionalString(record?.['matchedImageId']),
    message: readOptionalString(record?.['message']),
    currentUrl: readOptionalString(record?.['currentUrl']),
    stage: readOptionalString(record?.['stage']),
    steps: normalizeParsedProductScanSteps(record?.['steps']),
  };
};

export const parse1688ScanRuntimeResult = (value: unknown): SupplierScanRuntimeResult => {
  const record = toRecord(value);
  const rawStatus = readOptionalString(record?.['status']) ?? 'failed';

  const status = (['matched', 'probe_ready', 'no_match', 'failed', 'captcha_required', 'running'].includes(rawStatus)
    ? rawStatus
    : 'failed') as SupplierScanRuntimeResult['status'];

  return {
    status,
    title: readOptionalString(record?.['title']),
    price: readOptionalString(record?.['price']),
    url: readOptionalString(record?.['url']),
    description: readOptionalString(record?.['description']),
    supplierDetails: normalizeParsedSupplierDetails(record?.['supplierDetails']),
    supplierProbe: normalizeParsedSupplierProbe(record?.['supplierProbe']),
    supplierEvaluation: normalizeParsedSupplierEvaluation(record?.['supplierEvaluation']),
    candidateUrls: normalizeParsedCandidateUrls(record?.['candidateUrls']),
    matchedImageId: readOptionalString(record?.['matchedImageId']),
    message: readOptionalString(record?.['message']),
    currentUrl: readOptionalString(record?.['currentUrl']),
    stage: readOptionalString(record?.['stage']),
    steps: normalizeParsedProductScanSteps(record?.['steps']),
  };
};
