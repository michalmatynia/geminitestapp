'use client';

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import type {
  ProductScanAmazonDetails as ProductScanAmazonDetailsValue,
  ProductScanAmazonEvaluation,
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
  extractionResultLabel: string | null;
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
): Array<{ label: string; value: string }> =>
  fields
    .filter((field): field is { label: string; value: string } => hasText(field.value))
    .map((field) => ({
      label: field.label,
      value: field.value.trim(),
    }));

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
  if (!details?.attributes.length) {
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
  if (!query) {
    return true;
  }

  const haystack = [attribute.label, attribute.value, attribute.key, attribute.source]
    .filter(hasText)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
};

const formatResultCode = (value: string | null | undefined): string | null => {
  if (!hasText(value)) {
    return null;
  }

  return value
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const resolveInputSourceLabel = (value: string | null | undefined): string | null => {
  if (!hasText(value)) {
    return null;
  }

  return value === 'url' ? 'URL input' : value === 'file' ? 'File input' : value.trim();
};

const resolveAmazonEvaluationStatusLabel = (
  value: ProductScanAmazonEvaluation['status'] | null | undefined
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

const resolveAmazonExtractionProvenance = (
  steps: readonly ProductScanStep[] | null | undefined
): AmazonExtractionProvenance | null => {
  const normalizedSteps: readonly ProductScanStep[] = steps ?? [];
  if (normalizedSteps.length === 0) {
    return null;
  }

  const amazonExtractStep =
    [...normalizedSteps].reverse().find((step) => step.key === 'amazon_extract' && step.status === 'completed') ??
    [...normalizedSteps].reverse().find((step) => step.key === 'amazon_extract');
  const googleUploadStep =
    [...normalizedSteps].reverse().find(
      (step) =>
        step.key === 'google_upload' &&
        step.status === 'completed' &&
        (!amazonExtractStep?.candidateId || step.candidateId === amazonExtractStep.candidateId)
    ) ??
    [...normalizedSteps].reverse().find((step) => step.key === 'google_upload' && step.status === 'completed') ??
    [...normalizedSteps].reverse().find((step) => step.key === 'google_upload');

  const candidateId = amazonExtractStep?.candidateId?.trim() || googleUploadStep?.candidateId?.trim() || null;
  const candidateRank =
    typeof amazonExtractStep?.candidateRank === 'number' && Number.isFinite(amazonExtractStep.candidateRank)
      ? amazonExtractStep.candidateRank
      : null;
  const inputSourceLabel = resolveInputSourceLabel(googleUploadStep?.inputSource);
  const retryOf = googleUploadStep?.retryOf?.trim() || null;
  const extractionResultLabel =
    formatResultCode(amazonExtractStep?.resultCode) ?? formatResultCode(googleUploadStep?.resultCode);

  if (!candidateId && !candidateRank && !inputSourceLabel && !retryOf && !extractionResultLabel) {
    return null;
  }

  return {
    candidateId,
    candidateRank,
    inputSourceLabel,
    retryOf,
    extractionResultLabel,
  };
};

export const resolveAmazonScanQualitySummary = (
  scan: Pick<ProductScanRecord, 'asin' | 'title' | 'description' | 'amazonDetails' | 'steps'>
): AmazonScanQualitySummary | null => {
  const provenance = resolveAmazonExtractionProvenance(scan.steps);
  const normalizedSteps: readonly ProductScanStep[] = scan.steps ?? [];
  const hasAsin = hasText(scan.asin);
  const hasExtractedDetails = hasProductScanAmazonDetails(scan.amazonDetails);
  const hasListingText = hasText(scan.title) || hasText(scan.description);
  const usedCaptcha = normalizedSteps.some((step) => step.key === 'google_captcha');

  if (!hasAsin && !hasExtractedDetails && !hasListingText && !usedCaptcha && !provenance?.retryOf) {
    return null;
  }

  return {
    primaryLabel: hasAsin
      ? 'Strong match'
      : hasExtractedDetails || hasListingText
        ? 'Partial extraction'
        : 'Scraped info',
    usedFallback: Boolean(provenance?.retryOf),
    usedCaptcha,
  };
};

export function ProductScanAmazonQualitySummary(props: {
  scan: Pick<ProductScanRecord, 'asin' | 'title' | 'description' | 'amazonDetails' | 'steps'>;
}): React.JSX.Element | null {
  const quality = resolveAmazonScanQualitySummary(props.scan);

  if (!quality) {
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
        {quality.usedFallback ? (
          <span className='inline-flex items-center rounded-md border border-amber-500/40 px-2 py-0.5 text-[11px] font-medium text-amber-300'>
            Fallback used
          </span>
        ) : null}
        {quality.usedCaptcha ? (
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

  if (!provenance) {
    return null;
  }

  return (
    <div className='space-y-2 rounded-md border border-border/50 bg-background/70 px-3 py-2'>
      <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
        Scan Provenance
      </p>
      <div className='flex flex-wrap gap-2'>
        {provenance.inputSourceLabel ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium'>
            Google: {provenance.inputSourceLabel === 'URL input' ? 'URL' : 'File'}
          </span>
        ) : null}
        {provenance.retryOf ? (
          <span className='inline-flex items-center rounded-md border border-amber-500/40 px-2 py-0.5 text-[11px] font-medium text-amber-300'>
            Fallback: {provenance.retryOf}
          </span>
        ) : null}
        {typeof provenance.candidateRank === 'number' ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium'>
            Amazon rank: #{provenance.candidateRank}
          </span>
        ) : null}
        {provenance.candidateId ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium'>
            Image: {provenance.candidateId}
          </span>
        ) : null}
        {provenance.extractionResultLabel ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium'>
            Result: {provenance.extractionResultLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export const hasProductScanAmazonDetails = (
  details: ProductScanAmazonDetailsValue | null | undefined
): boolean =>
  Boolean(
    details &&
      ([
        details.brand,
        details.manufacturer,
        details.modelNumber,
        details.partNumber,
        details.color,
        details.style,
        details.material,
        details.size,
        details.pattern,
        details.finish,
        details.itemDimensions,
        details.packageDimensions,
        details.itemWeight,
        details.packageWeight,
        details.bestSellersRank,
        details.ean,
        details.gtin,
        details.upc,
        details.isbn,
      ].some(hasText) ||
        details.bulletPoints.length > 0 ||
        details.attributes.length > 0 ||
        details.rankings.length > 0)
  );

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

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between gap-2'>
        <h5 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
          {props.title}
        </h5>
        <CopyButton
          value={props.value.trim()}
          ariaLabel={`Copy ${props.title}`}
          size='sm'
          className='h-6 px-2 text-[11px]'
          showText
        />
      </div>
      <div className='rounded-md border border-border/50 bg-background/70 px-3 py-2'>
        <p className='whitespace-pre-wrap text-sm'>{props.value.trim()}</p>
      </div>
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
  const provenance = useMemo(() => resolveAmazonExtractionProvenance(scan.steps), [scan.steps]);
  const quality = useMemo(() => resolveAmazonScanQualitySummary(scan), [scan]);
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
    !hasProductScanAmazonDetails(details) &&
    !hasText(scan.asin) &&
    !scan.amazonEvaluation &&
    !scan.amazonProbe
  ) {
    return null;
  }

  return (
    <div className='space-y-3 rounded-md border border-border/60 bg-muted/20 px-3 py-3'>
      <div className='flex flex-wrap gap-2'>
        {quality ? (
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
        {hasText(scan.title) ? (
          <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
            Title available
          </span>
        ) : null}
        {details?.bulletPoints.length ? (
          <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
            {details.bulletPoints.length} bullet point{details.bulletPoints.length === 1 ? '' : 's'}
          </span>
        ) : null}
        {details?.attributes.length ? (
          <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
            {details.attributes.length} extracted attribute{details.attributes.length === 1 ? '' : 's'}
          </span>
        ) : null}
        {details?.rankings.length ? (
          <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
            {details.rankings.length} ranking entr{details.rankings.length === 1 ? 'y' : 'ies'}
          </span>
        ) : null}
        {provenance?.inputSourceLabel ? (
          <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
            {provenance.inputSourceLabel}
          </span>
        ) : null}
        {provenance?.retryOf ? (
          <span className='inline-flex items-center rounded-md border border-amber-500/40 bg-background/70 px-2.5 py-1 text-xs font-medium text-amber-300'>
            Fallback used
          </span>
        ) : null}
        {quality?.usedCaptcha ? (
          <span className='inline-flex items-center rounded-md border border-sky-500/40 bg-background/70 px-2.5 py-1 text-xs font-medium text-sky-300'>
            Captcha path
          </span>
        ) : null}
        {typeof provenance?.candidateRank === 'number' ? (
          <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
            Amazon candidate #{provenance.candidateRank}
          </span>
        ) : null}
        {scan.amazonEvaluation ? (
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
        {scan.amazonEvaluation?.confidence != null ? (
          <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
            AI confidence {formatAmazonEvaluationConfidence(scan.amazonEvaluation.confidence)}
          </span>
        ) : null}
      </div>

      {scan.amazonEvaluation ? (
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
              label: 'Threshold',
              value: formatAmazonEvaluationConfidence(scan.amazonEvaluation.threshold),
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

      {scan.amazonEvaluation?.reasons.length ? (
        <TextBlock title='AI Evaluation Reasons' value={scan.amazonEvaluation.reasons.join('\n')} />
      ) : null}

      {scan.amazonEvaluation?.mismatches.length ? (
        <TextBlock
          title='AI Evaluation Mismatches'
          value={scan.amazonEvaluation.mismatches.join('\n')}
        />
      ) : null}

      {scan.amazonProbe ? (
        <FieldGroup
          title='Amazon Probe'
          fields={[
            { label: 'Probe title', value: scan.amazonProbe.pageTitle },
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

      {details?.rankings.length ? (
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
                {entry.category ? (
                  <p className='text-sm text-muted-foreground'>{entry.category}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {details?.bulletPoints.length ? (
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

      {groupedAttributes.length ? (
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
