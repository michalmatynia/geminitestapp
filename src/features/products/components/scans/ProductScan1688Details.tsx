

import { ExternalLink } from 'lucide-react';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import { CopyButton } from '@/shared/ui/copy-button';

type ProductScan1688DetailsProps = {
  scan: Pick<
    ProductScanRecord,
    | 'id'
    | 'title'
    | 'url'
    | 'supplierDetails'
    | 'supplierProbe'
    | 'supplierEvaluation'
    | 'rawResult'
  >;
  scanId?: string | null;
  connectionLabel?: string | null;
};

export type ProductScan1688QualitySummaryValue = {
  primaryLabel:
    | 'AI-approved supplier match'
    | 'Deterministic supplier match'
    | 'Heuristic supplier match'
    | 'Supplier probe';
  hasPricing: boolean;
  hasImages: boolean;
  hasStoreLink: boolean;
};

export type ProductScan1688ApplyPolicySummaryValue = {
  tone: 'warning' | 'destructive';
  label: 'Apply blocked by AI rejection' | 'Manual review after AI failure' | 'Manual review recommended';
  detail: string;
  blockActions: boolean;
};

export type ProductScan1688RecommendationSignalValue = {
  variant: 'preferred' | 'weaker' | 'default';
  badgeLabel:
    | 'Preferred 1688 supplier result'
    | 'Weaker 1688 supplier result'
    | '1688 supplier result';
  detail:
    | 'Preferred over other 1688 supplier results for this product.'
    | 'A stronger 1688 supplier result is available for this product.'
    | null;
};

export type ProductScan1688RankingSummaryValue = {
  rank: number | null;
  count: number;
  isPreferred: boolean;
  hasStrongerAlternative: boolean;
  preferredScanId: string | null;
  alternativeScanIds: string[];
};

export type ProductScan1688ComparisonTargetValue = {
  id: string;
  label: string;
  rank: number | null;
  labelWithRank: string;
};

type ProductScan1688PreferenceRank = 0 | 1 | 2 | 3 | null;

type ProductScan1688SectionKey = 'candidate-urls' | 'match-evaluation';

const formatConfidence = (value: number | null | undefined): string | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return `${Math.round(value * 100)}%`;
};

const buildInlineSummary = (
  ...values: Array<string | null | undefined>
): string | null => {
  const entries = values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0);

  return entries.length > 0 ? entries.join(' · ') : null;
};

const resolveSupplierEvaluationDetail = (
  scan:
    | Pick<ProductScanRecord, 'supplierEvaluation'>
    | null
    | undefined
): string | null => {
  const evaluation = scan?.supplierEvaluation;
  if (!evaluation) {
    return null;
  }

  const mismatch = evaluation.mismatches[0] ?? null;
  const reason = evaluation.reasons[0] ?? null;
  const confidence =
    typeof evaluation.confidence === 'number' && Number.isFinite(evaluation.confidence)
      ? `Confidence ${Math.round(evaluation.confidence * 100)}%`
      : null;

  return mismatch ?? reason ?? evaluation.error ?? confidence ?? 'Review the extracted supplier details before applying them to the product form.';
};

const formatTimestamp = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

const normalizeDomIdFragment = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-');
  return normalized.length > 0 ? normalized : null;
};

const toRecord = (value: unknown): Record<string, unknown> | null =>
  value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const resolveSupplierCandidateUrls = (
  scan:
    | Pick<ProductScanRecord, 'url' | 'supplierProbe' | 'rawResult'>
    | null
    | undefined
): string[] => {
  if (!scan) {
    return [];
  }

  const urls = new Set<string>();
  const addUrl = (value: unknown): void => {
    if (typeof value !== 'string') {
      return;
    }
    const normalized = value.trim();
    if (normalized.length === 0) {
      return;
    }
    urls.add(normalized);
  };

  addUrl(scan.supplierProbe?.candidateUrl);
  addUrl(scan.supplierProbe?.canonicalUrl);
  addUrl(scan.url);

  const rawResult = toRecord(scan.rawResult);
  const candidateUrls = rawResult?.['candidateUrls'];
  if (Array.isArray(candidateUrls)) {
    candidateUrls.forEach(addUrl);
  }

  return Array.from(urls).slice(0, 8);
};

