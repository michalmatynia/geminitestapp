import 'server-only';

import {
  productScanStepSchema,
  productScanAmazonDetailsSchema,
  productScanAmazonProbeSchema,
  productScanSupplierDetailsSchema,
  productScanSupplierProbeSchema,
  productScanSupplierEvaluationSchema,
  type ProductScanAmazonDetails,
  type ProductScanAmazonProbe,
  type ProductScanRecord,
  type ProductScanStep,
  type ProductScanSupplierDetails,
  type ProductScanSupplierProbe,
  type ProductScanSupplierEvaluation,
} from '@/shared/contracts/product-scans';
import { resolveProductScanStepGroup as resolveSharedProductScanStepGroup } from '@/shared/lib/browser-execution/product-scan-step-sequencer';
import {
  toRecord,
  readOptionalString,
  readOptionalPositiveInt,
} from './product-scans-service.helpers.base';
import {
  PRODUCT_SCAN_MATCHED_IMAGE_ID_MAX_LENGTH,
  PRODUCT_SCAN_URL_MAX_LENGTH,
} from './product-scans-service.constants';
import type { AmazonScanCandidateResult } from './product-scans-service.types';

export const normalizeParsedProductScanSteps = (value: unknown): ProductScanStep[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item: unknown) => {
      const parsed = productScanStepSchema.safeParse(item);
      return parsed.success ? parsed.data : null;
    })
    .filter((step): step is ProductScanStep => step !== null);
};

export const normalizeParsedAmazonDetails = (value: unknown): ProductScanAmazonDetails => {
  const parsed = productScanAmazonDetailsSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
};

export const normalizeParsedAmazonProbe = (value: unknown): ProductScanAmazonProbe => {
  const parsed = productScanAmazonProbeSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
};

export const normalizeParsedSupplierDetails = (value: unknown): ProductScanSupplierDetails => {
  const parsed = productScanSupplierDetailsSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
};

export const normalizeParsedSupplierProbe = (value: unknown): ProductScanSupplierProbe => {
  const parsed = productScanSupplierProbeSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
};

export const normalizeParsedSupplierEvaluation = (
  value: unknown
): ProductScanSupplierEvaluation => {
  const parsed = productScanSupplierEvaluationSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export const normalizeParsedCandidateUrls = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item: unknown) => readOptionalString(item))
    .filter((item): item is string => item !== null);
};

export const normalizeParsedAmazonCandidateResults = (
  value: unknown
): AmazonScanCandidateResult[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item: unknown): AmazonScanCandidateResult | null => {
      const record = toRecord(item);
      const url = readOptionalString(record?.['url']);
      if (!url) return null;
      return {
        url,
        score: typeof record['score'] === 'number' ? record['score'] : null,
        asin: readOptionalString(record['asin']),
        marketplaceDomain: readOptionalString(record['marketplaceDomain']),
        title: readOptionalString(record['title']),
        snippet: readOptionalString(record['snippet']),
        rank: typeof record['rank'] === 'number' ? record['rank'] : null,
      };
    })
    .filter((item): item is AmazonScanCandidateResult => item !== null);
};

export const resolveProductScanStepGroup = (
  key: string | null | undefined
): ProductScanStep['group'] => resolveSharedProductScanStepGroup(key);

export const areProductScanStepsEqual = (
  a: ProductScanStep[],
  b: ProductScanStep[]
): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    const stepA = a[i];
    const stepB = b[i];
    if (
      stepA.key !== stepB.key ||
      stepA.status !== stepB.status ||
      stepA.resultCode !== stepB.resultCode ||
      stepA.message !== stepB.message ||
      stepA.url !== stepB.url ||
      stepA.candidateId !== stepB.candidateId ||
      stepA.candidateRank !== stepB.candidateRank ||
      stepA.attempt !== stepB.attempt ||
      JSON.stringify(stepA.details) !== JSON.stringify(stepB.details)
    ) {
      return false;
    }
  }

  return true;
};

