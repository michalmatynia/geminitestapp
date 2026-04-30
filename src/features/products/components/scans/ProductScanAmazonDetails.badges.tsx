import {
  formatAmazonPageLanguage,
  formatEvaluationConfidence,
  hasText,
  isNullish,
  resolveAmazonEvaluationStatusLabel,
} from './ProductScanAmazonDetails.format';
import type {
  AmazonExtractionProvenance,
  AmazonRejectedCandidateBreakdown,
  AmazonRejectedCandidateHistoryEntry,
  AmazonScanQualitySummary,
  ProductScanAmazonDetailsScan,
} from './ProductScanAmazonDetails.types';
import type {
  ProductScanAmazonDetails as ProductScanAmazonDetailsValue,
} from '@/shared/contracts/product-scans';

type BadgeItem = {
  className: string;
  key: string;
  label: string;
};

const BASE_CLASS =
  'inline-flex items-center rounded-md border bg-background/70 px-2.5 py-1 text-xs font-medium';
const MUTED_CLASS = `${BASE_CLASS} border-border/60`;
const WARNING_CLASS = `${BASE_CLASS} border-amber-500/40 text-amber-300`;
const ROSE_CLASS = `${BASE_CLASS} border-rose-500/40 text-rose-300`;
const SUCCESS_CLASS = `${BASE_CLASS} border-emerald-500/40 text-emerald-300`;
const INFO_CLASS = `${BASE_CLASS} border-sky-500/40 text-sky-300`;

export function ProductScanAmazonDetailsBadgeList(props: {
  details: ProductScanAmazonDetailsValue | null | undefined;
  provenance: AmazonExtractionProvenance | null;
  quality: AmazonScanQualitySummary | null;
  rejectedCandidateBreakdown: AmazonRejectedCandidateBreakdown;
  rejectedCandidateHistory: AmazonRejectedCandidateHistoryEntry[];
  scan: Pick<ProductScanAmazonDetailsScan, 'amazonEvaluation' | 'asin' | 'title'>;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap gap-2'>
      {buildAmazonDetailsBadges(props).map((badge) => (
        <span key={badge.key} className={badge.className}>
          {badge.label}
        </span>
      ))}
    </div>
  );
}

const buildAmazonDetailsBadges = (props: {
  details: ProductScanAmazonDetailsValue | null | undefined;
  provenance: AmazonExtractionProvenance | null;
  quality: AmazonScanQualitySummary | null;
  rejectedCandidateBreakdown: AmazonRejectedCandidateBreakdown;
  rejectedCandidateHistory: AmazonRejectedCandidateHistoryEntry[];
  scan: Pick<ProductScanAmazonDetailsScan, 'amazonEvaluation' | 'asin' | 'title'>;
}): BadgeItem[] => [
  resolveQualityBadge(props.quality),
  hasText(props.scan.title) ? createBadge('title', 'Title available') : null,
  ...buildDetailsCountBadges(props.details),
  ...buildProvenanceBadges(props.provenance, props.quality),
  ...buildRejectedCandidateBadges(props.rejectedCandidateHistory, props.rejectedCandidateBreakdown),
  ...buildEvaluationBadges(props.scan.amazonEvaluation),
].filter((badge): badge is BadgeItem => badge !== null);

const resolveQualityBadge = (quality: AmazonScanQualitySummary | null): BadgeItem | null => {
  if (quality === null) return null;
  return {
    className: `${BASE_CLASS} ${resolveQualityClassName(quality.primaryLabel)}`,
    key: 'quality',
    label: quality.primaryLabel,
  };
};

const resolveQualityClassName = (
  primaryLabel: AmazonScanQualitySummary['primaryLabel']
): string => {
  if (primaryLabel === 'Strong match') return 'border-emerald-500/40 text-emerald-300';
  if (primaryLabel === 'Partial extraction') return 'border-amber-500/40 text-amber-300';
  return 'border-border/60';
};

const buildDetailsCountBadges = (
  details: ProductScanAmazonDetailsValue | null | undefined
): BadgeItem[] => {
  if (details === null || details === undefined) return [];
  return [
    createCountBadge({
      count: details.bulletPoints.length,
      key: 'bullets',
      plural: 'bullet points',
      singular: 'bullet point',
    }),
    createCountBadge({
      count: details.attributes.length,
      key: 'attributes',
      plural: 'extracted attributes',
      singular: 'extracted attribute',
    }),
    createCountBadge({
      count: details.rankings.length,
      key: 'rankings',
      plural: 'ranking entries',
      singular: 'ranking entry',
    }),
  ].filter((badge): badge is BadgeItem => badge !== null);
};

