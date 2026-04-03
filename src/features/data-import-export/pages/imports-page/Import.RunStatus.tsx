'use client';

import React from 'react';
import {
  Button,
  FormSection,
  Hint,
  StatusBadge,
} from '@/shared/ui';
import {
  useImportExportActions,
  useImportExportData,
} from '@/features/data-import-export/context/ImportExportContext';
import type { BaseImportItemRecord } from '@/shared/contracts/integrations';
import {
  getImportRunErrorItems,
  getParameterSyncHistoryItems,
  hasRetryableImportItems,
  resolveImportRunParameterImportSummary,
} from './Import.RunStatus.helpers';

export function ImportRunStatusSection(): React.JSX.Element | null {
  const { activeImportRun, loadingImportRun } = useImportExportData();
  const { importing, handleResumeImport, handleCancelImport, handleDownloadImportReport } =
    useImportExportActions();

  const activeRun = activeImportRun?.run ?? null;
  const activeRunStats = activeRun?.stats ?? null;
  const activeRunItems = activeImportRun?.items ?? [];

  const runHasRetryableItems = React.useMemo(
    (): boolean => hasRetryableImportItems(activeRunItems),
    [activeRunItems]
  );

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
