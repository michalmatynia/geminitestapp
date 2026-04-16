'use client';

import React from 'react';
import type { ProductScanSupplierEvaluation } from '@/shared/contracts/product-scans';
import { buildProductScan1688SectionId, formatTimestamp, formatConfidence, buildInlineSummary } from './ProductScan1688Details.helpers';
import { ProductScan1688DetailRow } from './ProductScan1688DetailRow';

type ProductScan1688EvaluationSummaryProps = {
  scanId: string | null;
  evaluation: ProductScanSupplierEvaluation | null;
};

function resolveStatusLabel(status: string): string {
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  if (status === 'failed') return 'Failed';
  return 'Skipped';
}

function resolveProductMatchSummary(evaluation: ProductScanSupplierEvaluation): string | null {
  const { sameProduct, imageMatch, titleMatch } = evaluation;
  let same: string | null = null;
  if (sameProduct === true) same = 'Same product';
  else if (sameProduct === false) same = 'Different product';
  
  let img: string | null = null;
  if (imageMatch === true) img = 'Image match';
  else if (imageMatch === false) img = 'Image mismatch';
  
  let title: string | null = null;
  if (titleMatch === true) title = 'Title match';
  else if (titleMatch === false) title = 'Title mismatch';
  
  return buildInlineSummary(same, img, title);
}

function resolveSummaryText(evaluation: ProductScanSupplierEvaluation): string | null {
  const confidence = formatConfidence(evaluation.confidence);
  const model = (evaluation.modelId !== null && evaluation.modelId !== undefined) ? `Evaluator ${evaluation.modelId}` : null;
  const conf = (confidence !== null) ? `Confidence ${confidence}` : null;
  const match = resolveProductMatchSummary(evaluation);
  
  return buildInlineSummary(model, conf, match);
}

function resolveEvaluatedAt(evalAt: string | null | undefined): string | null {
  if (typeof evalAt === 'string' && evalAt !== '') return evalAt;
  return null;
}

export function ProductScan1688EvaluationSummary({ scanId, evaluation }: ProductScan1688EvaluationSummaryProps): React.JSX.Element {
  if (evaluation === null) return <p className='text-sm text-muted-foreground'>No supplier evaluation was stored for this run.</p>;

  const summary = resolveSummaryText(evaluation);
  const evalAt = resolveEvaluatedAt(evaluation.evaluatedAt);

  return (
    <div id={buildProductScan1688SectionId(scanId, 'match-evaluation') ?? undefined} className='space-y-2'>
      <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>Match evaluation</p>
      <div className='space-y-2 rounded-md border border-border/40 bg-muted/10 px-3 py-2 text-sm'>
        <p className='font-medium text-foreground'>{resolveStatusLabel(evaluation.status)}</p>
        {summary !== null && <p className='text-muted-foreground'>{summary}</p>}
        <div className='grid gap-2 sm:grid-cols-2'>
          <ProductScan1688DetailRow label='Proceed' value={String(evaluation.proceed)} />
          <ProductScan1688DetailRow label='Evaluated at' value={formatTimestamp(evalAt)} />
        </div>
        {evaluation.reasons.length > 0 && (
          <div className='space-y-1'>
            <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>Reasons</p>
            <ul className='list-disc space-y-1 pl-5 text-muted-foreground'>
              {evaluation.reasons.map((r, i) => <li key={`${r}-${i}`}>{r}</li>)}
            </ul>
          </div>
        )}
        {evaluation.mismatches.length > 0 && (
          <div className='space-y-1'>
            <p className='text-[11px] font-medium uppercase tracking-wide text-destructive'>Mismatches</p>
            <ul className='list-disc space-y-1 pl-5 text-destructive'>
              {evaluation.mismatches.map((m, i) => <li key={`${m}-${i}`}>{m}</li>)}
            </ul>
          </div>
        )}
        {(typeof evaluation.error === 'string' && evaluation.error !== '') ? <p className='text-destructive'>{evaluation.error}</p> : null}
      </div>
    </div>
  );
}
