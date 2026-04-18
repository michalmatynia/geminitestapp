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
import type {
  AmazonScanCandidatePreview,
  AmazonScanCandidateResult,
} from './product-scans-service.types';

export const normalizeParsedProductScanSteps = (value: unknown): ProductScanStep[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item: unknown) => {
      const record = toRecord(item);
      const sanitizedItem =
        record === null
          ? item
          : {
              ...record,
              details: Array.isArray(record['details'])
                ? record['details'].slice(0, 20)
                : record['details'],
            };
      const parsed = productScanStepSchema.safeParse(sanitizedItem);
      return parsed.success ? parsed.data : null;
    })
    .filter((step): step is ProductScanStep => step !== null);
};

export const normalizeParsedAmazonDetails = (value: unknown): ProductScanAmazonDetails => {
  const parsed = productScanAmazonDetailsSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export const normalizeParsedAmazonProbe = (value: unknown): ProductScanAmazonProbe => {
  const parsed = productScanAmazonProbeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export const normalizeParsedSupplierDetails = (value: unknown): ProductScanSupplierDetails => {
  const parsed = productScanSupplierDetailsSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export const normalizeParsedSupplierProbe = (value: unknown): ProductScanSupplierProbe => {
  const parsed = productScanSupplierProbeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
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
      if (record === null) return null;
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

export const normalizeParsedAmazonCandidatePreviews = (
  value: unknown
): AmazonScanCandidatePreview[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item: unknown): AmazonScanCandidatePreview | null => {
      const record = toRecord(item);
      if (record === null) return null;
      const url = readOptionalString(record?.['url']);
      if (!url) return null;
      return {
        id: readOptionalString(record['id']),
        matchedImageId: readOptionalString(record['matchedImageId']),
        url,
        asin: readOptionalString(record['asin']),
        marketplaceDomain: readOptionalString(record['marketplaceDomain']),
        title: readOptionalString(record['title']),
        snippet: readOptionalString(record['snippet']),
        heroImageUrl: readOptionalString(record['heroImageUrl']),
        heroImageAlt: readOptionalString(record['heroImageAlt']),
        heroImageArtifactName: readOptionalString(record['heroImageArtifactName']),
        artifactKey: readOptionalString(record['artifactKey']),
        rank: typeof record['rank'] === 'number' ? record['rank'] : null,
      };
    })
    .filter((item): item is AmazonScanCandidatePreview => item !== null);
};

export const resolveProductScanStepGroup = (
  key: string | null | undefined
): ProductScanStep['group'] => resolveSharedProductScanStepGroup(key);

const normalizePersistedProductScanStepDetails = (
  details: ProductScanStep['details'] | null | undefined
): ProductScanStep['details'] => (Array.isArray(details) ? details.slice(0, 20) : []);

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
    if (stepA === undefined || stepB === undefined) {
      return false;
    }
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

const normalizeProductScanStepIdentityText = (value: unknown): string | null =>
  readOptionalString(value);

const normalizeProductScanStepIdentityInt = (value: unknown): number | null =>
  readOptionalPositiveInt(value);

const hasSameProductScanStepPersistenceIdentity = (
  existing: Pick<ProductScanStep, 'key' | 'candidateId' | 'candidateRank' | 'attempt' | 'retryOf'>,
  next: Pick<ProductScanStep, 'key' | 'candidateId' | 'candidateRank' | 'attempt' | 'retryOf'>
): boolean =>
  existing.key === next.key &&
  normalizeProductScanStepIdentityText(existing.candidateId) ===
    normalizeProductScanStepIdentityText(next.candidateId) &&
  normalizeProductScanStepIdentityInt(existing.candidateRank) ===
    normalizeProductScanStepIdentityInt(next.candidateRank) &&
  normalizeProductScanStepIdentityInt(existing.attempt) ===
    normalizeProductScanStepIdentityInt(next.attempt) &&
  normalizeProductScanStepIdentityText(existing.retryOf) ===
    normalizeProductScanStepIdentityText(next.retryOf);

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
    const existingIndex = results.findIndex((step) =>
      hasSameProductScanStepPersistenceIdentity(step, nextStep)
    );
    if (existingIndex >= 0) {
      const existing = results[existingIndex];
      if (existing === undefined) {
        results.push(nextStep);
        continue;
      }
      results[existingIndex] = {
        ...existing,
        ...nextStep,
        details: normalizePersistedProductScanStepDetails(nextStep.details ?? existing.details),
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
  const existingIndex = results.findIndex((step) =>
    hasSameProductScanStepPersistenceIdentity(step, {
      key: nextStep.key,
      candidateId: nextStep.candidateId ?? null,
      candidateRank: nextStep.candidateRank ?? null,
      attempt: nextStep.attempt ?? null,
      retryOf: nextStep.retryOf ?? null,
    })
  );
  const existingStep = existingIndex >= 0 ? results[existingIndex] : undefined;

  const mergedStep: ProductScanStep = {
    ...nextStep,
    key: nextStep.key,
    label: nextStep.label,
    group: nextStep.group ?? existingStep?.group ?? resolveProductScanStepGroup(nextStep.key),
    status: nextStep.status ?? existingStep?.status ?? 'pending',
    resultCode: nextStep.resultCode ?? existingStep?.resultCode ?? null,
    message: nextStep.message ?? existingStep?.message ?? null,
    details: normalizePersistedProductScanStepDetails(nextStep.details ?? existingStep?.details),
    candidateId: nextStep.candidateId ?? existingStep?.candidateId ?? null,
    candidateRank: nextStep.candidateRank ?? existingStep?.candidateRank ?? null,
    url: nextStep.url ?? existingStep?.url ?? null,
    attempt: nextStep.attempt ?? existingStep?.attempt ?? null,
    retryOf: nextStep.retryOf ?? existingStep?.retryOf ?? null,
    inputSource: nextStep.inputSource ?? existingStep?.inputSource ?? 'url',
    warning: nextStep.warning ?? existingStep?.warning ?? null,
    startedAt: nextStep.startedAt ?? existingStep?.startedAt ?? new Date().toISOString(),
    completedAt: nextStep.completedAt ?? existingStep?.completedAt ?? null,
    durationMs: nextStep.durationMs ?? existingStep?.durationMs ?? null,
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
  details?: ProductScanStep['details'] | null;
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
  details: normalizePersistedProductScanStepDetails(input.details),
  url: readOptionalString(input.url, PRODUCT_SCAN_URL_MAX_LENGTH),
  candidateId: readOptionalString(input.candidateId, PRODUCT_SCAN_MATCHED_IMAGE_ID_MAX_LENGTH),
  candidateRank: readOptionalPositiveInt(input.candidateRank),
  attempt: readOptionalPositiveInt(input.attempt),
  retryOf: readOptionalString(input.retryOf),
  inputSource: input.inputSource ?? 'url',
  warning: null,
  startedAt: new Date().toISOString(),
  completedAt: input.status === 'completed' || input.status === 'failed' ? new Date().toISOString() : null,
  durationMs: null,
});

export const buildPreparedProductScanSteps = (input: {
  stepKeys?: string[];
  prepareLabel?: string;
  summaryLabel?: string;
  imageCandidateCount?: number;
  status?: ProductScanRecord['status'];
  error?: string | null;
}): ProductScanStep[] => {
  const stepKeys = input.stepKeys ?? ['validate', 'prepare_scan', 'queue_scan'];
  return stepKeys.map((key) =>
    createPersistedProductScanStep({
      key,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      status: 'pending',
    })
  );
};
