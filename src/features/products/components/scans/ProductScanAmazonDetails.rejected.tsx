import { CopyButton } from '@/shared/ui/copy-button';
import type { AmazonRejectedCandidateHistoryEntry } from './ProductScanAmazonDetails.types';

export function ProductScanAmazonRejectedCandidateHistorySection(props: {
  entries: AmazonRejectedCandidateHistoryEntry[];
}): React.JSX.Element | null {
  if (props.entries.length === 0) return null;

  return (
    <div className='space-y-2'>
      <h5 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
        Rejected Amazon Candidates
      </h5>
      <div className='space-y-2'>
        {props.entries.map((entry) => (
          <ProductScanAmazonRejectedCandidateCard
            entry={entry}
            key={`amazon-ai-rejected-${entry.attempt}-${entry.candidateRank ?? 'na'}`}
          />
        ))}
      </div>
    </div>
  );
}

function ProductScanAmazonRejectedCandidateCard(props: {
  entry: AmazonRejectedCandidateHistoryEntry;
}): React.JSX.Element {
  const { entry } = props;
  return (
    <div className='rounded-md border border-rose-500/20 bg-background/70 px-3 py-2'>
      <div className='flex flex-wrap gap-2'>
        <RejectedCandidateBadges entry={entry} />
      </div>
      <RejectedCandidateBody entry={entry} />
    </div>
  );
}

function RejectedCandidateBadges(props: {
  entry: AmazonRejectedCandidateHistoryEntry;
}): React.JSX.Element {
  const { entry } = props;
  return (
    <>
      {typeof entry.candidateRank === 'number' ? (
        <RejectedBadge label={`Candidate #${entry.candidateRank}`} />
      ) : null}
      <RejectedBadge label='Rejected' tone='rose' />
      <RejectedBadge
        label={entry.rejectionKind === 'language' ? 'Language gate' : 'Product mismatch'}
        tone={entry.rejectionKind === 'language' ? 'rose' : 'muted'}
      />
      <RejectedBadge label={`Evaluation #${entry.attempt}`} />
      {entry.confidenceLabel !== null ? (
        <RejectedBadge label={`Confidence ${entry.confidenceLabel}`} />
      ) : null}
      {entry.candidateId !== null ? <RejectedBadge label={`Image ${entry.candidateId}`} /> : null}
    </>
  );
}

function RejectedBadge(props: {
  label: string;
  tone?: 'muted' | 'rose';
}): React.JSX.Element {
  const className =
    props.tone === 'rose'
      ? 'border-rose-500/40 text-rose-300'
      : 'border-border/60';
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${className}`}>
      {props.label}
    </span>
  );
}

function RejectedCandidateBody(props: {
  entry: AmazonRejectedCandidateHistoryEntry;
}): React.JSX.Element {
  const { entry } = props;
  return (
    <div className='mt-2 space-y-2 text-sm'>
      <RejectedCandidateUrl entry={entry} />
      {entry.reason !== null ? <p>{entry.reason}</p> : null}
      {entry.mismatch !== null ? <p className='text-muted-foreground'>{entry.mismatch}</p> : null}
      {shouldShowFallbackMessage(entry) ? <p>{entry.message}</p> : null}
      {entry.modelId !== null ? (
        <p className='text-xs text-muted-foreground'>Model: {entry.modelId}</p>
      ) : null}
    </div>
  );
}

const shouldShowFallbackMessage = (entry: AmazonRejectedCandidateHistoryEntry): boolean =>
  entry.reason === null && entry.mismatch === null && entry.message !== null;

function RejectedCandidateUrl(props: {
  entry: AmazonRejectedCandidateHistoryEntry;
}): React.JSX.Element | null {
  const { entry } = props;
  if (entry.url === null) return null;
  return (
    <div className='flex items-start justify-between gap-2'>
      <p className='break-all'>{entry.url}</p>
      <CopyButton
        value={entry.url}
        ariaLabel={`Copy rejected Amazon candidate URL ${entry.attempt}`}
        size='sm'
        className='h-6 px-2 text-[11px]'
        showText
      />
    </div>
  );
}
