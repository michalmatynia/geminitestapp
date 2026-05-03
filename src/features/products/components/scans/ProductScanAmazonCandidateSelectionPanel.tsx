'use client';

import { ExternalLink, Loader2 } from 'lucide-react';

import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import { Button } from '@/shared/ui/button';
import {
  isProductScanAmazonCandidateSelectionReady,
  resolveProductScanAmazonCandidatePreviews,
  type ProductScanAmazonCandidatePreview,
} from '@/features/products/lib/product-scan-amazon-candidates';
import { buildProductScanArtifactHref } from './ProductScanDiagnostics';

type ProductScanAmazonCandidateSelectionPanelProps = {
  scan: ProductScanRecord;
  extractingCandidateUrl?: string | null;
  onExtractCandidate: (candidate: ProductScanAmazonCandidatePreview) => Promise<void>;
};

const resolvePreviewImageHref = (
  scan: ProductScanRecord,
  candidate: ProductScanAmazonCandidatePreview
): string | null => {
  if (
    typeof candidate.heroImageArtifactName === 'string' &&
    candidate.heroImageArtifactName.trim().length > 0
  ) {
    return buildProductScanArtifactHref(scan.id, {
      name: candidate.heroImageArtifactName,
      path: candidate.heroImageArtifactName,
      kind: 'screenshot',
      mimeType: 'image/png',
    });
  }

  return candidate.heroImageUrl;
};

const hasText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

function CandidatePreviewImage(props: {
  scan: ProductScanRecord;
  candidate: ProductScanAmazonCandidatePreview;
}): React.JSX.Element {
  const { scan, candidate } = props;
  const previewImageHref = resolvePreviewImageHref(scan, candidate);

  if (previewImageHref === null) {
    return (
      <div className='flex aspect-square items-center justify-center border-b border-border/60 bg-muted/20 text-xs text-muted-foreground'>
        No preview image
      </div>
    );
  }

  return (
    <div className='aspect-square w-full overflow-hidden border-b border-border/60 bg-muted/20'>
      <img
        src={previewImageHref}
        alt={candidate.heroImageAlt ?? candidate.title ?? 'Amazon candidate preview'}
        className='h-full w-full object-cover'
      />
    </div>
  );
}

function CandidateMetaChips(props: {
  candidate: ProductScanAmazonCandidatePreview;
}): React.JSX.Element {
  const { candidate } = props;

  return (
    <div className='flex flex-wrap gap-2 text-[11px]'>
      {typeof candidate.rank === 'number' ? (
        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
          Rank {candidate.rank}
        </span>
      ) : null}
      {hasText(candidate.asin) ? (
        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
          ASIN {candidate.asin}
        </span>
      ) : null}
      {hasText(candidate.marketplaceDomain) ? (
        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
          {candidate.marketplaceDomain}
        </span>
      ) : null}
    </div>
  );
}

function CandidateCardActions(props: {
  candidate: ProductScanAmazonCandidatePreview;
  isExtracting: boolean;
  onExtractCandidate: (candidate: ProductScanAmazonCandidatePreview) => Promise<void>;
}): React.JSX.Element {
  const { candidate, isExtracting, onExtractCandidate } = props;

  const handleExtractClick = (): void => {
    onExtractCandidate(candidate).catch(() => undefined);
  };

  return (
    <div className='mt-auto flex flex-wrap gap-2'>
      <a
        href={candidate.url}
        target='_blank'
        rel='noopener noreferrer'
        className='inline-flex h-8 items-center gap-1 rounded-md border border-border/60 px-3 text-xs font-medium text-primary hover:bg-muted/20'
      >
        Open
        <ExternalLink className='h-3.5 w-3.5' />
      </a>
      <Button
        type='button'
        size='sm'
        className='h-8 text-xs'
        disabled={isExtracting}
        onClick={handleExtractClick}
      >
        {isExtracting ? (
          <>
            <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
            Extracting...
          </>
        ) : (
          'Extract this candidate'
        )}
      </Button>
    </div>
  );
}

function ProductScanAmazonCandidateCard(props: {
  scan: ProductScanRecord;
  candidate: ProductScanAmazonCandidatePreview;
  extractingCandidateUrl: string | null;
  onExtractCandidate: (candidate: ProductScanAmazonCandidatePreview) => Promise<void>;
}): React.JSX.Element {
  const { scan, candidate, extractingCandidateUrl, onExtractCandidate } = props;
  const isExtracting = extractingCandidateUrl === candidate.url;

  return (
    <article className='flex h-full flex-col overflow-hidden rounded-md border border-border/60 bg-background'>
      <CandidatePreviewImage scan={scan} candidate={candidate} />

      <div className='flex flex-1 flex-col gap-3 p-3'>
        <div className='space-y-2'>
          <CandidateMetaChips candidate={candidate} />

          <div className='space-y-1'>
            <h3 className='line-clamp-2 text-sm font-medium text-foreground'>
              {candidate.title ?? candidate.url}
            </h3>
            {hasText(candidate.snippet) ? (
              <p className='line-clamp-3 text-xs text-muted-foreground'>
                {candidate.snippet}
              </p>
            ) : null}
          </div>
        </div>

        <CandidateCardActions
          candidate={candidate}
          isExtracting={isExtracting}
          onExtractCandidate={onExtractCandidate}
        />
      </div>
    </article>
  );
}

export function ProductScanAmazonCandidateSelectionPanel(
  props: ProductScanAmazonCandidateSelectionPanelProps
): React.JSX.Element | null {
  const { scan, extractingCandidateUrl = null, onExtractCandidate } = props;
  const candidates = resolveProductScanAmazonCandidatePreviews(scan);

  if (
    isProductScanAmazonCandidateSelectionReady(scan) === false ||
    candidates.length === 0
  ) {
    return null;
  }

  return (
    <div className='space-y-3 rounded-md border border-border/50 bg-background/50 p-3'>
      <div className='space-y-1'>
        <h6 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
          Candidates for extraction
        </h6>
        <p className='text-sm text-muted-foreground'>
          Choose the Amazon candidate to extract into this product.
        </p>
      </div>

      <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
        {candidates.map((candidate) => (
          <ProductScanAmazonCandidateCard
            key={candidate.url}
            scan={scan}
            candidate={candidate}
            extractingCandidateUrl={extractingCandidateUrl}
            onExtractCandidate={onExtractCandidate}
          />
        ))}
      </div>
    </div>
  );
}
