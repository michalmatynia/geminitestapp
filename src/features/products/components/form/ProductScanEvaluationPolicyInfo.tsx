'use client';

import React from 'react';
import type { resolveProductScanEvaluationPolicySummary } from '@/features/products/components/scans/ProductScanSteps';

type ProductScanEvaluationPolicyInfoProps = {
  summary: ReturnType<typeof resolveProductScanEvaluationPolicySummary>;
};

function EvaluationPolicyBadges({ summary }: { summary: NonNullable<ReturnType<typeof resolveProductScanEvaluationPolicySummary>> }): React.JSX.Element {
  const {
    executionLabel,
    modelSource,
    thresholdLabel,
    scopeLabel,
    similarityDecisionLabel,
    languageGateLabel,
    languageDetectionLabel,
  } = summary;

  const badges = [
    executionLabel,
    modelSource,
    thresholdLabel,
    scopeLabel,
    similarityDecisionLabel,
    languageGateLabel,
    languageDetectionLabel,
  ].filter((b): b is string => b !== null);

  return (
    <div className='flex flex-wrap items-center gap-2 text-xs'>
      <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>AI policy</span>
      {badges.map((badge, i) => (
        <span key={i} className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
          {badge}
        </span>
      ))}
    </div>
  );
}

export function ProductScanEvaluationPolicyInfo({ summary }: ProductScanEvaluationPolicyInfoProps): React.JSX.Element | null {
  if (summary === null) return null;

  return (
    <div className='space-y-1 rounded-md border border-border/40 bg-muted/20 px-3 py-2'>
      <EvaluationPolicyBadges summary={summary} />
      {summary.modelLabel !== null ? (
        <p className='text-[11px] text-muted-foreground'>Model {summary.modelLabel}</p>
      ) : null}
    </div>
  );
}
