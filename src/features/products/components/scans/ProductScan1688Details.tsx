'use client';

import { ExternalLink } from 'lucide-react';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import { CopyButton } from '@/shared/ui/copy-button';

type ProductScan1688DetailsProps = {
  scan: Pick<
    ProductScanRecord,
    'title' | 'url' | 'supplierDetails' | 'supplierProbe' | 'supplierEvaluation'
  >;
};

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

export const hasProductScan1688Details = (
  scan:
    | Pick<
        ProductScanRecord,
        'title' | 'url' | 'supplierDetails' | 'supplierProbe' | 'supplierEvaluation'
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

  const details = scan.supplierDetails;
  const probe = scan.supplierProbe;
  const evaluation = scan.supplierEvaluation;
  const priceSummary =
    buildInlineSummary(details?.priceText, details?.priceRangeText) ||
    buildInlineSummary(
      details?.prices?.[0]?.amount,
      details?.prices?.[0]?.currency,
      details?.prices?.[0]?.moq ? `MOQ ${details.prices[0].moq}` : null
    );
  const evaluationConfidence = formatConfidence(evaluation?.confidence);

  return (
    <div className='space-y-3 rounded-md border border-border/50 bg-background/70 px-3 py-3'>
      <div className='flex flex-wrap items-center gap-2 text-xs'>
        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
          1688 supplier details
        </span>
        {details?.supplierName ? (
          <span className='font-medium text-foreground'>{details.supplierName}</span>
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
          <DetailRow label='Current page title' value={probe?.pageTitle ?? scan.title} />
          <DetailRow label='Candidate URL' value={probe?.candidateUrl} href={probe?.candidateUrl} />
          <DetailRow label='Canonical URL' value={probe?.canonicalUrl} href={probe?.canonicalUrl} />
          <DetailRow label='Probe language' value={probe?.pageLanguage} />
          <DetailRow label='Probe artifact key' value={probe?.artifactKey} />
        </div>
      </div>

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

        <div className='space-y-2'>
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
              {buildInlineSummary(
                evaluationConfidence ? `Confidence ${evaluationConfidence}` : null,
                evaluation.sameProduct === true
                  ? 'Same product'
                  : evaluation.sameProduct === false
                    ? 'Different product'
                    : null,
                evaluation.imageMatch === true
                  ? 'Image match'
                  : evaluation.imageMatch === false
                    ? 'Image mismatch'
                    : null,
                evaluation.titleMatch === true
                  ? 'Title match'
                  : evaluation.titleMatch === false
                    ? 'Title mismatch'
                    : null
              ) ? (
                <p className='text-muted-foreground'>
                  {buildInlineSummary(
                    evaluationConfidence ? `Confidence ${evaluationConfidence}` : null,
                    evaluation.sameProduct === true
                      ? 'Same product'
                      : evaluation.sameProduct === false
                        ? 'Different product'
                        : null,
                    evaluation.imageMatch === true
                      ? 'Image match'
                      : evaluation.imageMatch === false
                        ? 'Image mismatch'
                        : null,
                    evaluation.titleMatch === true
                      ? 'Title match'
                      : evaluation.titleMatch === false
                        ? 'Title mismatch'
                        : null
                  )}
                </p>
              ) : null}
              {evaluation.reasons.length ? (
                <p className='text-muted-foreground'>{evaluation.reasons.join(' ')}</p>
              ) : null}
              {evaluation.mismatches.length ? (
                <p className='text-destructive'>{evaluation.mismatches.join(' ')}</p>
              ) : null}
            </div>
          ) : (
            <p className='text-sm text-muted-foreground'>No AI supplier evaluation was stored for this run.</p>
          )}
        </div>
      </div>
    </div>
  );
}