const buildProvenanceBadges = (
  provenance: AmazonExtractionProvenance | null,
  quality: AmazonScanQualitySummary | null
): BadgeItem[] => [
  ...buildProvenancePathBadges(provenance),
  ...buildProvenanceQualityBadges(quality),
  ...buildProvenanceCandidateBadges(provenance),
];

const buildProvenancePathBadges = (
  provenance: AmazonExtractionProvenance | null
): BadgeItem[] =>
  [
    createOptionalBadge('input-source', provenance?.inputSourceLabel),
    provenance?.retryOf !== null && provenance?.retryOf !== undefined
      ? createBadge('fallback', 'Fallback used', WARNING_CLASS)
      : null,
    provenance?.reusedProbe === true ? createBadge('probe-reused', 'Probe reused', SUCCESS_CLASS) : null,
  ].filter((badge): badge is BadgeItem => badge !== null);

const buildProvenanceQualityBadges = (
  quality: AmazonScanQualitySummary | null
): BadgeItem[] =>
  quality?.usedCaptcha === true ? [createBadge('captcha', 'Captcha path', INFO_CLASS)] : [];

const buildProvenanceCandidateBadges = (
  provenance: AmazonExtractionProvenance | null
): BadgeItem[] =>
  typeof provenance?.candidateRank === 'number'
    ? [createBadge('candidate-rank', `Amazon candidate #${provenance.candidateRank}`)]
    : [];

const buildRejectedCandidateBadges = (
  history: AmazonRejectedCandidateHistoryEntry[],
  breakdown: AmazonRejectedCandidateBreakdown
): BadgeItem[] => [
  createCountBadge({
    className: WARNING_CLASS,
    count: history.length,
    key: 'rejected-history',
    plural: 'earlier candidates rejected',
    singular: 'earlier candidate rejected',
  }),
  createCountBadge({
    className: ROSE_CLASS,
    count: breakdown.languageRejectedCount,
    key: 'language-rejected',
    plural: 'non-English pages rejected',
    singular: 'non-English page rejected',
  }),
].filter((badge): badge is BadgeItem => badge !== null);

const buildEvaluationBadges = (
  evaluation: ProductScanAmazonDetailsScan['amazonEvaluation']
): BadgeItem[] => {
  if (isNullish(evaluation)) return [];
  return [
    createOptionalBadge('evaluation-status', resolveAmazonEvaluationStatusLabel(evaluation.status), resolveEvaluationClassName(evaluation.status)),
    evaluation.languageAccepted === false ? createBadge('non-english', 'Non-English page', ROSE_CLASS) : null,
    createOptionalBadge('language', formatAmazonPageLanguage(evaluation.pageLanguage), MUTED_CLASS, 'Language'),
    createOptionalBadge('confidence', formatEvaluationConfidence(evaluation.confidence), MUTED_CLASS, 'AI confidence'),
  ].filter((badge): badge is BadgeItem => badge !== null);
};

const resolveEvaluationClassName = (
  status: NonNullable<ProductScanAmazonDetailsScan['amazonEvaluation']>['status']
): string => {
  if (status === 'approved') return SUCCESS_CLASS;
  if (status === 'rejected') return ROSE_CLASS;
  if (status === 'skipped') return MUTED_CLASS;
  return WARNING_CLASS;
};

const createCountBadge = (
  input: {
    className?: string;
    count: number;
    key: string;
    plural: string;
    singular: string;
  }
): BadgeItem | null =>
  input.count > 0
    ? createBadge(
        input.key,
        `${input.count} ${input.count === 1 ? input.singular : input.plural}`,
        input.className ?? MUTED_CLASS
      )
    : null;

const createOptionalBadge = (
  key: string,
  value: string | null | undefined,
  className = MUTED_CLASS,
  prefix?: string
): BadgeItem | null => {
  if (typeof value !== 'string' || value.length === 0) return null;
  return createBadge(key, prefix === undefined ? value : `${prefix} ${value}`, className);
};

const createBadge = (key: string, label: string, className = MUTED_CLASS): BadgeItem => ({
  className,
  key,
  label,
});