export const resolvePersistedProductScanSteps = (
  scan: ProductScanRecord,
  nextSteps?: ProductScanStep[] | null
): ProductScanStep[] => {
  const existingSteps = Array.isArray(scan.steps) ? scan.steps : [];
  if (!nextSteps || nextSteps.length === 0) {
    return existingSteps;
  }

  const results = [...existingSteps];
  for (const nextStep of nextSteps) {
    const existingIndex = results.findIndex((s) => s.key === nextStep.key);
    if (existingIndex >= 0) {
      const existing = results[existingIndex];
      results[existingIndex] = {
        ...existing,
        ...nextStep,
        details: nextStep.details ?? existing.details ?? null,
      };
    } else {
      results.push(nextStep);
    }
  }

  return results;
};

export const upsertPersistedProductScanStep = (
  steps: ProductScanStep[],
  nextStep: Partial<ProductScanStep> & { key: string; label: string }
): ProductScanStep[] => {
  const results = [...steps];
  const existingIndex = results.findIndex((s) => s.key === nextStep.key);

  const mergedStep: ProductScanStep = {
    key: nextStep.key,
    label: nextStep.label,
    group: nextStep.group ?? resolveProductScanStepGroup(nextStep.key),
    status: nextStep.status ?? 'pending',
    resultCode: nextStep.resultCode ?? null,
    message: nextStep.message ?? null,
    details: nextStep.details ?? null,
    candidateId: nextStep.candidateId ?? null,
    candidateRank: nextStep.candidateRank ?? null,
    url: nextStep.url ?? null,
    attempt: nextStep.attempt ?? null,
    retryOf: nextStep.retryOf ?? null,
    inputSource: nextStep.inputSource ?? 'url',
    startedAt: nextStep.startedAt ?? new Date().toISOString(),
    completedAt: nextStep.completedAt ?? null,
    ...(existingIndex >= 0 ? results[existingIndex] : {}),
    ...nextStep,
  };

  if (existingIndex >= 0) {
    results[existingIndex] = mergedStep;
  } else {
    results.push(mergedStep);
  }

  return results;
};

export const createPersistedProductScanStep = (input: {
  key: string;
  label: string;
  status?: ProductScanStep['status'];
  resultCode?: string | null;
  message?: string | null;
  details?: Record<string, unknown> | null;
  url?: string | null;
  candidateId?: string | null;
  candidateRank?: number | null;
  attempt?: number | null;
  retryOf?: string | null;
  inputSource?: ProductScanStep['inputSource'];
}): ProductScanStep => ({
  key: input.key,
  label: input.label,
  group: resolveProductScanStepGroup(input.key),
  status: input.status ?? 'pending',
  resultCode: input.resultCode ?? null,
  message: readOptionalString(input.message),
  details: toRecord(input.details),
  url: readOptionalString(input.url, PRODUCT_SCAN_URL_MAX_LENGTH),
  candidateId: readOptionalString(input.candidateId, PRODUCT_SCAN_MATCHED_IMAGE_ID_MAX_LENGTH),
  candidateRank: readOptionalPositiveInt(input.candidateRank),
  attempt: readOptionalPositiveInt(input.attempt),
  retryOf: readOptionalString(input.retryOf),
  inputSource: input.inputSource ?? 'url',
  startedAt: new Date().toISOString(),
  completedAt: input.status === 'completed' || input.status === 'failed' ? new Date().toISOString() : null,
});

export const buildPreparedProductScanSteps = (input: {
  stepKeys: string[];
}): ProductScanStep[] =>
  input.stepKeys.map((key) =>
    createPersistedProductScanStep({
      key,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      status: 'pending',
    })
  );

export const resolveNextQueueStepAttempt = (
  steps: ProductScanRecord['steps']
): number =>
  Math.max(
    0,
    ...steps
      .filter((step) => step.key === 'queue_scan')
      .map((step) =>
        typeof step.attempt === 'number' && Number.isFinite(step.attempt) ? step.attempt : 1
      )
  ) + 1;