export const resolveProductScan1688QualitySummary = (
  scan:
    | Pick<
        ProductScanRecord,
        'supplierDetails' | 'supplierProbe' | 'supplierEvaluation'
      >
    | null
    | undefined
): ProductScan1688QualitySummaryValue | null => {
  if (!scan) {
    return null;
  }

  const details = scan.supplierDetails;
  const evaluation = scan.supplierEvaluation;
  const hasPricing = Boolean(
    details?.priceText ||
      details?.priceRangeText ||
      (Array.isArray(details?.prices) && details.prices.length > 0)
  );
  const hasImages = Boolean(Array.isArray(details?.images) && details.images.length > 0);
  const hasStoreLink = Boolean(details?.supplierStoreUrl);

  if (evaluation?.status === 'approved') {
    return {
      primaryLabel: 'AI-approved supplier match',
      hasPricing,
      hasImages,
      hasStoreLink,
    };
  }

  if (evaluation?.status === 'skipped' && evaluation.proceed) {
    return {
      primaryLabel: 'Deterministic supplier match',
      hasPricing,
      hasImages,
      hasStoreLink,
    };
  }

  if (details?.supplierProductUrl || details?.supplierName || hasPricing || hasImages) {
    return {
      primaryLabel: 'Heuristic supplier match',
      hasPricing,
      hasImages,
      hasStoreLink,
    };
  }

  if (scan.supplierProbe?.candidateUrl || scan.supplierProbe?.canonicalUrl || scan.supplierProbe?.pageTitle) {
    return {
      primaryLabel: 'Supplier probe',
      hasPricing,
      hasImages,
      hasStoreLink,
    };
  }

  return null;
};

export const resolve1688ScanRecommendationReason = (
  scan:
    | Pick<
        ProductScanRecord,
        'supplierDetails' | 'supplierProbe' | 'supplierEvaluation'
      >
    | null
    | undefined
): string | null => {
  const quality = resolveProductScan1688QualitySummary(scan);
  if (!quality) {
    return null;
  }

  if (quality.primaryLabel === 'AI-approved supplier match') {
    return 'AI-approved supplier match';
  }

  if (quality.primaryLabel === 'Deterministic supplier match') {
    return 'Deterministic supplier match';
  }

  if (quality.primaryLabel === 'Heuristic supplier match') {
    if (quality.hasPricing && quality.hasImages) {
      return 'Supplier match with pricing and images';
    }
    if (quality.hasPricing) {
      return 'Supplier match with pricing';
    }
    if (quality.hasImages) {
      return 'Supplier match with images';
    }
    return 'Heuristic supplier match';
  }

  return 'Supplier probe only';
};

export const resolveProductScan1688ApplyPolicySummary = (
  scan:
    | Pick<ProductScanRecord, 'supplierEvaluation'>
    | null
    | undefined
): ProductScan1688ApplyPolicySummaryValue | null => {
  const evaluation = scan?.supplierEvaluation;
  if (!evaluation) {
    return null;
  }

  const detail = resolveSupplierEvaluationDetail(scan);

  if (evaluation.status === 'rejected' && evaluation.proceed !== true) {
    return {
      tone: 'destructive',
      label: 'Apply blocked by AI rejection',
      detail: detail ?? 'The supplier candidate was rejected by the 1688 evaluator.',
      blockActions: true,
    };
  }

  if (evaluation.status === 'failed') {
    return {
      tone: 'warning',
      label: 'Manual review after AI failure',
      detail: detail ?? 'The 1688 evaluator failed. Review the extracted supplier details manually.',
      blockActions: false,
    };
  }

  if (evaluation.status === 'skipped' && evaluation.proceed !== true) {
    return {
      tone: 'warning',
      label: 'Manual review recommended',
      detail:
        detail ?? 'The supplier candidate was not auto-approved. Review the extracted details before applying them.',
      blockActions: false,
    };
  }

  return null;
};

export const resolveProductScan1688RecommendationSignal = ({
  isPreferred = false,
  hasAlternativeMeaningfulResult = false,
  hasStrongerAlternative = false,
}: {
  isPreferred?: boolean;
  hasAlternativeMeaningfulResult?: boolean;
  hasStrongerAlternative?: boolean;
} = {}): ProductScan1688RecommendationSignalValue => {
  if (isPreferred) {
    return {
      variant: 'preferred',
      badgeLabel: 'Preferred 1688 supplier result',
      detail: hasAlternativeMeaningfulResult
        ? 'Preferred over other 1688 supplier results for this product.'
        : null,
    };
  }

  if (hasStrongerAlternative) {
    return {
      variant: 'weaker',
      badgeLabel: 'Weaker 1688 supplier result',
      detail: 'A stronger 1688 supplier result is available for this product.',
    };
  }

  return {
    variant: 'default',
    badgeLabel: '1688 supplier result',
    detail: null,
  };
};

