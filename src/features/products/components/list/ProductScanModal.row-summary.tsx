import { ExternalLink } from 'lucide-react';

import { CopyButton } from '@/shared/ui/copy-button';

import { formatTimestamp } from './ProductScanModal.helpers';
import type { ProductScanRowViewModel } from './ProductScanModal.row-model';
import type { ProductScanModalConfig, ScanModalRow } from './ProductScanModal.types';

type ProductScanRowSummaryProps = {
  row: ScanModalRow;
  modalConfig: ProductScanModalConfig;
  view: ProductScanRowViewModel;
  markBlockedScanReviewed: (scanId: string | null | undefined) => void;
};

const hasText = (value: unknown): value is string =>
  typeof value === 'string' && value !== '';

function RowMessagePanel(props: { view: ProductScanRowViewModel }): React.JSX.Element | null {
  const { infoMessage, errorMessage } = props.view;
  const hasError = hasText(errorMessage);
  if (hasText(infoMessage) === false && hasError === false) return null;

  return (
    <div
      className={`rounded-md px-3 py-2 text-sm ${
        hasError
          ? 'border border-destructive/20 bg-destructive/5 text-destructive-foreground'
          : 'border border-border/50 bg-background/50 text-muted-foreground'
      }`}
    >
      {errorMessage ?? infoMessage}
    </div>
  );
}

function SupplierSummary(props: { view: ProductScanRowViewModel }): React.JSX.Element | null {
  if (props.view.isAmazonScan === true || props.view.supplierSummary === '') return null;
  return <p className='text-xs font-medium text-muted-foreground'>{props.view.supplierSummary}</p>;
}

function RejectedBreakdownSuffix(props: {
  breakdown: ProductScanRowViewModel['recommendationRejectedBreakdown'];
}): React.JSX.Element | null {
  const breakdown = props.breakdown;
  if (breakdown === null || breakdown.totalCount === 0) return null;
  const languageLabel =
    breakdown.languageRejectedCount > 0
      ? `, ${breakdown.languageRejectedCount} non-English`
      : '';

  return (
    <>
      {' '}
      (after {breakdown.totalCount} rejected{languageLabel})
    </>
  );
}

function RecommendationSummary(props: {
  view: ProductScanRowViewModel;
}): React.JSX.Element | null {
  const { view } = props;
  if (view.recommendationReason === null) return null;

  return (
    <p className='text-xs font-medium text-muted-foreground'>
      AI recommendation: {view.recommendationReason}
      {view.isAmazonScan === true ? (
        <RejectedBreakdownSuffix breakdown={view.recommendationRejectedBreakdown} />
      ) : null}
    </p>
  );
}

function SupplierPolicyPanel(props: {
  row: ScanModalRow;
  view: ProductScanRowViewModel;
  markBlockedScanReviewed: (scanId: string | null | undefined) => void;
}): React.JSX.Element | null {
  const { row, view, markBlockedScanReviewed } = props;
  const policy = view.supplierPolicy;
  if (view.isAmazonScan === true || policy.summary?.blockActions !== true) return null;

  return (
    <div className='space-y-1.5 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2'>
      <p className='text-xs font-medium text-amber-300'>
        Apply is blocked by policy: {policy.summary.detail}
      </p>
      {policy.isBlockedResultReviewed === true ? (
        <p className='text-[11px] text-muted-foreground'>
          Review bypass active (reviewed at {formatTimestamp(row.scan?.updatedAt)})
        </p>
      ) : (
        <div className='flex flex-wrap gap-3'>
          <SupplierPolicyAnchor href={policy.candidateUrlsHref} label='Verify Candidate URLs' />
          <SupplierPolicyAnchor href={policy.matchEvaluationHref} label='Verify Match Evaluation' />
          <button
            type='button'
            onClick={() => markBlockedScanReviewed(row.scan?.id)}
            className='text-primary underline-offset-2 hover:underline'
          >
            Mark reviewed
          </button>
        </div>
      )}
    </div>
  );
}

function SupplierPolicyAnchor(props: {
  href: string | null;
  label: string;
}): React.JSX.Element | null {
  if (props.href === null) return null;

  return (
    <a
      href={`#${props.href}`}
      className='inline-flex items-center gap-1 text-[11px] text-primary hover:underline'
    >
      {props.label}
      <ExternalLink className='h-3 w-3' />
    </a>
  );
}

function ResultUrlLink(props: {
  href: string | null | undefined;
  label: string;
}): React.JSX.Element | null {
  if (hasText(props.href) === false) return null;

  return (
    <a
      href={props.href}
      target='_blank'
      rel='noopener noreferrer'
      className='inline-flex items-center gap-1 text-xs text-primary hover:underline'
    >
      {props.label}
      <ExternalLink className='h-3.5 w-3.5' />
    </a>
  );
}

function AmazonAsinSummary(props: { asin: string | null | undefined }): React.JSX.Element | null {
  if (hasText(props.asin) === false) return null;

  return (
    <div className='flex items-center gap-2 border-l border-border/50 pl-2'>
      <span className='text-xs font-medium uppercase text-muted-foreground'>ASIN</span>
      <span className='text-xs font-mono font-medium'>{props.asin}</span>
      <CopyButton
        value={props.asin}
        ariaLabel='Copy ASIN'
        size='sm'
        className='h-5 px-1.5'
        showText
      />
    </div>
  );
}

function ResultLinks(props: {
  row: ScanModalRow;
  modalConfig: ProductScanModalConfig;
  view: ProductScanRowViewModel;
}): React.JSX.Element | null {
  const { row, modalConfig, view } = props;
  if (row.scan === null) return null;

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <ResultUrlLink href={row.scan.url} label={modalConfig.openResultLabel} />
      {view.isAmazonScan === true ? <AmazonAsinSummary asin={row.scan.asin} /> : null}
    </div>
  );
}

export function ProductScanRowSummaryPanels(
  props: ProductScanRowSummaryProps
): React.JSX.Element {
  return (
    <>
      <RowMessagePanel view={props.view} />
      <SupplierSummary view={props.view} />
      <RecommendationSummary view={props.view} />
      <SupplierPolicyPanel
        row={props.row}
        view={props.view}
        markBlockedScanReviewed={props.markBlockedScanReviewed}
      />
      <ResultLinks row={props.row} modalConfig={props.modalConfig} view={props.view} />
    </>
  );
}
