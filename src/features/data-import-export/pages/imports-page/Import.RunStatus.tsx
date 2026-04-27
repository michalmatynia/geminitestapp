/* eslint-disable complexity, max-lines, max-lines-per-function, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, no-void, no-nested-ternary */
'use client';

import Link from 'next/link';
import React from 'react';
import { Button } from '@/shared/ui/primitives.public';
import { FormSection, Hint } from '@/shared/ui/forms-and-actions.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import {
  useImportExportActions,
  useImportExportData,
} from '@/features/data-import-export/context/ImportExportContext';
import type { BaseImportItemRecord } from '@/shared/contracts/integrations/base-com';
import {
  buildCustomFieldImportSummaryFromItems,
  formatCustomFieldImportHistory,
  getImportRunErrorItems,
  getCustomFieldImportHistoryItems,
  getParameterSyncHistoryItems,
  hasRetryableImportItems,
  resolveImportRunDispatchDiagnostics,
  resolveImportRunParameterImportSummary,
  resolveImportRunRetryDiagnostics,
} from './Import.RunStatus.helpers';

export function ImportRunStatusSection(): React.JSX.Element | null {
  const { activeImportRun, loadingImportRun } = useImportExportData();
  const { importing, handleResumeImport, handleCancelImport, handleDownloadImportReport } =
    useImportExportActions();

  const activeRun = activeImportRun?.run ?? null;
  const activeRunStats = activeRun?.stats ?? null;
  const activeRunItems = activeImportRun?.items ?? [];
  const directTargetLabel = React.useMemo(() => {
    const directTarget = activeRun?.params?.directTarget;
    if (!directTarget) {
      return null;
    }

    return directTarget.type === 'sku'
      ? `SKU ${directTarget.value}`
      : `Base Product ID ${directTarget.value}`;
  }, [activeRun?.params?.directTarget]);

  const runHasRetryableItems = React.useMemo(
    (): boolean => hasRetryableImportItems(activeRunItems),
    [activeRunItems]
  );
  const resumeScope = React.useMemo(() => {
    const failed = activeRunItems.filter((item: BaseImportItemRecord) => item.status === 'failed');
    const pending = activeRunItems.filter((item: BaseImportItemRecord) => item.status === 'pending');
    const retryableFailed = failed.filter((item: BaseImportItemRecord) => item.retryable === true);
    return {
      failedCount: failed.length,
      pendingCount: pending.length,
      retryableFailedCount: retryableFailed.length,
      resumableCount: failed.length + pending.length,
    };
  }, [activeRunItems]);

  const runErrorItems = React.useMemo(
    (): BaseImportItemRecord[] => getImportRunErrorItems(activeRunItems),
    [activeRunItems]
  );

  const activeRunParameterImportSummary = React.useMemo(
    () =>
      resolveImportRunParameterImportSummary(activeRun?.stats?.parameterImportSummary, activeRunItems),
    [activeRun?.stats?.parameterImportSummary, activeRunItems]
  );

  const parameterSyncHistoryItems = React.useMemo(
    (): BaseImportItemRecord[] => getParameterSyncHistoryItems(activeRunItems),
    [activeRunItems]
  );

  const activeRunCustomFieldImportSummary = React.useMemo(
    () => buildCustomFieldImportSummaryFromItems(activeRunItems),
    [activeRunItems]
  );

  const activeRunDispatchDiagnostics = React.useMemo(
    () => {
      if (!activeRun) {
        return null;
      }
      return resolveImportRunDispatchDiagnostics(activeRun);
    },
    [activeRun]
  );

  const activeRunRetryDiagnostics = React.useMemo(
    () => resolveImportRunRetryDiagnostics(activeRunItems),
    [activeRunItems]
  );

  const customFieldImportHistoryItems = React.useMemo(
    (): BaseImportItemRecord[] => getCustomFieldImportHistoryItems(activeRunItems),
    [activeRunItems]
  );

  if (!activeRun) return null;

  return (
    <FormSection
      title='Import run'
      subtitle={activeRun.id}
      className='p-4'
      actions={
        <div className='flex items-center gap-2'>
          <StatusBadge status={activeRun.status} className='font-bold' />
          <Button
            type='button'
            variant='secondary'
            size='sm'
            onClick={(): void => {
              void handleResumeImport();
            }}
            disabled={!runHasRetryableItems || importing}
          >
            Resume failed
          </Button>
          <Button
            type='button'
            variant='secondary'
            size='sm'
            onClick={(): void => {
              void handleCancelImport();
            }}
            disabled={
              !(activeRun.status === 'queued' || activeRun.status === 'running') || importing
            }
          >
            Cancel run
          </Button>
          <Button type='button' variant='secondary' size='sm' onClick={handleDownloadImportReport}>
            Download report
          </Button>
        </div>
      }
    >
      {activeRunStats ? (
        <p className='mt-1 text-sm text-gray-300'>
          Total {activeRunStats.total} · Imported {activeRunStats.imported} · Updated{' '}
          {activeRunStats.updated} · Skipped {activeRunStats.skipped} · Failed{' '}
          {activeRunStats.failed} · Pending {activeRunStats.pending}
        </p>
      ) : null}
      {resumeScope.resumableCount > 0 ? (
        <div className='mt-2 rounded-md border border-border/60 bg-gray-950/30 p-3 text-xs text-gray-300'>
          <p className='font-semibold text-gray-200'>Resume scope</p>
          <p className='mt-1'>
            <span className='font-mono text-gray-200'>Resume failed</span> will requeue{' '}
            {resumeScope.resumableCount} item
            {resumeScope.resumableCount === 1 ? '' : 's'} from this run.
          </p>
          <p className='mt-1 text-gray-400'>
            Failed {resumeScope.failedCount} · Pending {resumeScope.pendingCount} · Marked retryable{' '}
            {resumeScope.retryableFailedCount}
          </p>
        </div>
      ) : null}
      <div className='mt-2 space-y-1 text-xs text-gray-400'>
        <p>
          Dispatch mode:{' '}
          <span className='font-mono text-gray-200'>
            {activeRun.dispatchMode === 'queued'
              ? 'queued (base-import runtime queue)'
              : activeRun.dispatchMode === 'inline'
                ? 'inline fallback'
                : 'not dispatched'}
          </span>
        </p>
        <p>
          Queue job:{' '}
          <span className='font-mono text-gray-200'>{activeRun.queueJobId || 'not assigned'}</span>
        </p>
        {directTargetLabel ? (
          <>
            <p>
              Exact target: <span className='font-mono text-cyan-200'>{directTargetLabel}</span>
            </p>
            <p className='text-cyan-300'>
              Exact target runs always create a new product and attach a Base.com connection to it.
            </p>
          </>
        ) : null}
        {activeRun.dispatchMode === 'inline' ? (
          <p className='text-amber-300'>
            This run is not visible in the AI Paths queue. Base imports use the separate
            `base-import` runtime queue and can fall back to inline processing when Redis queueing
            is unavailable.
          </p>
        ) : null}
        <div className='flex flex-wrap items-center gap-x-3 gap-y-1 pt-1'>
          <Link
            href={`/admin/ai-paths/queue?tab=product-imports&query=${encodeURIComponent(activeRun.id)}`}
            className='text-cyan-300 hover:text-cyan-200'
          >
            View in Runtime Queue
          </Link>
          <Link
            href={`/api/v2/integrations/imports/base/runs/${encodeURIComponent(activeRun.id)}?includeItems=true&page=1&pageSize=250`}
            target='_blank'
            rel='noopener noreferrer'
            className='text-gray-300 hover:text-white'
          >
            Open JSON detail
          </Link>
        </div>
      </div>
      {activeRunDispatchDiagnostics ? (
        <div
          className={
            activeRunDispatchDiagnostics.tone === 'error'
              ? 'mt-3 rounded-md border border-rose-500/30 bg-rose-950/20 p-3'
              : 'mt-3 rounded-md border border-amber-500/30 bg-amber-950/20 p-3'
          }
        >
          <p
            className={
              activeRunDispatchDiagnostics.tone === 'error'
                ? 'text-[11px] font-semibold uppercase tracking-wider text-rose-200'
                : 'text-[11px] font-semibold uppercase tracking-wider text-amber-200'
            }
          >
            {activeRunDispatchDiagnostics.title}
          </p>
          <div className='mt-2 space-y-1 text-xs text-gray-300'>
            {activeRunDispatchDiagnostics.details.map((detail: string) => (
              <p key={detail}>{detail}</p>
            ))}
          </div>
        </div>
      ) : null}
      {activeRunRetryDiagnostics ? (
        <div className='mt-3 rounded-md border border-sky-500/30 bg-sky-950/20 p-3'>
          <p className='text-[11px] font-semibold uppercase tracking-wider text-sky-200'>
            Automatic retries
          </p>
          <div className='mt-2 space-y-1 text-xs text-gray-300'>
            <p>
              {activeRunRetryDiagnostics.scheduledCount} item
              {activeRunRetryDiagnostics.scheduledCount === 1 ? '' : 's'} currently waiting for the
              next retry window.
            </p>
            {activeRunRetryDiagnostics.nextRetryAt ? (
              <p>
                Next scheduled retry:{' '}
                <span className='font-mono text-sky-200'>
                  {activeRunRetryDiagnostics.nextRetryAt}
                </span>
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      {activeRun.errorCode || activeRun.error ? (
        <div className='mt-3 rounded-md border border-rose-500/30 bg-rose-950/20 p-3'>
          <p className='text-[11px] font-semibold uppercase tracking-wider text-rose-200'>
            Latest failure
          </p>
          <div className='mt-2 space-y-1 text-xs text-gray-300'>
            {activeRun.errorCode ? (
              <p>
                Error code: <span className='font-mono text-rose-200'>{activeRun.errorCode}</span>
              </p>
            ) : null}
            {activeRun.error ? <p>{activeRun.error}</p> : null}
          </div>
        </div>
      ) : null}
      {activeRunParameterImportSummary ? (
        <div className='mt-3 rounded-md border border-border/60 bg-gray-950/30 p-3'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <p className='text-[11px] font-semibold uppercase tracking-wider text-gray-300'>
              Parameter sync
            </p>
            <span className='text-[11px] text-gray-400'>
              Items applied: {activeRunParameterImportSummary.itemsApplied}
            </span>
          </div>
          <p className='mt-1 text-xs text-gray-300'>
            Extracted {activeRunParameterImportSummary.extracted} · Resolved{' '}
            {activeRunParameterImportSummary.resolved} · Created{' '}
            {activeRunParameterImportSummary.created} · Written{' '}
            {activeRunParameterImportSummary.written}
          </p>
          {parameterSyncHistoryItems.length > 0 ? (
            <div className='mt-2 space-y-1'>
              {parameterSyncHistoryItems.map((item: BaseImportItemRecord) => (
                <p
                  key={`${item.itemId}-${item.attempt}-parameter-sync`}
                  className='text-[11px] text-gray-400 font-mono truncate'
                >
                  {item.itemId}
                  {item.sku ? ` (${item.sku})` : ''} · e:
                  {item.parameterImportSummary?.extracted ?? 0} · r:
                  {item.parameterImportSummary?.resolved ?? 0} · c:
                  {item.parameterImportSummary?.created ?? 0} · w:
                  {item.parameterImportSummary?.written ?? 0}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {activeRunCustomFieldImportSummary ? (
        <div className='mt-3 rounded-md border border-border/60 bg-gray-950/30 p-3'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <p className='text-[11px] font-semibold uppercase tracking-wider text-gray-300'>
              Custom field import
            </p>
            <span className='text-[11px] text-gray-400'>
              Items with activity: {activeRunCustomFieldImportSummary.itemsApplied}
            </span>
          </div>
          <p className='mt-1 text-xs text-gray-300'>
            Seeded fields {activeRunCustomFieldImportSummary.seeded} · Auto-matched fields{' '}
            {activeRunCustomFieldImportSummary.autoMatched} · Explicitly mapped fields{' '}
            {activeRunCustomFieldImportSummary.explicitMapped} · Skipped fields{' '}
            {activeRunCustomFieldImportSummary.skipped} · Overridden fields{' '}
            {activeRunCustomFieldImportSummary.overridden}
          </p>
          {customFieldImportHistoryItems.length > 0 ? (
            <div className='mt-2 space-y-1'>
              {customFieldImportHistoryItems.map((item: BaseImportItemRecord) => {
                const history = formatCustomFieldImportHistory(item);
                if (!history) return null;
                return (
                  <p
                    key={`${item.itemId}-${item.attempt}-custom-field-import`}
                    className='text-[11px] text-gray-400 font-mono truncate'
                  >
                    {item.itemId}
                    {item.sku ? ` (${item.sku})` : ''} · {history}
                  </p>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
      {activeRun.summaryMessage ? (
        <p className='mt-2 text-xs text-gray-400'>{activeRun.summaryMessage}</p>
      ) : null}
      {loadingImportRun ? <Hint className='mt-2'>Refreshing run status...</Hint> : null}
      {runErrorItems.length > 0 ? (
        <div className='mt-3 rounded-md border border-rose-500/30 bg-rose-950/10 p-3'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <p className='text-[11px] font-semibold uppercase tracking-wider text-rose-200'>
              Recent failed items
            </p>
            <span className='text-[11px] text-gray-400'>
              Showing {runErrorItems.length}
              {activeRunStats && activeRunStats.failed > runErrorItems.length
                ? ` of ${activeRunStats.failed}`
                : ''}
            </span>
          </div>
          <div className='mt-2 space-y-2'>
            {runErrorItems.map((item: BaseImportItemRecord) => (
              <div
                key={`${item.itemId}-${item.attempt}`}
                className='rounded-md border border-white/10 bg-black/20 p-2'
              >
                <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-300'>
                  <span className='font-mono text-white'>{item.sku || item.itemId}</span>
                  {item.sku && item.itemId ? (
                    <span className='text-gray-500'>Item {item.itemId}</span>
                  ) : null}
                  <span>Attempt {item.attempt}</span>
                  {item.errorCode ? (
                    <span className='font-mono text-rose-200'>{item.errorCode}</span>
                  ) : null}
                  {item.errorClass ? (
                    <span className='uppercase text-amber-200'>{item.errorClass}</span>
                  ) : null}
                  {item.retryable === true ? (
                    <span className='text-amber-300'>Retryable</span>
                  ) : null}
                </div>
                <p className='mt-1 text-xs text-gray-300'>
                  {item.errorMessage || item.error || 'Import failed'}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </FormSection>
  );
}