const resolveProductScan1688TimestampMs = (
  scan:
    | Pick<ProductScanRecord, 'completedAt' | 'updatedAt' | 'createdAt'>
    | null
    | undefined
): number => {
  const candidates = [scan?.completedAt, scan?.updatedAt, scan?.createdAt];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || candidate.trim().length === 0) {
      continue;
    }

    const parsed = Date.parse(candidate);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
};

const resolveProductScan1688PreferenceRank = (
  scan:
    | Pick<ProductScanRecord, 'supplierDetails' | 'supplierProbe' | 'supplierEvaluation'>
    | null
    | undefined
): ProductScan1688PreferenceRank => {
  const quality = resolveProductScan1688QualitySummary(scan);
  if (!quality) {
    return null;
  }

  if (quality.primaryLabel === 'AI-approved supplier match') {
    return 0;
  }
  if (quality.primaryLabel === 'Deterministic supplier match') {
    return 1;
  }
  if (quality.primaryLabel === 'Heuristic supplier match') {
    return 2;
  }
  return 3;
};

export const resolvePreferred1688SupplierScans = (
  scans: ReadonlyArray<
    Pick<
      ProductScanRecord,
      | 'id'
      | 'provider'
      | 'createdAt'
      | 'updatedAt'
      | 'completedAt'
      | 'supplierDetails'
      | 'supplierProbe'
      | 'supplierEvaluation'
      | 'title'
    >
  >
): Array<
  Pick<
    ProductScanRecord,
    | 'id'
    | 'provider'
    | 'createdAt'
    | 'updatedAt'
    | 'completedAt'
    | 'supplierDetails'
    | 'supplierProbe'
    | 'supplierEvaluation'
    | 'title'
  >
> => {
  return scans
    .filter((scan) => scan.provider === '1688')
    .map((scan) => ({
      scan,
      rank: resolveProductScan1688PreferenceRank(scan),
      timestampMs: resolveProductScan1688TimestampMs(scan),
    }))
    .filter(
      (
        entry
      ): entry is {
        scan: Pick<
          ProductScanRecord,
          | 'id'
          | 'provider'
          | 'createdAt'
          | 'updatedAt'
          | 'completedAt'
          | 'supplierDetails'
          | 'supplierProbe'
          | 'supplierEvaluation'
          | 'title'
        >;
        rank: Exclude<ProductScan1688PreferenceRank, null>;
        timestampMs: number;
      } => entry.rank != null && entry.rank < 3
    )
    .sort((left, right) => {
      if (left.rank !== right.rank) {
        return (left.rank as number) - (right.rank as number);
      }
      if (left.timestampMs !== right.timestampMs) {
        return right.timestampMs - left.timestampMs;
      }
      return left.scan.id.localeCompare(right.scan.id, undefined, { sensitivity: 'base' });
    })
    .map((entry) => entry.scan);
};

export const hasNewerApproved1688Scan = (
  scans: ReadonlyArray<
    Pick<
      ProductScanRecord,
      | 'id'
      | 'provider'
      | 'createdAt'
      | 'updatedAt'
      | 'completedAt'
      | 'supplierDetails'
      | 'supplierProbe'
      | 'supplierEvaluation'
      | 'title'
    >
  >,
  scanId: string | null | undefined
): boolean => {
  if (typeof scanId !== 'string' || scanId.trim().length === 0) {
    return false;
  }

  const normalizedScanId = scanId.trim();
  const targetScan = scans.find((scan) => scan.id === normalizedScanId && scan.provider === '1688');
  if (!targetScan) {
    return false;
  }

  const targetTimestampMs = resolveProductScan1688TimestampMs(targetScan);
  return resolvePreferred1688SupplierScans(scans).some(
    (scan) =>
      scan.id !== normalizedScanId &&
      scan.supplierEvaluation?.status === 'approved' &&
      resolveProductScan1688TimestampMs(scan) > targetTimestampMs
  );
};

