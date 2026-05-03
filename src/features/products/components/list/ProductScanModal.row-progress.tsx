import type { ProductScanRowViewModel } from './ProductScanModal.row-model';
import { ProductScanRowOutcomePanel } from './ProductScanModal.row-outcome';

type ProductScanRowProgressPanelsProps = {
  view: ProductScanRowViewModel;
};

const hasText = (value: unknown): value is string =>
  typeof value === 'string' && value !== '';

const formatInputSourceLabel = (inputSource: string): string => {
  if (inputSource === 'url') return 'URL input';
  return 'File input';
};

function ActiveProgressPanel(props: ProductScanRowProgressPanelsProps): React.JSX.Element | null {
  const summary = props.view.progress.progressSummary;
  if (summary === null) return null;

  return (
    <div className='space-y-1 rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-2'>
      <div className='flex flex-wrap items-center gap-2 text-xs'>
        <span className='inline-flex items-center rounded-md border border-blue-500/20 px-2 py-0.5 font-medium text-foreground'>
          {summary.phaseLabel}
        </span>
        <span className='text-muted-foreground'>Current step</span>
        <span className='font-medium text-foreground'>{summary.stepLabel}</span>
        {typeof summary.attempt === 'number' ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
            Attempt {summary.attempt}
          </span>
        ) : null}
        {hasText(summary.inputSource) ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
            {formatInputSourceLabel(summary.inputSource)}
          </span>
        ) : null}
      </div>
      {hasText(summary.message) ? (
        <p className='text-sm text-muted-foreground'>{summary.message}</p>
      ) : null}
    </div>
  );
}

function ContinuationPanel(props: ProductScanRowProgressPanelsProps): React.JSX.Element | null {
  const summary = props.view.progress.continuationSummary;
  if (summary === null) return null;

  return (
    <div className='space-y-1 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2'>
      <div className='flex flex-wrap items-center gap-2 text-xs'>
        <span className='inline-flex items-center rounded-md border border-amber-500/20 px-2 py-0.5 font-medium text-amber-300'>
          {summary.badgeLabel}
        </span>
        {hasText(summary.contextLabel) ? (
          <span className='text-muted-foreground'>{summary.contextLabel}</span>
        ) : null}
        <span className='font-medium text-foreground'>{summary.stepLabel}</span>
        {hasText(summary.resultCodeLabel) ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
            {summary.resultCodeLabel}
          </span>
        ) : null}
        {typeof summary.attempt === 'number' ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
            Attempt {summary.attempt}
          </span>
        ) : null}
      </div>
      {hasText(summary.message) ? (
        <p className='text-sm text-muted-foreground'>{summary.message}</p>
      ) : null}
      <ContinuationLinks summary={summary} />
    </div>
  );
}

function ContinuationLinks(props: {
  summary: NonNullable<ProductScanRowViewModel['progress']['continuationSummary']>;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap gap-3 text-xs text-muted-foreground'>
      {hasText(props.summary.rejectedUrl) ? (
        <ContinuationLink
          label={props.summary.rejectedUrlLabel ?? 'Rejected'}
          url={props.summary.rejectedUrl}
        />
      ) : null}
      {hasText(props.summary.nextUrl) ? (
        <ContinuationLink
          label={props.summary.nextUrlLabel ?? 'Next up'}
          url={props.summary.nextUrl}
        />
      ) : null}
    </div>
  );
}

function ContinuationLink(props: { label: string; url: string }): React.JSX.Element {
  return (
    <div className='flex items-center gap-1.5'>
      <span>{props.label}:</span>
      <a
        href={props.url}
        target='_blank'
        rel='noopener noreferrer'
        className='max-w-[200px] truncate text-primary hover:underline'
      >
        {props.url}
      </a>
    </div>
  );
}

function EvaluationPolicyPanel(
  props: ProductScanRowProgressPanelsProps
): React.JSX.Element | null {
  const summary = props.view.progress.evaluationPolicySummary;
  if (summary === null) return null;
  const badges = [
    summary.executionLabel,
    summary.modelSource,
    summary.thresholdLabel,
    summary.scopeLabel,
    summary.similarityDecisionLabel,
    summary.languageGateLabel,
    summary.languageDetectionLabel,
  ].filter(hasText);

  return (
    <div className='space-y-1 rounded-md border border-border/40 bg-muted/20 px-3 py-2'>
      <div className='flex flex-wrap items-center gap-2 text-xs'>
        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
          AI policy
        </span>
        {badges.map((badge) => (
          <span
            key={badge}
            className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'
          >
            {badge}
          </span>
        ))}
      </div>
      {hasText(summary.modelLabel) ? (
        <p className='text-[11px] text-muted-foreground'>Model {summary.modelLabel}</p>
      ) : null}
    </div>
  );
}

function RejectedCandidatePanel(
  props: ProductScanRowProgressPanelsProps
): React.JSX.Element | null {
  const summary = props.view.progress.rejectedCandidateSummary;
  if (summary === null) return null;

  return (
    <div className='flex flex-wrap items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs'>
      <span className='inline-flex items-center rounded-md border border-amber-500/20 px-2 py-0.5 font-medium text-amber-300'>
        {summary.rejectedCount} candidate{summary.rejectedCount === 1 ? '' : 's'} rejected before match
      </span>
      {summary.languageRejectedCount > 0 ? (
        <span className='text-muted-foreground'>
          ({summary.languageRejectedCount} non-English)
        </span>
      ) : null}
      {hasText(summary.latestReason) ? (
        <span className='text-muted-foreground'>Latest reason: {summary.latestReason}</span>
      ) : null}
    </div>
  );
}

export function ProductScanRowProgressPanels(
  props: ProductScanRowProgressPanelsProps
): React.JSX.Element {
  return (
    <>
      <ActiveProgressPanel view={props.view} />
      <ContinuationPanel view={props.view} />
      <EvaluationPolicyPanel view={props.view} />
      <RejectedCandidatePanel view={props.view} />
      <ProductScanRowOutcomePanel view={props.view} />
    </>
  );
}
