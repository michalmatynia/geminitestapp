'use client';

import React from 'react';

import type {
  ProductValidationPattern,
  ProductValidationSemanticState,
} from '@/shared/contracts/products';
import { getProductValidationSemanticOperationUiMetadata } from '@/shared/lib/products/utils/validator-semantic-operations';
import {
  describeProductValidationSemanticAuditRecord,
  getProductValidationSemanticAuditRecordKey,
  getProductValidationSemanticAuditHistory,
} from '@/shared/lib/products/utils/validator-semantic-state';
import { Button } from '@/shared/ui/button';

import { cn } from '@/shared/utils';

const SEMANTIC_AUDIT_SOURCE_LABELS = {
  manual_save: 'Manual Save',
  import: 'Import',
  template: 'Template',
} as const;

const SEMANTIC_AUDIT_TRIGGER_LABELS = {
  create: 'Create',
  update: 'Update',
} as const;

const SEMANTIC_AUDIT_TRANSITION_TONE = {
  none: 'border-slate-500/30 bg-slate-500/10 text-slate-200',
  recognized: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  cleared: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  preserved: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  updated: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200',
  migrated: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200',
} as const;

const formatSemanticAuditTimestamp = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
};

const resolveSemanticOperationTitle = (
  semanticState: ProductValidationSemanticState | null
): string => {
  if (!semanticState) return 'Generic Rule';
  return (
    getProductValidationSemanticOperationUiMetadata(semanticState.operation)?.title ??
    semanticState.operation
  );
};

export function ValidatorPatternSemanticHistoryPanel({
  pattern,
  focusedAuditKey = null,
  focusRequestId = 0,
  onClose,
}: {
  pattern: ProductValidationPattern;
  focusedAuditKey?: string | null;
  focusRequestId?: number;
  onClose?: (() => void) | undefined;
}): React.JSX.Element {
  const historyEntries = React.useMemo(() => getProductValidationSemanticAuditHistory(pattern), [pattern]);
  const currentSemanticTitle = React.useMemo(
    () => resolveSemanticOperationTitle(pattern.semanticState ?? null),
    [pattern.semanticState]
  );
  const entryRefs = React.useRef(new Map<string, HTMLDivElement | null>());

  React.useEffect(() => {
    if (!focusedAuditKey) return;
    const target = entryRefs.current.get(focusedAuditKey);
    target?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [focusRequestId, focusedAuditKey]);

  return (
    <section className='mt-3 w-full min-w-0 overflow-hidden rounded-md border border-border/60 bg-background/20 p-3'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0 flex-1 space-y-1'>
          <h3 className='text-sm font-semibold text-foreground'>Semantic History</h3>
          <p className='break-words text-xs text-muted-foreground'>
            Selected pattern:{' '}
            <span className='font-medium text-foreground break-words'>{pattern.label}</span>
          </p>
        </div>
        <div className='flex max-w-full flex-wrap items-center justify-end gap-2'>
          <span className='max-w-full break-words rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-200'>
            Current: {currentSemanticTitle}
          </span>
          {onClose ? (
            <Button
              type='button'
              variant='ghost'
              size='xs'
              onClick={onClose}
              className='h-7 shrink-0'
            >
              Close History
            </Button>
          ) : null}
        </div>
      </div>

      {historyEntries.length === 0 ? (
        <p className='mt-3 text-sm text-muted-foreground'>
          No semantic audit history recorded for this rule yet.
        </p>
      ) : (
        <div className='mt-3 min-w-0 space-y-2'>
          {historyEntries.map((entry, index) => (
            <div
              key={`${entry.recordedAt}-${entry.source}-${entry.trigger}-${index}`}
              ref={(element) => {
                entryRefs.current.set(getProductValidationSemanticAuditRecordKey(entry), element);
              }}
              className={cn(
                'min-w-0 overflow-hidden rounded-md border border-border/50 bg-black/20 p-3 transition',
                focusedAuditKey === getProductValidationSemanticAuditRecordKey(entry) &&
                  'border-sky-500/50 bg-sky-500/10 ring-1 ring-sky-500/40'
              )}
            >
              <div className='flex min-w-0 flex-wrap items-center gap-2 text-[11px]'>
                <span className='text-slate-300'>{formatSemanticAuditTimestamp(entry.recordedAt)}</span>
                <span className='rounded border border-border/60 px-2 py-0.5 text-slate-200'>
                  {SEMANTIC_AUDIT_SOURCE_LABELS[entry.source]}
                </span>
                <span className='rounded border border-border/60 px-2 py-0.5 text-slate-200'>
                  {SEMANTIC_AUDIT_TRIGGER_LABELS[entry.trigger]}
                </span>
                <span
                  className={`rounded border px-2 py-0.5 font-medium ${
                    SEMANTIC_AUDIT_TRANSITION_TONE[entry.transition]
                  }`}
                >
                  {entry.transition}
                </span>
              </div>

              <p className='mt-2 break-words text-sm text-slate-100'>
                {describeProductValidationSemanticAuditRecord(entry) ?? 'Semantic audit recorded.'}
              </p>

              <div className='mt-2 grid min-w-0 gap-2 text-[11px] text-slate-300 md:grid-cols-2'>
                <p className='break-words'>
                  <span className='font-medium text-slate-100'>Previous:</span>{' '}
                  {resolveSemanticOperationTitle(entry.previous)}
                </p>
                <p className='break-words'>
                  <span className='font-medium text-slate-100'>Current:</span>{' '}
                  {resolveSemanticOperationTitle(entry.current)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