export const resolveProductScan1688RankingSummary = (
  preferredScans: ReadonlyArray<Pick<ProductScanRecord, 'id'>>,
  scanId: string | null | undefined
): ProductScan1688RankingSummaryValue => {
  const normalizedScanId = typeof scanId === 'string' ? scanId.trim() : '';
  const preferredScanId = preferredScans[0]?.id ?? null;
  const rankIndex =
    normalizedScanId.length > 0
      ? preferredScans.findIndex((preferredScan) => preferredScan.id === normalizedScanId)
      : -1;
  const rank = rankIndex >= 0 ? rankIndex + 1 : null;

  return {
    rank,
    count: preferredScans.length,
    isPreferred: rank === 1 && preferredScanId === normalizedScanId,
    hasStrongerAlternative:
      rank != null && preferredScanId != null && preferredScanId !== normalizedScanId,
    preferredScanId,
    alternativeScanIds:
      rank != null
        ? preferredScans
            .filter((preferredScan) => preferredScan.id !== normalizedScanId)
            .map((preferredScan) => preferredScan.id)
        : [],
  };
};

export const resolveProductScan1688ResultLabel = (
  scan:
    | Pick<ProductScanRecord, 'id' | 'title' | 'supplierDetails' | 'supplierProbe'>
    | null
    | undefined
): string => {
  return (
    scan?.title?.trim() ||
    scan?.supplierDetails?.supplierName?.trim() ||
    scan?.supplierProbe?.pageTitle?.trim() ||
    scan?.id ||
    'Scan result'
  );
};

export const formatProductScan1688RankLabel = (
  rank: number | null | undefined,
  count: number | null | undefined
): string | null => {
  if (typeof rank !== 'number' || !Number.isFinite(rank)) {
    return null;
  }
  if (typeof count !== 'number' || !Number.isFinite(count) || count <= 1) {
    return null;
  }
  return `Rank ${rank} of ${count}`;
};

export const formatProductScan1688ComparisonCountLabel = (
  count: number | null | undefined
): string | null => {
  if (typeof count !== 'number' || !Number.isFinite(count) || count <= 0) {
    return null;
  }

  return count === 1
    ? 'Compare with 1 alternative result'
    : `Compare with ${count} alternative results`;
};

const buildProductScan1688ComparisonTarget = (
  scan: Pick<ProductScanRecord, 'id' | 'title' | 'supplierDetails' | 'supplierProbe'>,
  rank: number | null,
  count: number
): ProductScan1688ComparisonTargetValue => {
  const label = resolveProductScan1688ResultLabel(scan);
  const rankLabel = formatProductScan1688RankLabel(rank, count);

  return {
    id: scan.id,
    label,
    rank,
    labelWithRank: rankLabel ? `${label} (${rankLabel})` : label,
  };
};

export const resolveProductScan1688ComparisonTargets = (
  preferredScans: ReadonlyArray<
    Pick<ProductScanRecord, 'id' | 'title' | 'supplierDetails' | 'supplierProbe'>
  >,
  currentScanId: string | null | undefined
): {
  preferredTarget: ProductScan1688ComparisonTargetValue | null;
  alternativeTargets: ProductScan1688ComparisonTargetValue[];
} => {
  const count = preferredScans.length;
  const preferredTarget =
    preferredScans[0] != null ? buildProductScan1688ComparisonTarget(preferredScans[0], 1, count) : null;
  const normalizedCurrentScanId = typeof currentScanId === 'string' ? currentScanId.trim() : '';

  const alternativeTargets = preferredScans
    .filter((scan) => scan.id !== normalizedCurrentScanId)
    .map((scan, index) => {
      const rank = preferredScans.findIndex((preferredScan) => preferredScan.id === scan.id) + 1;
      return buildProductScan1688ComparisonTarget(scan, rank > 0 ? rank : index + 1, count);
    });

  return {
    preferredTarget,
    alternativeTargets,
  };
};

export const buildProductScan1688SectionId = (
  scanId: string | null | undefined,
  section: ProductScan1688SectionKey
): string | null => {
  const normalizedScanId = normalizeDomIdFragment(scanId);
  return normalizedScanId ? `product-scan-1688-${normalizedScanId}-${section}` : null;
};

