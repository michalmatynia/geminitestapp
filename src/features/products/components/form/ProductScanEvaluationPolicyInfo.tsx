'use client';

import React from 'react';
import type { resolveProductScanEvaluationPolicySummary } from '@/features/products/components/scans/ProductScanSteps';

type ProductScanEvaluationPolicyInfoProps = {
  summary: ReturnType<typeof resolveProductScanEvaluationPolicySummary>;
};

export function ProductScanEvaluationPolicyInfo({ summary }: ProductScanEvaluationPolicyInfoProps): React.JSX.Element | null {
  if (summary === null) return null;

  return (
    <div className='space-y-1 rounded-md border border-border/40 bg-muted/20 px-3 py-2'>
      <div className='flex flex-wrap items-center gap-2 text-xs'>
        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
          AI policy
        </span>
        {summary.executionLabel !== null ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
            {summary.executionLabel}
          </span>
        ) : null}
        {summary.modelSource !== null ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
            {summary.modelSource}
          </span>
        ) : null}
        {summary.thresholdLabel !== null ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
            {summary.thresholdLabel}
          </span>
        ) : null}
        {summary.scopeLabel !== null ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
            {summary.scopeLabel}
          </span>
        ) : null}
        {summary.similarityDecisionLabel !== null ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
            {summary.similarityDecisionLabel}
          </span>
        ) : null}
        {summary.languageGateLabel !== null ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
            {summary.languageGateLabel}
          </span>
        ) : null}
        {summary.languageDetectionLabel !== null ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
            {summary.languageDetectionLabel}
          </span>
        ) : null}
      </div>
      {summary.modelLabel !== null ? (
        <p className='text-[11px] text-muted-foreground'>
          Model {summary.modelLabel}
        </p>
      ) : null}
    </div>
  );
}
