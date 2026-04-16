'use client';

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import type {
  ProductScanAmazonDetails as ProductScanAmazonDetailsValue,
  ProductScanAmazonEvaluationResult,
  ProductScanRecord,
  ProductScanStep,
} from '@/shared/contracts/product-scans';
import { CopyButton } from '@/shared/ui/copy-button';
import { Input } from '@/shared/ui/input';

type DetailField = {
  label: string;
  value: string | null | undefined;
};

type AmazonDetails = NonNullable<ProductScanAmazonDetailsValue>;
type AmazonAttribute = AmazonDetails['attributes'][number];
type AmazonExtractionProvenance = {
  candidateId: string | null;
  candidateRank: number | null;
  inputSourceLabel: string | null;
  retryOf: string | null;
  reusedProbe: boolean;
  extractionResultLabel: string | null;
};
type AmazonRejectedCandidateHistoryEntry = {
  attempt: number;
  candidateId: string | null;
  candidateRank: number | null;
  url: string | null;
  rejectionKind: 'language' | 'product';
  confidenceLabel: string | null;
  modelId: string | null;
  reason: string | null;
  mismatch: string | null;
  message: string | null;
};

export type AmazonRejectedCandidateBreakdown = {
  totalCount: number;
  languageRejectedCount: number;
  productRejectedCount: number;
};

export type AmazonScanQualitySummary = {
  primaryLabel: 'Strong match' | 'Partial extraction' | 'Scraped info';
  usedFallback: boolean;
  usedCaptcha: boolean;
};

const hasText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const resolveDetailFields = (
  fields: DetailField[]
): Array<{ label: string; value: string }> => {
  const result: Array<{ label: string; value: string }> = [];
  for (const field of fields) {
    if (hasText(field.value)) {
      result.push({
        label: field.label,
        value: field.value.trim(),
      });
    }
  }
  return result;
};