export function ProductScan1688QualitySummary(props: {
  scan: Pick<ProductScanRecord, 'supplierDetails' | 'supplierProbe' | 'supplierEvaluation'>;
}): React.JSX.Element | null {
  const quality = resolveProductScan1688QualitySummary(props.scan);

  if (!quality) {
    return null;
  }

  const primaryClassName =
    quality.primaryLabel === 'AI-approved supplier match'
      ? 'border-emerald-500/40 text-emerald-300'
      : quality.primaryLabel === 'Deterministic supplier match'
        ? 'border-cyan-500/40 text-cyan-300'
        : quality.primaryLabel === 'Heuristic supplier match'
          ? 'border-amber-500/40 text-amber-300'
          : 'border-border/60 text-muted-foreground';

  return (
    <div className='space-y-2 rounded-md border border-border/50 bg-background/70 px-3 py-2'>
      <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
        Supplier result
      </p>
      <div className='flex flex-wrap gap-2'>
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${primaryClassName}`}
        >
          {quality.primaryLabel}
        </span>
        {quality.hasPricing ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium'>
            Pricing extracted
          </span>
        ) : null}
        {quality.hasImages ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium'>
            Images extracted
          </span>
        ) : null}
        {quality.hasStoreLink ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium'>
            Store link found
          </span>
        ) : null}
      </div>
    </div>
  );
}

export const hasProductScan1688Details = (
  scan:
    | Pick<
        ProductScanRecord,
        'title' | 'url' | 'supplierDetails' | 'supplierProbe' | 'supplierEvaluation' | 'rawResult'
      >
    | null
    | undefined
): boolean => {
  if (!scan) {
    return false;
  }

  return Boolean(
    scan.title ||
      scan.url ||
      scan.supplierDetails?.supplierName ||
      scan.supplierDetails?.supplierStoreUrl ||
      scan.supplierDetails?.supplierProductUrl ||
      scan.supplierDetails?.priceText ||
      scan.supplierDetails?.priceRangeText ||
      scan.supplierDetails?.moqText ||
      scan.supplierDetails?.images?.length ||
      scan.supplierDetails?.prices?.length ||
      scan.supplierProbe?.candidateUrl ||
      scan.supplierProbe?.canonicalUrl ||
      scan.supplierProbe?.pageTitle ||
      resolveSupplierCandidateUrls(scan).length > 0 ||
      scan.supplierEvaluation
  );
};

const DetailRow = (props: {
  label: string;
  value?: string | null;
  href?: string | null;
}): React.JSX.Element | null => {
  const { label, value, href } = props;
  const normalizedValue = typeof value === 'string' ? value.trim() : '';
  const normalizedHref = typeof href === 'string' ? href.trim() : '';

  if (!normalizedValue && !normalizedHref) {
    return null;
  }

  const content = normalizedHref ? (
    <a
      href={normalizedHref}
      target='_blank'
      rel='noopener noreferrer'
      className='inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline'
    >
      {normalizedValue || normalizedHref}
      <ExternalLink className='h-3.5 w-3.5' />
    </a>
  ) : (
    <span>{normalizedValue}</span>
  );

  return (
    <div className='space-y-1'>
      <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>{label}</p>
      <div className='flex flex-wrap items-center gap-2 text-sm text-foreground'>
        {content}
        {(normalizedValue || normalizedHref) ? (
          <CopyButton value={normalizedHref || normalizedValue} className='h-6 px-2 text-[11px]' />
        ) : null}
      </div>
    </div>
  );
};

export function ProductScan1688Details(props: ProductScan1688DetailsProps): React.JSX.Element | null {
  const { scan } = props;

  if (!hasProductScan1688Details(scan)) {
    return null;
  }

  const resolvedScanId = props.scanId ?? scan.id ?? null;

  const details = scan.supplierDetails;
  const probe = scan.supplierProbe;
  const evaluation = scan.supplierEvaluation;
  const extractedImageCount = details?.images?.length ?? 0;
  const extractedPriceCount = details?.prices?.length ?? 0;
  const probeImageCount = probe?.imageCount ?? null;
  const candidateUrls = resolveSupplierCandidateUrls(scan);
  const priceSummary =
    buildInlineSummary(details?.priceText, details?.priceRangeText) ||
    buildInlineSummary(
      details?.prices?.[0]?.amount,
      details?.prices?.[0]?.currency,
      details?.prices?.[0]?.moq ? `MOQ ${details.prices[0].moq}` : null
    );
  const evaluationConfidence = formatConfidence(evaluation?.confidence);
  const evaluationSummary = buildInlineSummary(
    evaluation?.modelId ? `Evaluator ${evaluation.modelId}` : null,
    evaluationConfidence ? `Confidence ${evaluationConfidence}` : null,
    evaluation?.sameProduct === true
      ? 'Same product'
      : evaluation?.sameProduct === false
        ? 'Different product'
        : null,
    evaluation?.imageMatch === true
      ? 'Image match'
      : evaluation?.imageMatch === false
        ? 'Image mismatch'
        : null,
    evaluation?.titleMatch === true
      ? 'Title match'
      : evaluation?.titleMatch === false
        ? 'Title mismatch'
        : null
  );
  const evaluationTimestamp = formatTimestamp(evaluation?.evaluatedAt);
  const connectionLabel =
    typeof props.connectionLabel === 'string' && props.connectionLabel.trim().length > 0
      ? props.connectionLabel.trim()
      : null;

  return (
    <div className='space-y-3 rounded-md border border-border/50 bg-background/70 px-3 py-3'>
      <ProductScan1688QualitySummary scan={scan} />

      <div className='flex flex-wrap items-center gap-2 text-xs'>
        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
          1688 supplier details
        </span>
        {details?.supplierName ? (
          <span className='font-medium text-foreground'>{details.supplierName}</span>
        ) : null}
        {connectionLabel ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
            Profile {connectionLabel}
          </span>
        ) : null}
        {priceSummary ? <span className='text-muted-foreground'>{priceSummary}</span> : null}
        {details?.moqText ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
            {details.moqText}
          </span>
        ) : null}
        {details?.sourceLanguage ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
            {details.sourceLanguage}
          </span>
        ) : null}
        {extractedImageCount > 0 ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
            {extractedImageCount} extracted image{extractedImageCount === 1 ? '' : 's'}
          </span>
        ) : null}
        {extractedPriceCount > 0 ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
            {extractedPriceCount} price tier{extractedPriceCount === 1 ? '' : 's'}
          </span>
        ) : null}
        {probeImageCount && probeImageCount > 0 ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
            Probe saw {probeImageCount} image{probeImageCount === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      <div className='grid gap-3 md:grid-cols-2'>
        <div className='space-y-3'>
          <DetailRow
            label='Supplier product'
            value={details?.supplierProductUrl ?? scan.url}
            href={details?.supplierProductUrl ?? scan.url}
          />
          <DetailRow
            label='Supplier store'
            value={details?.supplierStoreUrl ?? probe?.supplierStoreUrl}
            href={details?.supplierStoreUrl ?? probe?.supplierStoreUrl}
          />
          <DetailRow label='Supplier location' value={details?.supplierLocation} />
          <DetailRow label='Supplier rating' value={details?.supplierRating} />
          <DetailRow label='Platform product id' value={details?.platformProductId} />
        </div>

        <div className='space-y-3'>
          <DetailRow label='Browser profile' value={connectionLabel} />
          <DetailRow label='Current page title' value={probe?.pageTitle ?? scan.title} />
          <DetailRow label='Candidate URL' value={probe?.candidateUrl} href={probe?.candidateUrl} />
          <DetailRow label='Canonical URL' value={probe?.canonicalUrl} href={probe?.canonicalUrl} />
          <DetailRow label='Probe language' value={probe?.pageLanguage} />
          <DetailRow label='Probe artifact key' value={probe?.artifactKey} />
          <DetailRow
            label='Probe image count'
            value={
              typeof probeImageCount === 'number' && Number.isFinite(probeImageCount)
                ? String(probeImageCount)
                : null
            }
          />
          <DetailRow
            label='Extracted image count'
            value={extractedImageCount > 0 ? String(extractedImageCount) : null}
          />
          <DetailRow
            label='Extracted price tiers'
            value={extractedPriceCount > 0 ? String(extractedPriceCount) : null}
          />
        </div>
      </div>

      {candidateUrls.length > 0 ? (
        <div
          id={buildProductScan1688SectionId(resolvedScanId, 'candidate-urls') ?? undefined}
          className='space-y-2'
        >
          <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
            Candidate supplier URLs
          </p>
          <ul className='space-y-2 text-sm text-foreground'>
            {candidateUrls.map((candidateUrl, index) => (
              <li
                key={`${candidateUrl}-${index}`}
                className='rounded-md border border-border/40 bg-muted/10 px-3 py-2'
              >
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <span className='font-medium'>Candidate {index + 1}</span>
                  <a
                    href={candidateUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline'
                  >
                    Open
                    <ExternalLink className='h-3.5 w-3.5' />
                  </a>
                </div>
                <div className='mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
                  <span className='break-all'>{candidateUrl}</span>
                  <CopyButton value={candidateUrl} className='h-6 px-2 text-[11px]' />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {details?.prices?.length ? (
        <div className='space-y-2'>
          <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
            Extracted prices
          </p>
          <ul className='space-y-2 text-sm text-foreground'>
            {details.prices.map((price, index) => (
              <li
                key={`${price.label ?? 'price'}-${price.amount ?? 'na'}-${index}`}
                className='rounded-md border border-border/40 bg-muted/10 px-3 py-2'
              >
                {buildInlineSummary(
                  price.label,
                  price.amount && price.currency ? `${price.amount} ${price.currency}` : price.amount,
                  price.rangeStart && price.rangeEnd ? `${price.rangeStart} - ${price.rangeEnd}` : null,
                  price.moq ? `MOQ ${price.moq}` : null,
                  price.unit
                ) ?? 'Unlabeled supplier price'}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className='grid gap-3 md:grid-cols-2'>
        <div className='space-y-2'>
          <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
            Extracted images
          </p>
          {details?.images?.length ? (
            <ul className='space-y-2 text-sm text-foreground'>
              {details.images.slice(0, 6).map((image, index) => (
                <li
                  key={`${image.url ?? 'image'}-${index}`}
                  className='rounded-md border border-border/40 bg-muted/10 px-3 py-2'
                >
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <span className='font-medium'>
                      {image.source ? `${image.source} image` : `Image ${index + 1}`}
                    </span>
                    {image.url ? (
                      <a
                        href={image.url}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline'
                      >
                        Open
                        <ExternalLink className='h-3.5 w-3.5' />
                      </a>
                    ) : null}
                  </div>
                  {image.url ? <p className='mt-1 break-all text-xs text-muted-foreground'>{image.url}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className='text-sm text-muted-foreground'>No supplier images were extracted.</p>
          )}
        </div>

        <div
          id={buildProductScan1688SectionId(resolvedScanId, 'match-evaluation') ?? undefined}
          className='space-y-2'
        >
          <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
            Match evaluation
          </p>
          {evaluation ? (
            <div className='space-y-2 rounded-md border border-border/40 bg-muted/10 px-3 py-2 text-sm'>
              <p className='font-medium text-foreground'>
                {evaluation.status === 'approved'
                  ? 'Approved'
                  : evaluation.status === 'rejected'
                    ? 'Rejected'
                    : evaluation.status === 'failed'
                      ? 'Failed'
                      : 'Skipped'}
              </p>
              {evaluationSummary ? <p className='text-muted-foreground'>{evaluationSummary}</p> : null}
              <div className='grid gap-2 sm:grid-cols-2'>
                <DetailRow
                  label='Proceed'
                  value={typeof evaluation.proceed === 'boolean' ? String(evaluation.proceed) : null}
                />
                <DetailRow label='Evaluated at' value={evaluationTimestamp} />
              </div>
              {evaluation.reasons.length ? (
                <div className='space-y-1'>
                  <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                    Reasons
                  </p>
                  <ul className='list-disc space-y-1 pl-5 text-muted-foreground'>
                    {evaluation.reasons.map((reason, index) => (
                      <li key={`${reason}-${index}`}>{reason}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {evaluation.mismatches.length ? (
                <div className='space-y-1'>
                  <p className='text-[11px] font-medium uppercase tracking-wide text-destructive'>
                    Mismatches
                  </p>
                  <ul className='list-disc space-y-1 pl-5 text-destructive'>
                    {evaluation.mismatches.map((mismatch, index) => (
                      <li key={`${mismatch}-${index}`}>{mismatch}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {evaluation.error ? (
                <p className='text-destructive'>{evaluation.error}</p>
              ) : null}
            </div>
          ) : (
            <p className='text-sm text-muted-foreground'>No supplier evaluation was stored for this run.</p>
          )}
        </div>
      </div>
    </div>
  );
}
