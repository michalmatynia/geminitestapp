import React from 'react';

import type { ProductScanStep } from '@/shared/contracts/product-scans';

import { ProductScanStepCard } from './ProductScanStepCard';
import { resolveContinuationContexts } from './ProductScanSteps.continuation';
import {
  buildGroupedProductScanSteps,
  buildProductScanStepsStats,
} from './ProductScanSteps.grouping';
import { resolveProductScanActiveStepSummary } from './ProductScanSteps.outcomes';
import type {
  ProductScanContinuationContext,
  ProductScanStepGroupView,
  ProductScanStepsStats,
} from './ProductScanSteps.types';
import { getStepGroupLabel, resolveStepAttempt } from './ProductScanSteps.utils';

function ProductScanStepGroup(props: {
  group: ProductScanStepGroupView['group'];
  steps: ProductScanStep[];
  continuationContexts: Map<number, ProductScanContinuationContext>;
}): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <h5 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
        {getStepGroupLabel(props.group)}
      </h5>
      <div className='space-y-2 border-l border-border/50 pl-3'>
        {props.steps.map((step, index) => {
          const attemptValue = resolveStepAttempt(step);
          const continuationContext =
            attemptValue !== null ? props.continuationContexts.get(attemptValue) ?? null : null;
          return (
            <ProductScanStepCard
              key={`${step.key}-${step.attempt ?? 1}-${step.inputSource ?? 'none'}-${index}`}
              step={step}
              continuationContext={continuationContext}
            />
          );
        })}
      </div>
    </div>
  );
}

function ProductScanStepsSummaryBadges(props: {
  steps: ProductScanStep[];
  stats: ProductScanStepsStats;
}): React.JSX.Element {
  const activeStepSummary = resolveProductScanActiveStepSummary(props.steps);
  return (
    <div className='flex flex-wrap gap-2'>
      <span className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium'>
        {props.steps.length} step{props.steps.length === 1 ? '' : 's'}
      </span>
      <OptionalCountBadge
        count={props.stats.warningCount}
        singular='warning'
        plural='warnings'
        tone='warning'
      />
      <OptionalCountBadge
        count={props.stats.failedCount}
        singular='failed'
        plural='failed'
        tone='destructive'
      />
      <OptionalRetryBadge count={props.stats.retryCount} />
      <OptionalCountBadge
        count={props.stats.amazonCandidateAttemptCount}
        singular='Amazon candidate'
        plural='Amazon candidates'
      />
      <OptionalCountBadge
        count={props.stats.supplierCandidateAttemptCount}
        singular='supplier candidate'
        plural='supplier candidates'
      />
      {activeStepSummary !== null ? (
        <span className='inline-flex items-center rounded-md border border-blue-500/40 bg-background/70 px-2.5 py-1 text-xs font-medium text-blue-300'>
          Active: {activeStepSummary.stepLabel}
        </span>
      ) : null}
    </div>
  );
}

const COUNT_BADGE_TONE_CLASSES = {
  default: 'border-border/60',
  destructive: 'border-destructive/40 text-destructive',
  warning: 'border-amber-500/40 text-amber-300',
} as const;

function OptionalCountBadge(props: {
  count: number;
  singular: string;
  plural: string;
  tone?: keyof typeof COUNT_BADGE_TONE_CLASSES;
}): React.JSX.Element | null {
  if (props.count <= 0) return null;
  const toneClass = COUNT_BADGE_TONE_CLASSES[props.tone ?? 'default'];
  return (
    <span
      className={`inline-flex items-center rounded-md border bg-background/70 px-2.5 py-1 text-xs font-medium ${toneClass}`}
    >
      {props.count} {props.count === 1 ? props.singular : props.plural}
    </span>
  );
}

function OptionalRetryBadge(props: { count: number }): React.JSX.Element | null {
  if (props.count <= 0) return null;
  return (
    <span className='inline-flex items-center rounded-md border border-amber-500/40 bg-background/70 px-2.5 py-1 text-xs font-medium text-amber-300'>
      {props.count} retr{props.count === 1 ? 'y' : 'ies'}
    </span>
  );
}

export function ProductScanSteps(props: { steps: ProductScanStep[] }): React.JSX.Element {
  const groupedSteps = buildGroupedProductScanSteps(props.steps);
  const stats = buildProductScanStepsStats(props.steps);
  const continuationContexts = resolveContinuationContexts(props.steps);

  return (
    <div className='space-y-2 rounded-md border border-border/60 bg-muted/20 px-3 py-3'>
      <ProductScanStepsSummaryBadges steps={props.steps} stats={stats} />
      {groupedSteps.map((group, index) => (
        <ProductScanStepGroup
          key={`${group.group}-${index}`}
          group={group.group}
          steps={group.steps}
          continuationContexts={continuationContexts}
        />
      ))}
    </div>
  );
}