const resolveAttributeSourceLabel = (value: string | null | undefined): string => {
  const normalized = hasText(value) ? value.trim() : 'other';
  if (normalized === 'detail_bullets') return 'Detail Bullets';
  if (normalized === 'technical_details') return 'Technical Details';
  if (normalized === 'product_details') return 'Product Details';
  if (normalized === 'technical_specifications') return 'Technical Specifications';
  if (normalized === 'product_overview') return 'Product Overview';
  return normalized
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const groupAmazonAttributesBySource = (
  details: ProductScanAmazonDetailsValue | null | undefined
): Array<{ source: string; entries: AmazonAttribute[] }> => {
  if (details === null || details === undefined || details.attributes.length === 0) {
    return [];
  }

  const grouped = new Map<string, AmazonAttribute[]>();
  for (const entry of details.attributes) {
    const source = resolveAttributeSourceLabel(entry.source);
    const existingEntries = grouped.get(source) ?? [];
    existingEntries.push(entry);
    grouped.set(source, existingEntries);
  }

  const sourceOrder = new Map<string, number>([
    ['Product Overview', 0],
    ['Product Details', 1],
    ['Technical Details', 2],
    ['Technical Specifications', 3],
    ['Detail Bullets', 4],
  ]);

  return Array.from(grouped.entries())
    .map(([source, entries]) => ({
      source,
      entries: [...entries].sort((left, right) =>
        left.label.localeCompare(right.label, undefined, { sensitivity: 'base' })
      ),
    }))
    .sort((left, right) => {
      const leftRank = sourceOrder.get(left.source) ?? Number.MAX_SAFE_INTEGER;
      const rightRank = sourceOrder.get(right.source) ?? Number.MAX_SAFE_INTEGER;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
      return left.source.localeCompare(right.source, undefined, { sensitivity: 'base' });
    });
};

const matchesAttributeQuery = (attribute: AmazonAttribute, query: string): boolean => {
  if (query === '') {
    return true;
  }

  const haystack = [attribute.label, attribute.value, attribute.key, attribute.source]
    .filter((v): v is string => hasText(v))
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
};

const formatResultCode = (value: string | null | undefined): string | null => {
  if (hasText(value)) {
    return value
      .trim()
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
  return null;
};

const resolveInputSourceLabel = (value: string | null | undefined): string | null => {
  if (hasText(value)) {
    const trimmed = value.trim();
    return trimmed === 'url' ? 'URL input' : trimmed === 'file' ? 'File input' : trimmed;
  }
  return null;
};

const resolveAmazonEvaluationStatusLabel = (
  value: ProductScanAmazonEvaluationResult['status'] | null | undefined
): string | null => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  if (value === 'approved') return 'AI approved';
  if (value === 'rejected') return 'AI rejected';
  if (value === 'skipped') return 'AI skipped';
  return 'AI failed';
};

const formatAmazonEvaluationConfidence = (value: number | null | undefined): string | null =>
  typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value * 100)}%` : null;

const formatAmazonPageLanguage = (value: string | null | undefined): string | null => {
  if (hasText(value)) {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'en') return 'English';
    if (normalized === 'en-us') return 'English (US)';
    if (normalized === 'en-gb') return 'English (UK)';
    if (normalized === 'de') return 'German';
    if (normalized === 'fr') return 'French';
    if (normalized === 'es') return 'Spanish';
    if (normalized === 'it') return 'Italian';
    if (normalized === 'pl') return 'Polish';
    if (normalized === 'nl') return 'Dutch';
    if (normalized === 'sv') return 'Swedish';
    if (normalized === 'ja') return 'Japanese';
    return normalized.toUpperCase();
  }
  return null;
};

const resolveStepDetailValue = (
  step: Pick<ProductScanStep, 'details'>,
  label: string
): string | null => {
  const detail = step.details.find((entry) => entry.label === label);
  if (detail && hasText(detail.value)) {
    return detail.value.trim();
  }
  return null;
};

const resolveLatestAmazonEvaluationStep = (
  steps: readonly ProductScanStep[] | null | undefined
): ProductScanStep | null => {
  if (steps) {
    return [...steps].reverse().find((step) => step.key === 'amazon_ai_evaluate') ?? null;
  }
  return null;
};

const resolveAmazonExtractionProvenance = (
  steps: readonly ProductScanStep[] | null | undefined
): AmazonExtractionProvenance | null => {
  const normalizedSteps: readonly ProductScanStep[] = steps ?? [];
  if (normalizedSteps.length === 0) {
    return null;
  }

  const reversedSteps = [...normalizedSteps].reverse();
  const amazonExtractStep =
    reversedSteps.find((step) => step.key === 'amazon_extract' && step.status === 'completed') ??
    reversedSteps.find((step) => step.key === 'amazon_extract');
  const amazonProbeStep = reversedSteps.find((step) => step.key === 'amazon_probe') ?? null;
  const googleUploadStep =
    reversedSteps.find(
      (step) =>
        step.key === 'google_upload' &&
        step.status === 'completed' &&
        ((amazonExtractStep?.candidateId ?? '') === '' || step.candidateId === amazonExtractStep?.candidateId)
    ) ??
    reversedSteps.find((step) => step.key === 'google_upload' && step.status === 'completed') ??
    reversedSteps.find((step) => step.key === 'google_upload');

  const extractCandidateId = amazonExtractStep?.candidateId;
  const uploadCandidateId = googleUploadStep?.candidateId;
  const candidateId = (typeof extractCandidateId === 'string' && extractCandidateId.trim() !== '' ? extractCandidateId.trim() : null) ??
    (typeof uploadCandidateId === 'string' && uploadCandidateId.trim() !== '' ? uploadCandidateId.trim() : null);
  const candidateRank =
    typeof amazonExtractStep?.candidateRank === 'number' && Number.isFinite(amazonExtractStep.candidateRank)
      ? amazonExtractStep.candidateRank
      : null;
  const inputSourceLabel = resolveInputSourceLabel(googleUploadStep?.inputSource);
  const uploadRetryOf = googleUploadStep?.retryOf;
  const retryOf = (typeof uploadRetryOf === 'string' && uploadRetryOf.trim() !== '' ? uploadRetryOf.trim() : null);
  const reusedProbe = amazonProbeStep?.resultCode === 'probe_reused';
  const extractionResultLabel =
    formatResultCode(amazonExtractStep?.resultCode) ?? formatResultCode(googleUploadStep?.resultCode);

  if (candidateId === null && candidateRank === null && inputSourceLabel === null && retryOf === null && reusedProbe === false && extractionResultLabel === null) {
    return null;
  }

  return {
    candidateId,
    candidateRank,
    inputSourceLabel,
    retryOf,
    reusedProbe,
    extractionResultLabel,
  };
};

const resolveRejectedAmazonCandidateHistory = (
  steps: readonly ProductScanStep[] | null | undefined
): AmazonRejectedCandidateHistoryEntry[] => {
  const normalizedSteps = steps ?? [];
  return normalizedSteps
    .filter(
      (step) =>
        step.key === 'amazon_ai_evaluate' &&
        (step.resultCode === 'candidate_rejected' ||
          step.resultCode === 'candidate_language_rejected')
    )
    .map((step) => {
      const stepCandidateId = step.candidateId;
      const stepUrl = step.url;
      const stepMessage = step.message;
      return {
        attempt:
          typeof step.attempt === 'number' && Number.isFinite(step.attempt) ? step.attempt : 1,
        candidateId: (typeof stepCandidateId === 'string' && stepCandidateId.trim() !== '' ? stepCandidateId.trim() : null),
        candidateRank:
          typeof step.candidateRank === 'number' && Number.isFinite(step.candidateRank)
            ? step.candidateRank
            : null,
        url: (typeof stepUrl === 'string' && stepUrl.trim() !== '' ? stepUrl.trim() : null) ?? resolveStepDetailValue(step, 'Candidate URL'),
        rejectionKind:
          step.resultCode === 'candidate_language_rejected'
            ? ('language' as const)
            : ('product' as const),
        confidenceLabel: resolveStepDetailValue(step, 'Confidence'),
        modelId: resolveStepDetailValue(step, 'Model'),
        reason:
          resolveStepDetailValue(step, 'Reason') ??
          resolveStepDetailValue(step, 'Language reason'),
        mismatch: resolveStepDetailValue(step, 'Mismatch'),
        message: (typeof stepMessage === 'string' && stepMessage.trim() !== '' ? stepMessage.trim() : null),
      };
    })
    .sort((left, right) => left.attempt - right.attempt);
};

export const resolveRejectedAmazonCandidateBreakdown = (
  steps: readonly ProductScanStep[] | null | undefined
): AmazonRejectedCandidateBreakdown => {
  const history = resolveRejectedAmazonCandidateHistory(steps);
  const languageRejectedCount = history.filter((entry) => entry.rejectionKind === 'language').length;

  return {
    totalCount: history.length,
    languageRejectedCount,
    productRejectedCount: history.length - languageRejectedCount,
  };
};

export const resolveRejectedAmazonCandidateCount = (
  steps: readonly ProductScanStep[] | null | undefined
): number => resolveRejectedAmazonCandidateBreakdown(steps).totalCount;

export const resolveAmazonScanRecommendationReason = (
  scan: Pick<ProductScanRecord, 'asin' | 'title' | 'description' | 'amazonDetails' | 'steps'>
): string | null => {
  const quality = resolveAmazonScanQualitySummary(scan);
  const rejectedCandidateBreakdown = resolveRejectedAmazonCandidateBreakdown(scan.steps);
  const rejectedCandidateCount = rejectedCandidateBreakdown.totalCount;
  const rejectedLanguageCount = rejectedCandidateBreakdown.languageRejectedCount;
  const rejectedSuffix =
    rejectedLanguageCount > 0
      ? ` (${rejectedLanguageCount} non-English)`
      : '';

  if (quality === null) {
    if (rejectedCandidateCount > 0) {
      return `Best available result after ${rejectedCandidateCount} rejected candidate${
        rejectedCandidateCount === 1 ? '' : 's'
      }`;
    }
    return 'Best available result';
  }

  if (quality.primaryLabel === 'Strong match') {
    if (rejectedCandidateCount > 0) {
      return `Strong match after ${rejectedCandidateCount} rejected candidate${
        rejectedCandidateCount === 1 ? '' : 's'
      }${rejectedSuffix}`;
    }

    if (quality.usedFallback === false && quality.usedCaptcha === false) {
      return 'Strongest clean match';
    }

    return 'Strongest recovered match';
  }

  if (quality.primaryLabel === 'Partial extraction') {
    if (rejectedCandidateCount > 0) {
      return `Partial extraction after ${rejectedCandidateCount} rejected candidate${
        rejectedCandidateCount === 1 ? '' : 's'
      }${rejectedSuffix}`;
    }

    if (quality.usedFallback === false && quality.usedCaptcha === false) {
      return 'Clean partial extraction';
    }

    return 'Best partial extraction';
  }

  if (rejectedCandidateCount > 0) {
    return `Best scraped result after ${rejectedCandidateCount} rejected candidate${
      rejectedCandidateCount === 1 ? '' : 's'
    }${rejectedSuffix}`;
  }

  return 'Best scraped result';
};

export const resolvePreferredAmazonExtractedScans = (
  scans: ProductScanRecord[]
): ProductScanRecord[] => {
  const extractedScans = scans.filter(
    (scan) => hasProductScanAmazonDetails(scan.amazonDetails) || hasText(scan.asin)
  );

  const resolveQualityPriority = (scan: ProductScanRecord): number => {
    const quality = resolveAmazonScanQualitySummary(scan);
    if (quality === null) {
      return 0;
    }

    const primaryScore =
      quality.primaryLabel === 'Strong match'
        ? 300
        : quality.primaryLabel === 'Partial extraction'
          ? 200
          : 100;

    return primaryScore + (quality.usedFallback === false ? 5 : 0) + (quality.usedCaptcha === false ? 2 : 0);
  };

  const resolveSortTimestamp = (scan: ProductScanRecord): number => {
    const parsed = new Date(scan.updatedAt ?? scan.createdAt ?? 0).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  };

  return [...extractedScans].sort((left, right) => {
    const qualityDifference = resolveQualityPriority(right) - resolveQualityPriority(left);
    if (qualityDifference !== 0) {
      return qualityDifference;
    }

    const rejectionDifference =
      resolveRejectedAmazonCandidateCount(left.steps) -
      resolveRejectedAmazonCandidateCount(right.steps);
    if (rejectionDifference !== 0) {
      return rejectionDifference;
    }

    const timestampDifference = resolveSortTimestamp(right) - resolveSortTimestamp(left);
    if (timestampDifference !== 0) {
      return timestampDifference;
    }

    return left.id.localeCompare(right.id);
  });
};

export const resolveAmazonScanQualitySummary = (
  scan: Pick<ProductScanRecord, 'asin' | 'title' | 'description' | 'amazonDetails'> & {
    steps?: ProductScanStep[] | null;
  }
): AmazonScanQualitySummary | null => {
  const provenance = resolveAmazonExtractionProvenance(scan.steps);
  const normalizedSteps: readonly ProductScanStep[] = Array.isArray(scan.steps) ? scan.steps : [];
  const hasAsin = hasText(scan.asin);
  const hasExtractedDetails = hasProductScanAmazonDetails(scan.amazonDetails);
  const hasListingText = hasText(scan.title) || hasText(scan.description);
  const usedCaptcha = normalizedSteps.some((step) => step.key === 'google_captcha');

  if (hasAsin === false && hasExtractedDetails === false && hasListingText === false && usedCaptcha === false && (provenance?.retryOf ?? '') === '') {
    return null;
  }

  return {
    primaryLabel: hasAsin === true
      ? 'Strong match'
      : hasExtractedDetails === true || hasListingText === true
        ? 'Partial extraction'
        : 'Scraped info',
    usedFallback: (provenance?.retryOf ?? '') !== '',
    usedCaptcha,
  };
};

const resolveAmazonScanQualityModifierLabel = (
  scan: Pick<ProductScanRecord, 'asin' | 'title' | 'description' | 'amazonDetails'> & {
    steps?: ProductScanStep[] | null;
  }
): string | null => {
  const quality = resolveAmazonScanQualitySummary(scan);
  if (quality === null) {
    return null;
  }

  const rejectedCandidateBreakdown = resolveRejectedAmazonCandidateBreakdown(scan.steps);
  const rejectedCandidateCount = rejectedCandidateBreakdown.totalCount;
  if (rejectedCandidateCount > 0) {
    const languageSuffix =
      rejectedCandidateBreakdown.languageRejectedCount > 0
        ? ` (${rejectedCandidateBreakdown.languageRejectedCount} non-English)`
        : '';
    return `After ${rejectedCandidateCount} rejected candidate${
      rejectedCandidateCount === 1 ? '' : 's'
    }${languageSuffix}`;
  }

  if (quality.usedFallback === false && quality.usedCaptcha === false) {
    return 'Clean path';
  }

  if (quality.usedFallback === true || quality.usedCaptcha === true) {
    return 'Recovered path';
  }

  return null;
};

export function ProductScanAmazonQualitySummary(props: {
  scan: Pick<ProductScanRecord, 'asin' | 'title' | 'description' | 'amazonDetails' | 'steps'>;
}): React.JSX.Element | null {
  const quality = resolveAmazonScanQualitySummary(props.scan);
  const modifierLabel = resolveAmazonScanQualityModifierLabel(props.scan);

  if (quality === null) {
    return null;
  }

  const primaryClassName =
    quality.primaryLabel === 'Strong match'
      ? 'border-emerald-500/40 text-emerald-300'
      : quality.primaryLabel === 'Partial extraction'
        ? 'border-amber-500/40 text-amber-300'
        : 'border-border/60';

  return (
    <div className='space-y-2 rounded-md border border-border/50 bg-background/70 px-3 py-2'>
      <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
        Scan Quality
      </p>
      <div className='flex flex-wrap gap-2'>
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${primaryClassName}`}
        >
          {quality.primaryLabel}
        </span>
        {modifierLabel !== null ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium'>
            {modifierLabel}
          </span>
        ) : null}
        {quality.usedFallback === true ? (
          <span className='inline-flex items-center rounded-md border border-amber-500/40 px-2 py-0.5 text-[11px] font-medium text-amber-300'>
            Fallback used
          </span>
        ) : null}
        {quality.usedCaptcha === true ? (
          <span className='inline-flex items-center rounded-md border border-sky-500/40 px-2 py-0.5 text-[11px] font-medium text-sky-300'>
            Captcha path
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function ProductScanAmazonProvenanceSummary(props: {
  scan: Pick<ProductScanRecord, 'steps'>;
}): React.JSX.Element | null {
  const provenance = resolveAmazonExtractionProvenance(props.scan.steps);
  const rejectedCandidateBreakdown = resolveRejectedAmazonCandidateBreakdown(props.scan.steps);
  const rejectedCandidateCount = rejectedCandidateBreakdown.totalCount;

  if (provenance === null && rejectedCandidateCount === 0) {
    return null;
  }

  const inputSourceLabel = provenance?.inputSourceLabel;
  const retryOf = provenance?.retryOf;
  const candidateId = provenance?.candidateId;
  const extractionResultLabel = provenance?.extractionResultLabel;

  return (
    <div className='space-y-2 rounded-md border border-border/50 bg-background/70 px-3 py-2'>
      <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
        Scan Provenance
      </p>
      <div className='flex flex-wrap gap-2'>
        {typeof inputSourceLabel === 'string' ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium'>
            Google: {inputSourceLabel === 'URL input' ? 'URL' : 'File'}
          </span>
        ) : null}
        {typeof retryOf === 'string' ? (
          <span className='inline-flex items-center rounded-md border border-amber-500/40 px-2 py-0.5 text-[11px] font-medium text-amber-300'>
            Fallback: {retryOf}
          </span>
        ) : null}
        {provenance?.reusedProbe === true ? (
          <span className='inline-flex items-center rounded-md border border-emerald-500/40 px-2 py-0.5 text-[11px] font-medium text-emerald-300'>
            Probe reused
          </span>
        ) : null}
        {rejectedCandidateCount > 0 ? (
          <span className='inline-flex items-center rounded-md border border-amber-500/40 px-2 py-0.5 text-[11px] font-medium text-amber-300'>
            Rejected before match: {rejectedCandidateCount}
          </span>
        ) : null}
        {rejectedCandidateBreakdown.languageRejectedCount > 0 ? (
          <span className='inline-flex items-center rounded-md border border-rose-500/40 px-2 py-0.5 text-[11px] font-medium text-rose-300'>
            Non-English rejected: {rejectedCandidateBreakdown.languageRejectedCount}
          </span>
        ) : null}
        {typeof provenance?.candidateRank === 'number' ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium'>
            Amazon rank: #{provenance.candidateRank}
          </span>
        ) : null}
        {typeof candidateId === 'string' ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium'>
            Image: {candidateId}
          </span>
        ) : null}
        {typeof extractionResultLabel === 'string' ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium'>
            Result: {extractionResultLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export const hasProductScanAmazonDetails = (
  details: ProductScanAmazonDetailsValue | null | undefined
): boolean => {
  if (details !== null && details !== undefined) {
    return (
      hasText(details.brand) === true ||
      hasText(details.manufacturer) === true ||
      hasText(details.modelNumber) === true ||
      hasText(details.partNumber) === true ||
      hasText(details.color) === true ||
      hasText(details.style) === true ||
      hasText(details.material) === true ||
      hasText(details.size) === true ||
      hasText(details.pattern) === true ||
      hasText(details.finish) === true ||
      hasText(details.itemDimensions) === true ||
      hasText(details.packageDimensions) === true ||
      hasText(details.itemWeight) === true ||
      hasText(details.packageWeight) === true ||
      hasText(details.bestSellersRank) === true ||
      hasText(details.ean) === true ||
      hasText(details.gtin) === true ||
      hasText(details.upc) === true ||
      hasText(details.isbn) === true ||
      details.bulletPoints.length > 0 ||
      details.attributes.length > 0 ||
      details.rankings.length > 0
    );
  }
  return false;
};

function FieldGroup(props: {
  title: string;
  fields: DetailField[];
}): React.JSX.Element | null {
  const fields = resolveDetailFields(props.fields);
  if (fields.length === 0) {
    return null;
  }

  return (
    <div className='space-y-2'>
      <h5 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
        {props.title}
      </h5>
      <dl className='grid gap-2 sm:grid-cols-2'>
        {fields.map((field) => (
          <div
            key={`${props.title}-${field.label}`}
            className='rounded-md border border-border/50 bg-background/70 px-3 py-2'
          >
            <div className='flex items-start justify-between gap-2'>
              <dt className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                {field.label}
              </dt>
              <CopyButton
                value={field.value}
                ariaLabel={`Copy ${field.label}`}
                size='sm'
                className='h-6 px-2 text-[11px]'
                showText
              />
            </div>
            <dd className='mt-1 text-sm'>{field.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function TextBlock(props: {
  title: string;
  value: string | null | undefined;
}): React.JSX.Element | null {
  if (!hasText(props.value)) {
    return null;
  }

  const trimmedValue = props.value.trim();

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between gap-2'>
        <h5 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
          {props.title}
        </h5>
        <CopyButton
          value={trimmedValue}
          ariaLabel={`Copy ${props.title}`}
          size='sm'
          className='h-6 px-2 text-[11px]'
          showText
        />
      </div>
      <div className='rounded-md border border-border/50 bg-background/70 px-3 py-2'>
        <p className='whitespace-pre-wrap text-sm'>{trimmedValue}</p>
      </div>
    </div>
  );
}

function ProductScanAmazonDetailsBadgeList(props: {
  quality: AmazonScanQualitySummary | null;
  scan: Pick<ProductScanRecord, 'title' | 'asin' | 'amazonEvaluation'>;
  details: ProductScanAmazonDetailsValue | null | undefined;
  provenance: AmazonExtractionProvenance | null;
  rejectedCandidateHistory: AmazonRejectedCandidateHistoryEntry[];
  rejectedCandidateBreakdown: AmazonRejectedCandidateBreakdown;
}): React.JSX.Element {
  const { quality, scan, details, provenance, rejectedCandidateHistory, rejectedCandidateBreakdown } = props;
  return (
    <div className='flex flex-wrap gap-2'>
      {quality !== null ? (
        <span
          className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${
            quality.primaryLabel === 'Strong match'
              ? 'border-emerald-500/40 bg-background/70 text-emerald-300'
              : quality.primaryLabel === 'Partial extraction'
                ? 'border-amber-500/40 bg-background/70 text-amber-300'
                : 'border-border/60 bg-background/70'
          }`}
        >
          {quality.primaryLabel}
        </span>
      ) : null}
      {hasText(scan.title) === true ? (
        <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
          Title available
        </span>
      ) : null}
      {details !== null && details !== undefined && details.bulletPoints.length > 0 ? (
        <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
          {details.bulletPoints.length} bullet point{details.bulletPoints.length === 1 ? '' : 's'}
        </span>
      ) : null}
      {details !== null && details !== undefined && details.attributes.length > 0 ? (
        <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
          {details.attributes.length} extracted attribute{details.attributes.length === 1 ? '' : 's'}
        </span>
      ) : null}
      {details !== null && details !== undefined && details.rankings.length > 0 ? (
        <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
          {details.rankings.length} ranking entr{details.rankings.length === 1 ? 'y' : 'ies'}
        </span>
      ) : null}
      {typeof provenance?.inputSourceLabel === 'string' ? (
        <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
          {provenance.inputSourceLabel}
        </span>
      ) : null}
      {typeof provenance?.retryOf === 'string' ? (
        <span className='inline-flex items-center rounded-md border border-amber-500/40 bg-background/70 px-2.5 py-1 text-xs font-medium text-amber-300'>
          Fallback used
        </span>
      ) : null}
      {provenance?.reusedProbe === true ? (
        <span className='inline-flex items-center rounded-md border border-emerald-500/40 bg-background/70 px-2.5 py-1 text-xs font-medium text-emerald-300'>
          Probe reused
        </span>
      ) : null}
      {quality?.usedCaptcha === true ? (
        <span className='inline-flex items-center rounded-md border border-sky-500/40 bg-background/70 px-2.5 py-1 text-xs font-medium text-sky-300'>
          Captcha path
        </span>
      ) : null}
      {typeof provenance?.candidateRank === 'number' ? (
        <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
          Amazon candidate #{provenance.candidateRank}
        </span>
      ) : null}
      {rejectedCandidateHistory.length > 0 ? (
        <span className='inline-flex items-center rounded-md border border-amber-500/40 bg-background/70 px-2.5 py-1 text-xs font-medium text-amber-300'>
          {rejectedCandidateHistory.length} earlier candidate
          {rejectedCandidateHistory.length === 1 ? '' : 's'} rejected
        </span>
      ) : null}
      {rejectedCandidateBreakdown.languageRejectedCount > 0 ? (
        <span className='inline-flex items-center rounded-md border border-rose-500/40 bg-background/70 px-2.5 py-1 text-xs font-medium text-rose-300'>
          {rejectedCandidateBreakdown.languageRejectedCount} non-English page
          {rejectedCandidateBreakdown.languageRejectedCount === 1 ? '' : 's'} rejected
        </span>
      ) : null}
      {scan.amazonEvaluation !== null && scan.amazonEvaluation !== undefined ? (
        <span
          className={`inline-flex items-center rounded-md border bg-background/70 px-2.5 py-1 text-xs font-medium ${
            scan.amazonEvaluation.status === 'approved'
              ? 'border-emerald-500/40 text-emerald-300'
              : scan.amazonEvaluation.status === 'rejected'
                ? 'border-rose-500/40 text-rose-300'
                : scan.amazonEvaluation.status === 'skipped'
                  ? 'border-border/60'
                  : 'border-amber-500/40 text-amber-300'
          }`}
        >
          {resolveAmazonEvaluationStatusLabel(scan.amazonEvaluation.status)}
        </span>
      ) : null}
      {scan.amazonEvaluation?.languageAccepted === false ? (
        <span className='inline-flex items-center rounded-md border border-rose-500/40 bg-background/70 px-2.5 py-1 text-xs font-medium text-rose-300'>
          Non-English page
        </span>
      ) : null}
      {typeof scan.amazonEvaluation?.pageLanguage === 'string' ? (
        <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
          Language {formatAmazonPageLanguage(scan.amazonEvaluation.pageLanguage)}
        </span>
      ) : null}
      {scan.amazonEvaluation?.confidence !== null && scan.amazonEvaluation?.confidence !== undefined ? (
        <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
          AI confidence {formatAmazonEvaluationConfidence(scan.amazonEvaluation.confidence)}
        </span>
      ) : null}
    </div>
  );
}

export function ProductScanAmazonDetails(props: {
  scan: Pick<
    ProductScanRecord,
    'asin' | 'title' | 'description' | 'amazonDetails' | 'amazonProbe' | 'amazonEvaluation'
  > & {
    steps?: ProductScanStep[];
  };
}): React.JSX.Element | null {
  const { scan } = props;
  const details = scan.amazonDetails;
  const latestAmazonEvaluationStep = useMemo(
    () => resolveLatestAmazonEvaluationStep(scan.steps),
    [scan.steps]
  );
  const provenance = useMemo(() => resolveAmazonExtractionProvenance(scan.steps), [scan.steps]);
  const quality = useMemo(() => resolveAmazonScanQualitySummary(scan), [scan]);
  const rejectedCandidateHistory = useMemo(
    () => resolveRejectedAmazonCandidateHistory(scan.steps),
    [scan.steps]
  );
  const rejectedCandidateBreakdown = useMemo(
    () => resolveRejectedAmazonCandidateBreakdown(scan.steps),
    [scan.steps]
  );
  const [attributeQuery, setAttributeQuery] = useState('');
  const groupedAttributes = useMemo(() => groupAmazonAttributesBySource(details), [details]);
  const normalizedAttributeQuery = attributeQuery.trim().toLowerCase();
  const filteredGroupedAttributes = useMemo(
    () =>
      groupedAttributes
        .map((group) => ({
          source: group.source,
          entries: group.entries.filter((entry) =>
            matchesAttributeQuery(entry, normalizedAttributeQuery)
          ),
        }))
        .filter((group) => group.entries.length > 0),
    [groupedAttributes, normalizedAttributeQuery]
  );
  const totalAttributeCount = groupedAttributes.reduce((count, group) => count + group.entries.length, 0);
  const filteredAttributeCount = filteredGroupedAttributes.reduce(
    (count, group) => count + group.entries.length,
    0
  );

  if (
    hasProductScanAmazonDetails(details) === false &&
    hasText(scan.asin) === false &&
    scan.amazonEvaluation === null &&
    scan.amazonProbe === null
  ) {
    return null;
  }

  return (
    <div className='space-y-3 rounded-md border border-border/60 bg-muted/20 px-3 py-3'>
      <ProductScanAmazonDetailsBadgeList
        quality={quality}
        scan={scan}
        details={details}
        provenance={provenance}
        rejectedCandidateHistory={rejectedCandidateHistory}
        rejectedCandidateBreakdown={rejectedCandidateBreakdown}
      />

      {scan.amazonEvaluation !== null && scan.amazonEvaluation !== undefined ? (
        <FieldGroup
          title='AI Evaluation'
          fields={[
            {
              label: 'Verdict',
              value: resolveAmazonEvaluationStatusLabel(scan.amazonEvaluation.status),
            },
            {
              label: 'Confidence',
              value: formatAmazonEvaluationConfidence(scan.amazonEvaluation.confidence),
            },
            { label: 'Model', value: scan.amazonEvaluation.modelId },
            {
              label: 'Model source',
              value: latestAmazonEvaluationStep !== null
                ? resolveStepDetailValue(latestAmazonEvaluationStep, 'Model source')
                : null,
            },
            {
              label: 'Threshold',
              value:
                (latestAmazonEvaluationStep !== null
                  ? resolveStepDetailValue(latestAmazonEvaluationStep, 'Threshold')
                  : null) ?? formatAmazonEvaluationConfidence(scan.amazonEvaluation.threshold),
            },
            {
              label: 'Evaluation scope',
              value: latestAmazonEvaluationStep !== null
                ? resolveStepDetailValue(latestAmazonEvaluationStep, 'Evaluation scope')
                : null,
            },
            {
              label: 'Similarity decision',
              value: latestAmazonEvaluationStep !== null
                ? resolveStepDetailValue(latestAmazonEvaluationStep, 'Similarity decision')
                : null,
            },
            {
              label: 'Allowed content language',
              value: latestAmazonEvaluationStep !== null
                ? resolveStepDetailValue(latestAmazonEvaluationStep, 'Allowed content language')
                : null,
            },
            {
              label: 'Language policy',
              value: latestAmazonEvaluationStep !== null
                ? resolveStepDetailValue(latestAmazonEvaluationStep, 'Language policy')
                : null,
            },
            {
              label: 'Language detection',
              value: latestAmazonEvaluationStep !== null
                ? resolveStepDetailValue(latestAmazonEvaluationStep, 'Language detection')
                : null,
            },
            {
              label: 'Same product',
              value:
                typeof scan.amazonEvaluation.sameProduct === 'boolean'
                  ? String(scan.amazonEvaluation.sameProduct)
                  : null,
            },
            {
              label: 'Image match',
              value:
                typeof scan.amazonEvaluation.imageMatch === 'boolean'
                  ? String(scan.amazonEvaluation.imageMatch)
                  : null,
            },
            {
              label: 'Description match',
              value:
                typeof scan.amazonEvaluation.descriptionMatch === 'boolean'
                  ? String(scan.amazonEvaluation.descriptionMatch)
                  : null,
            },
            {
              label: 'Page language',
              value: formatAmazonPageLanguage(scan.amazonEvaluation.pageLanguage),
            },
            {
              label: 'Language accepted',
              value:
                typeof scan.amazonEvaluation.languageAccepted === 'boolean'
                  ? String(scan.amazonEvaluation.languageAccepted)
                  : null,
            },
            {
              label: 'Language confidence',
              value: formatAmazonEvaluationConfidence(scan.amazonEvaluation.languageConfidence),
            },
            {
              label: 'Language reason',
              value: scan.amazonEvaluation.languageReason,
            },
            {
              label: 'Scrape allowed',
              value:
                typeof scan.amazonEvaluation.scrapeAllowed === 'boolean'
                  ? String(scan.amazonEvaluation.scrapeAllowed)
                  : null,
            },
            {
              label: 'Candidate URL',
              value: scan.amazonEvaluation.evidence?.candidateUrl,
            },
            {
              label: 'Hero image source',
              value: scan.amazonEvaluation.evidence?.heroImageSource,
            },
            {
              label: 'Hero image artifact',
              value: scan.amazonEvaluation.evidence?.heroImageArtifactName,
            },
            {
              label: 'Screenshot artifact',
              value: scan.amazonEvaluation.evidence?.screenshotArtifactName,
            },
            {
              label: 'Evaluator error',
              value: scan.amazonEvaluation.error,
            },
          ]}
        />
      ) : null}

      {scan.amazonEvaluation !== null && scan.amazonEvaluation !== undefined && scan.amazonEvaluation.reasons.length > 0 ? (
        <TextBlock title='AI Evaluation Reasons' value={scan.amazonEvaluation.reasons.join('\n')} />
      ) : null}

      {scan.amazonEvaluation !== null && scan.amazonEvaluation !== undefined && scan.amazonEvaluation.mismatches.length > 0 ? (
        <TextBlock
          title='AI Evaluation Mismatches'
          value={scan.amazonEvaluation.mismatches.join('\n')}
        />
      ) : null}

      {rejectedCandidateHistory.length > 0 ? (
        <div className='space-y-2'>
          <h5 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            Rejected Amazon Candidates
          </h5>
          <div className='space-y-2'>
            {rejectedCandidateHistory.map((entry) => {
              const entryConfidenceLabel = entry.confidenceLabel;
              const entryCandidateId = entry.candidateId;
              const entryUrl = entry.url;
              const entryReason = entry.reason;
              const entryMismatch = entry.mismatch;
              const entryMessage = entry.message;
              const entryModelId = entry.modelId;
              return (
                <div
                  key={`amazon-ai-rejected-${entry.attempt}-${entry.candidateRank ?? 'na'}`}
                  className='rounded-md border border-rose-500/20 bg-background/70 px-3 py-2'
                >
                  <div className='flex flex-wrap gap-2'>
                    {typeof entry.candidateRank === 'number' ? (
                      <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium'>
                        Candidate #{entry.candidateRank}
                      </span>
                    ) : null}
                    <span className='inline-flex items-center rounded-md border border-rose-500/40 px-2 py-0.5 text-[11px] font-medium text-rose-300'>
                      Rejected
                    </span>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                        entry.rejectionKind === 'language'
                          ? 'border-rose-500/40 text-rose-300'
                          : 'border-border/60'
                      }`}
                    >
                      {entry.rejectionKind === 'language' ? 'Language gate' : 'Product mismatch'}
                    </span>
                    <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium'>
                      Evaluation #{entry.attempt}
                    </span>
                    {typeof entryConfidenceLabel === 'string' ? (
                      <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium'>
                        Confidence {entryConfidenceLabel}
                      </span>
                    ) : null}
                    {typeof entryCandidateId === 'string' ? (
                      <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium'>
                        Image {entryCandidateId}
                      </span>
                    ) : null}
                  </div>
                  <div className='mt-2 space-y-2 text-sm'>
                    {typeof entryUrl === 'string' ? (
                      <div className='flex items-start justify-between gap-2'>
                        <p className='break-all'>{entryUrl}</p>
                        <CopyButton
                          value={entryUrl}
                          ariaLabel={`Copy rejected Amazon candidate URL ${entry.attempt}`}
                          size='sm'
                          className='h-6 px-2 text-[11px]'
                          showText
                        />
                      </div>
                    ) : null}
                    {typeof entryReason === 'string' ? <p>{entryReason}</p> : null}
                    {typeof entryMismatch === 'string' ? (
                      <p className='text-muted-foreground'>{entryMismatch}</p>
                    ) : null}
                    {entryReason === null && entryMismatch === null && typeof entryMessage === 'string' ? (
                      <p>{entryMessage}</p>
                    ) : null}
                    {typeof entryModelId === 'string' ? (
                      <p className='text-xs text-muted-foreground'>Model: {entryModelId}</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {scan.amazonProbe !== null && scan.amazonProbe !== undefined ? (
        <FieldGroup
          title='Amazon Probe'
          fields={[
            { label: 'Probe ASIN', value: scan.amazonProbe.asin },
            { label: 'Probe title', value: scan.amazonProbe.pageTitle },
            { label: 'Description snippet', value: scan.amazonProbe.descriptionSnippet },
            {
              label: 'Page language',
              value: formatAmazonPageLanguage(scan.amazonProbe.pageLanguage),
            },
            { label: 'Language source', value: scan.amazonProbe.pageLanguageSource },
            { label: 'Marketplace domain', value: scan.amazonProbe.marketplaceDomain },
            { label: 'Candidate URL', value: scan.amazonProbe.candidateUrl },
            { label: 'Canonical URL', value: scan.amazonProbe.canonicalUrl },
            { label: 'Hero image URL', value: scan.amazonProbe.heroImageUrl },
            { label: 'Hero image alt', value: scan.amazonProbe.heroImageAlt },
            { label: 'Hero image artifact', value: scan.amazonProbe.heroImageArtifactName },
            { label: 'Artifact key', value: scan.amazonProbe.artifactKey },
            {
              label: 'Bullet count',
              value:
                typeof scan.amazonProbe.bulletCount === 'number'
                  ? String(scan.amazonProbe.bulletCount)
                  : null,
            },
            {
              label: 'Attribute count',
              value:
                typeof scan.amazonProbe.attributeCount === 'number'
                  ? String(scan.amazonProbe.attributeCount)
                  : null,
            },
          ]}
        />
      ) : null}

      {scan.amazonProbe !== null && scan.amazonProbe !== undefined && scan.amazonProbe.bulletPoints.length > 0 ? (
        <TextBlock title='Probe Bullet Points' value={scan.amazonProbe.bulletPoints.join('\n')} />
      ) : null}

      <FieldGroup
        title='Scan Provenance'
        fields={[
          { label: 'Winning image candidate', value: provenance?.candidateId },
          { label: 'Google input', value: provenance?.inputSourceLabel },
          {
            label: 'Amazon candidate rank',
            value:
              typeof provenance?.candidateRank === 'number' ? `#${provenance.candidateRank}` : null,
          },
          {
            label: 'Probe handling',
            value: provenance?.reusedProbe === true ? 'Reused earlier approved probe' : null,
          },
          {
            label: 'Rejected candidates',
            value:
              rejectedCandidateBreakdown.totalCount > 0
                ? rejectedCandidateBreakdown.languageRejectedCount > 0
                  ? `${rejectedCandidateBreakdown.totalCount} total, ${rejectedCandidateBreakdown.languageRejectedCount} non-English`
                  : String(rejectedCandidateBreakdown.totalCount)
                : null,
          },
          { label: 'Retry path', value: provenance?.retryOf },
          { label: 'Extraction result', value: provenance?.extractionResultLabel },
        ]}
      />

      <FieldGroup
        title='Listing Text'
        fields={[{ label: 'Title', value: scan.title }]}
      />

      <TextBlock title='Description' value={scan.description} />

      <FieldGroup
        title='Identifiers'
        fields={[
          { label: 'ASIN', value: scan.asin },
          { label: 'EAN', value: details?.ean },
          { label: 'GTIN', value: details?.gtin },
          { label: 'UPC', value: details?.upc },
          { label: 'ISBN', value: details?.isbn },
          { label: 'Model number', value: details?.modelNumber },
          { label: 'Part number', value: details?.partNumber },
        ]}
      />

      <FieldGroup
        title='Product Details'
        fields={[
          { label: 'Brand', value: details?.brand },
          { label: 'Manufacturer', value: details?.manufacturer },
          { label: 'Color', value: details?.color },
          { label: 'Style', value: details?.style },
          { label: 'Material', value: details?.material },
          { label: 'Size', value: details?.size },
          { label: 'Pattern', value: details?.pattern },
          { label: 'Finish', value: details?.finish },
        ]}
      />

      <FieldGroup
        title='Physical Details'
        fields={[
          { label: 'Item dimensions', value: details?.itemDimensions },
          { label: 'Package dimensions', value: details?.packageDimensions },
          { label: 'Item weight', value: details?.itemWeight },
          { label: 'Package weight', value: details?.packageWeight },
        ]}
      />

      <FieldGroup
        title='Listing Details'
        fields={[{ label: 'Best Sellers Rank', value: details?.bestSellersRank }]}
      />

      {details !== null && details !== undefined && details.rankings.length > 0 ? (
        <div className='space-y-2'>
          <h5 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            Ranking Entries
          </h5>
          <div className='space-y-2'>
            {details.rankings.map((entry, index) => (
              <div
                key={`ranking-${index}-${entry.rank}`}
                className='rounded-md border border-border/50 bg-background/70 px-3 py-2'
              >
                <p className='text-sm font-medium'>{entry.rank}</p>
                {typeof entry.category === 'string' ? (
                  <p className='text-sm text-muted-foreground'>{entry.category}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {details !== null && details !== undefined && details.bulletPoints.length > 0 ? (
        <div className='space-y-2'>
          <h5 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            Bullet Points
          </h5>
          <ul className='space-y-1 pl-4 text-sm text-muted-foreground'>
            {details.bulletPoints.map((entry, index) => (
              <li key={`bullet-${index}`}>{entry}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {groupedAttributes.length > 0 ? (
        <div className='space-y-2'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <h5 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
              All Extracted Amazon Attributes
            </h5>
            <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] font-medium'>
              Showing {filteredAttributeCount} of {totalAttributeCount}
            </span>
          </div>
          <div className='relative'>
            <Search className='pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
            <Input
              value={attributeQuery}
              onChange={(event) => setAttributeQuery(event.currentTarget.value)}
              placeholder='Filter extracted attributes'
              aria-label='Filter extracted Amazon attributes'
              size='sm'
              className='pl-7'
            />
          </div>
          <div className='space-y-3'>
            {filteredGroupedAttributes.map((group, groupIndex) => (
              <div key={`attribute-group-${group.source}-${groupIndex}`} className='space-y-2'>
                <h6 className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                  {group.source}
                </h6>
                <dl className='grid gap-2 sm:grid-cols-2'>
                  {group.entries.map((entry, index) => (
                    <div
                      key={`attribute-${group.source}-${index}-${entry.key}`}
                      className='rounded-md border border-border/50 bg-background/70 px-3 py-2'
                    >
                      <div className='flex items-start justify-between gap-2'>
                        <dt className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                          {entry.label}
                        </dt>
                        <CopyButton
                          value={entry.value}
                          ariaLabel={`Copy ${entry.label}`}
                          size='sm'
                          className='h-6 px-2 text-[11px]'
                          showText
                        />
                      </div>
                      <dd className='mt-1 text-sm'>{entry.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
            {filteredAttributeCount === 0 ? (
              <div className='rounded-md border border-dashed border-border/60 bg-background/60 px-3 py-3 text-xs text-muted-foreground'>
                No extracted attributes match the current filter.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
