import {
  resolveAmazonScanQualityModifierLabel,
  resolveAmazonScanQualitySummary,
} from './ProductScanAmazonDetails.quality';
import {
  resolveAmazonExtractionProvenance,
  resolveRejectedAmazonCandidateBreakdown,
} from './ProductScanAmazonDetails.provenance';
import type {
  AmazonScanQualitySummary,
} from './ProductScanAmazonDetails.types';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';

type BadgeItem = {
  className: string;
  key: string;
  label: string;
};

const BASE_BADGE_CLASS =
  'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium';
const MUTED_BADGE_CLASS = `${BASE_BADGE_CLASS} border-border/60`;
const WARNING_BADGE_CLASS = `${BASE_BADGE_CLASS} border-amber-500/40 text-amber-300`;
const INFO_BADGE_CLASS = `${BASE_BADGE_CLASS} border-sky-500/40 text-sky-300`;
const SUCCESS_BADGE_CLASS = `${BASE_BADGE_CLASS} border-emerald-500/40 text-emerald-300`;

export function ProductScanAmazonQualitySummary(props: {
  scan: Pick<ProductScanRecord, 'amazonDetails' | 'asin' | 'description' | 'steps' | 'title'>;
}): React.JSX.Element | null {
  const quality = resolveAmazonScanQualitySummary(props.scan);
  const modifierLabel = resolveAmazonScanQualityModifierLabel(props.scan);
  if (quality === null) return null;

  return (
    <div className='space-y-2 rounded-md border border-border/50 bg-background/70 px-3 py-2'>
      <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
        Scan Quality
      </p>
      <SummaryBadgeList badges={buildQualitySummaryBadges(quality, modifierLabel)} />
    </div>
  );
}

const buildQualitySummaryBadges = (
  quality: AmazonScanQualitySummary,
  modifierLabel: string | null
): BadgeItem[] =>
  [
    {
      className: `${BASE_BADGE_CLASS} ${resolveQualityClassName(quality.primaryLabel)}`,
      key: 'quality',
      label: quality.primaryLabel,
    },
    modifierLabel === null
      ? null
      : { className: MUTED_BADGE_CLASS, key: 'modifier', label: modifierLabel },
    quality.usedFallback
      ? { className: WARNING_BADGE_CLASS, key: 'fallback', label: 'Fallback used' }
      : null,
    quality.usedCaptcha
      ? { className: INFO_BADGE_CLASS, key: 'captcha', label: 'Captcha path' }
      : null,
  ].filter((badge): badge is BadgeItem => badge !== null);

const resolveQualityClassName = (
  primaryLabel: AmazonScanQualitySummary['primaryLabel']
): string => {
  if (primaryLabel === 'Strong match') return 'border-emerald-500/40 text-emerald-300';
  if (primaryLabel === 'Partial extraction') return 'border-amber-500/40 text-amber-300';
  return 'border-border/60';
};

export function ProductScanAmazonProvenanceSummary(props: {
  scan: Pick<ProductScanRecord, 'steps'>;
}): React.JSX.Element | null {
  const provenance = resolveAmazonExtractionProvenance(props.scan.steps);
  const breakdown = resolveRejectedAmazonCandidateBreakdown(props.scan.steps);
  if (provenance === null && breakdown.totalCount === 0) return null;

  return (
    <div className='space-y-2 rounded-md border border-border/50 bg-background/70 px-3 py-2'>
      <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
        Scan Provenance
      </p>
      <SummaryBadgeList badges={buildProvenanceSummaryBadges(provenance, breakdown)} />
    </div>
  );
}

const buildProvenanceSummaryBadges = (
  provenance: ReturnType<typeof resolveAmazonExtractionProvenance>,
  breakdown: ReturnType<typeof resolveRejectedAmazonCandidateBreakdown>
): BadgeItem[] => [
  ...buildProvenancePathBadges(provenance),
  ...buildProvenanceRejectedBadges(breakdown),
  ...buildProvenanceCandidateBadges(provenance),
];

const buildProvenancePathBadges = (
  provenance: ReturnType<typeof resolveAmazonExtractionProvenance>
): BadgeItem[] =>
  [
    createOptionalBadge('input-source', formatGoogleInputBadge(provenance?.inputSourceLabel)),
    createOptionalBadge('fallback', provenance?.retryOf, WARNING_BADGE_CLASS, 'Fallback'),
    provenance?.reusedProbe === true
      ? { className: SUCCESS_BADGE_CLASS, key: 'probe-reused', label: 'Probe reused' }
      : null,
  ].filter((badge): badge is BadgeItem => badge !== null);

const buildProvenanceRejectedBadges = (
  breakdown: ReturnType<typeof resolveRejectedAmazonCandidateBreakdown>
): BadgeItem[] =>
  [
    breakdown.totalCount > 0
      ? {
          className: WARNING_BADGE_CLASS,
          key: 'rejected-count',
          label: `Rejected before match: ${breakdown.totalCount}`,
        }
      : null,
    breakdown.languageRejectedCount > 0
      ? {
          className: `${BASE_BADGE_CLASS} border-rose-500/40 text-rose-300`,
          key: 'language-rejected',
          label: `Non-English rejected: ${breakdown.languageRejectedCount}`,
        }
      : null,
  ].filter((badge): badge is BadgeItem => badge !== null);

const buildProvenanceCandidateBadges = (
  provenance: ReturnType<typeof resolveAmazonExtractionProvenance>
): BadgeItem[] =>
  [
    typeof provenance?.candidateRank === 'number'
      ? { className: MUTED_BADGE_CLASS, key: 'rank', label: `Amazon rank: #${provenance.candidateRank}` }
      : null,
    createOptionalBadge('candidate-id', provenance?.candidateId, MUTED_BADGE_CLASS, 'Image'),
    createOptionalBadge('result', provenance?.extractionResultLabel, MUTED_BADGE_CLASS, 'Result'),
  ].filter((badge): badge is BadgeItem => badge !== null);

const createOptionalBadge = (
  key: string,
  value: string | null | undefined,
  className = MUTED_BADGE_CLASS,
  prefix?: string
): BadgeItem | null => {
  if (typeof value !== 'string' || value.length === 0) return null;
  return { className, key, label: prefix === undefined ? value : `${prefix}: ${value}` };
};

const formatGoogleInputBadge = (inputSourceLabel: string | null | undefined): string | null => {
  if (inputSourceLabel === 'URL input') return 'Google: URL';
  if (inputSourceLabel === 'File input') return 'Google: File';
  return inputSourceLabel ?? null;
};

function SummaryBadgeList(props: { badges: BadgeItem[] }): React.JSX.Element {
  return (
    <div className='flex flex-wrap gap-2'>
      {props.badges.map((badge) => (
        <span key={badge.key} className={badge.className}>
          {badge.label}
        </span>
      ))}
    </div>
  );
}
