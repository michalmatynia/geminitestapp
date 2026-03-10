'use client';

import React, { useMemo } from 'react';

import {
  useImportExportActions,
  useImportExportData,
} from '@/features/data-import-export/context/ImportExportContext';
import type { BaseImportItemRecord } from '@/shared/contracts/integrations';
import { Button, FormSection, Hint, StatusBadge } from '@/shared/ui';

export function ImportRunStatusSection(): React.JSX.Element | null {
  const { activeImportRun, loadingImportRun } = useImportExportData();
  const { importing, handleResumeImport, handleCancelImport, handleDownloadImportReport } =
    useImportExportActions();

  const activeRun = activeImportRun?.run ?? null;
  const activeRunStats = activeRun?.stats ?? null;

  const runHasRetryableItems = useMemo(
    (): boolean =>
      Boolean(
        activeImportRun?.items.some(
          (item: BaseImportItemRecord) => item.status === 'failed' || item.status === 'pending'
        )
      ),
    [activeImportRun?.items]
  );

  const runErrorItems = useMemo(
    () =>
      (activeImportRun?.items ?? [])
        .filter((item: BaseImportItemRecord) => item.status === 'failed' || item.errorMessage)
        .slice(0, 10),
    [activeImportRun?.items]
  );

  const activeRunParameterImportSummary = useMemo(() => {
    const fromRun = activeRun?.stats?.parameterImportSummary;
    if (
      fromRun &&
      (fromRun.itemsApplied > 0 ||
        fromRun.extracted > 0 ||
        fromRun.resolved > 0 ||
        fromRun.created > 0 ||
        fromRun.written > 0)
    ) {
      return fromRun;
    }
    const items = activeImportRun?.items ?? [];
    if (items.length === 0) return null;
    const aggregated = items.reduce(
      (
        acc: {
          itemsApplied: number;
          extracted: number;
          resolved: number;
          created: number;
          written: number;
        },
        item: BaseImportItemRecord
      ) => {
        const summary = item.parameterImportSummary;
        if (!summary) return acc;
        const extracted =
          typeof summary.extracted === 'number' && Number.isFinite(summary.extracted)
            ? Math.max(0, Math.floor(summary.extracted))
            : 0;
        const resolved =
          typeof summary.resolved === 'number' && Number.isFinite(summary.resolved)
            ? Math.max(0, Math.floor(summary.resolved))
            : 0;
        const created =
          typeof summary.created === 'number' && Number.isFinite(summary.created)
            ? Math.max(0, Math.floor(summary.created))
            : 0;
        const written =
          typeof summary.written === 'number' && Number.isFinite(summary.written)
            ? Math.max(0, Math.floor(summary.written))
            : 0;
        return {
          itemsApplied: acc.itemsApplied + 1,
          extracted: acc.extracted + extracted,
          resolved: acc.resolved + resolved,
          created: acc.created + created,
          written: acc.written + written,
        };
      },
      {
        itemsApplied: 0,
        extracted: 0,
        resolved: 0,
        created: 0,
        written: 0,
      }
    );
    if (
      aggregated.itemsApplied === 0 &&
      aggregated.extracted === 0 &&
      aggregated.resolved === 0 &&
      aggregated.created === 0 &&
      aggregated.written === 0
    ) {
      return null;
    }
    return aggregated;
  }, [activeImportRun?.items, activeRun?.stats?.parameterImportSummary]);

  const parameterSyncHistoryItems = useMemo(
    () =>
      (activeImportRun?.items ?? [])
        .filter((item: BaseImportItemRecord) => Boolean(item.parameterImportSummary))
        .sort((a: BaseImportItemRecord, b: BaseImportItemRecord) => {
          const aTime = Date.parse(a.finishedAt ?? a.updatedAt ?? '');
          const bTime = Date.parse(b.finishedAt ?? b.updatedAt ?? '');
          if (!Number.isFinite(aTime) && !Number.isFinite(bTime)) return 0;
          if (!Number.isFinite(aTime)) return 1;
          if (!Number.isFinite(bTime)) return -1;
          return bTime - aTime;
        })
        .slice(0, 8),
    [activeImportRun?.items]
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
      {activeRun.summaryMessage ? (
        <p className='mt-2 text-xs text-gray-400'>{activeRun.summaryMessage}</p>
      ) : null}
      {loadingImportRun ? <Hint className='mt-2'>Refreshing run status...</Hint> : null}
      {runErrorItems.length > 0 ? (
        <div className='mt-3 space-y-1 text-xs text-gray-400'>
          {runErrorItems.map((item: BaseImportItemRecord) => (
            <p key={`${item.itemId}-${item.attempt}`}>
              • {item.errorMessage || 'Import failed'}
              {item.sku ? ` (SKU: ${item.sku})` : ''}
            </p>
          ))}
        </div>
      ) : null}
    </FormSection>
  );
}
