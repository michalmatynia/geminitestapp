import { ExternalLink } from 'lucide-react';

import { CopyButton } from '@/shared/ui/copy-button';

import type { ProductScanRowViewModel } from './ProductScanModal.row-model';

type ProductScanOutcomePanelProps = {
  view: ProductScanRowViewModel;
};

const hasText = (value: unknown): value is string =>
  typeof value === 'string' && value !== '';

const formatInputSourceLabel = (inputSource: string): string => {
  if (inputSource === 'url') return 'URL input';
  return 'File input';
};

const resolveOutcomeFrameClassName = (usesFailureSummaryStyling: boolean): string => {
  if (usesFailureSummaryStyling) return 'border-destructive/20 bg-destructive/5';
  return 'border-blue-500/20 bg-blue-500/5';
};

const resolveOutcomeBadgeClassName = (usesFailureSummaryStyling: boolean): string => {
  if (usesFailureSummaryStyling) return 'border-destructive/20 text-destructive';
  return 'border-blue-500/20 text-blue-300';
};

const resolveOutcomeSourceLabel = (view: ProductScanRowViewModel): string => {
  if (view.progress.latestOutcomeSummary?.kind === 'stalled') return 'Current position';
  return 'Failure source';
};

const resolveOutcomePhaseLabel = (view: ProductScanRowViewModel): string | null =>
  view.progress.latestOutcomeSummary?.phaseLabel ??
  view.progress.fallbackFailureSummary?.phaseLabel ??
  null;

const resolveOutcomeStepLabel = (view: ProductScanRowViewModel): string | null =>
  view.progress.latestOutcomeSummary?.stepLabel ??
  view.progress.fallbackFailureSummary?.stepLabel ??
  null;

const resolveOutcomeResultCodeLabel = (view: ProductScanRowViewModel): string | null =>
  view.progress.latestOutcomeSummary?.resultCodeLabel ??
  view.progress.fallbackFailureSummary?.resultCodeLabel ??
  null;

const resolveOutcomeMessage = (view: ProductScanRowViewModel): string | null =>
  view.progress.latestOutcomeSummary?.message ??
  view.progress.fallbackFailureSummary?.message ??
  null;

const resolveOutcomeTimingLabel = (view: ProductScanRowViewModel): string | null =>
  view.progress.latestOutcomeSummary?.timingLabel ??
  view.progress.fallbackFailureSummary?.timingLabel ??
  null;

const resolveOutcomeUrl = (view: ProductScanRowViewModel): string | null =>
  view.progress.latestOutcomeSummary?.url ?? view.progress.fallbackFailureSummary?.url ?? null;

const resolveOutcomeAttemptLabel = (view: ProductScanRowViewModel): string | null => {
  const attempt = view.progress.latestOutcomeSummary?.attempt;
  if (typeof attempt !== 'number') return null;
  return `Attempt ${attempt}`;
};

const resolveOutcomeInputSourceLabel = (view: ProductScanRowViewModel): string | null => {
  const inputSource = view.progress.latestOutcomeSummary?.inputSource;
  if (hasText(inputSource) === false) return null;
  return formatInputSourceLabel(inputSource);
};

const resolveArtifactCountLabel = (view: ProductScanRowViewModel): string | null => {
  const count = view.diagnostics.failureArtifactCount;
  if (count === 0) return null;
  return `${count} artifact${count === 1 ? '' : 's'}`;
};

const buildOutcomeBadgeLabels = (view: ProductScanRowViewModel): string[] =>
  [
    resolveOutcomeResultCodeLabel(view),
    resolveOutcomeAttemptLabel(view),
    resolveOutcomeInputSourceLabel(view),
    resolveArtifactCountLabel(view),
  ].filter(hasText);

const hasOutcomePanel = (view: ProductScanRowViewModel): boolean =>
  view.progress.latestOutcomeSummary !== null || view.progress.fallbackFailureSummary !== null;

function ArtifactPathCopyButton(props: {
  artifactPath: string | null | undefined;
}): React.JSX.Element | null {
  if (hasText(props.artifactPath) === false) return null;

  return (
    <CopyButton
      value={props.artifactPath}
      variant='outline'
      size='sm'
      showText
      className='h-6 px-2 text-[11px]'
      ariaLabel='Copy artifact path'
    />
  );
}

function OutcomeBadges(props: ProductScanOutcomePanelProps): React.JSX.Element {
  const badgeLabels = buildOutcomeBadgeLabels(props.view);

  return (
    <div className='flex flex-wrap items-center gap-2 text-xs'>
      <span
        className={`inline-flex items-center rounded-md border px-2 py-0.5 font-medium ${resolveOutcomeBadgeClassName(props.view.progress.usesFailureSummaryStyling)}`}
      >
        {resolveOutcomeSourceLabel(props.view)}
      </span>
      <span className='text-muted-foreground'>{resolveOutcomePhaseLabel(props.view)}</span>
      <span className='font-medium text-foreground'>{resolveOutcomeStepLabel(props.view)}</span>
      {badgeLabels.map((badgeLabel) => (
        <OutcomeBadge key={badgeLabel}>{badgeLabel}</OutcomeBadge>
      ))}
      <ArtifactPathCopyButton artifactPath={props.view.diagnostics.latestFailureArtifact?.path} />
    </div>
  );
}

function OutcomeBadge(props: { children: React.ReactNode }): React.JSX.Element {
  return (
    <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
      {props.children}
    </span>
  );
}

function OutcomeText(props: {
  value: string | null;
  className: string;
}): React.JSX.Element | null {
  if (hasText(props.value) === false) return null;
  return <p className={props.className}>{props.value}</p>;
}

function OutcomeLinkIfAvailable(props: {
  href: string | null;
  label: string;
}): React.JSX.Element | null {
  if (hasText(props.href) === false) return null;
  return <OutcomeLink href={props.href} label={props.label} />;
}

function OutcomeLink(props: { href: string; label: string }): React.JSX.Element {
  return (
    <a
      href={props.href}
      target='_blank'
      rel='noopener noreferrer'
      className='inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline'
    >
      {props.label}
      <ExternalLink className='h-3.5 w-3.5' />
    </a>
  );
}

export function ProductScanRowOutcomePanel(
  props: ProductScanOutcomePanelProps
): React.JSX.Element | null {
  if (hasOutcomePanel(props.view) === false) return null;

  return (
    <div
      className={`space-y-1 rounded-md border px-3 py-2 ${resolveOutcomeFrameClassName(props.view.progress.usesFailureSummaryStyling)}`}
    >
      <OutcomeBadges view={props.view} />
      <OutcomeText value={resolveOutcomeMessage(props.view)} className='text-sm text-muted-foreground' />
      <OutcomeText
        value={resolveOutcomeTimingLabel(props.view)}
        className='text-xs text-muted-foreground'
      />
      <OutcomeLinkIfAvailable href={resolveOutcomeUrl(props.view)} label='Open stage URL' />
      {hasText(props.view.diagnostics.latestFailureArtifactHref) ? (
        <OutcomeLink href={props.view.diagnostics.latestFailureArtifactHref} label='Open latest artifact' />
      ) : null}
    </div>
  );
}
