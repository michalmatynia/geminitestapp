'use client';

import Link from 'next/link';
import React from 'react';
import { FormSection, Hint } from '@/shared/ui/forms-and-actions.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import {
  useImportExportData,
} from '@/features/data-import-export/context/ImportExportContext';
import type { BaseImportPreflightIssue } from '@/shared/contracts/integrations/base-com';
import { getImportResultDisplaySummary, resolveLiveImportResult } from '@/features/data-import-export/utils/import-run-feedback';

export function ImportLastResultSection(): React.JSX.Element | null {
  const { lastResult, activeImportRunId, activeImportRun } = useImportExportData();

  if (!lastResult) return null;

  const activeRun = activeImportRun?.run ?? null;
  const effectiveResult = React.useMemo(
    () => resolveLiveImportResult(lastResult, activeRun),
    [activeRun, lastResult]
  );
  const displaySummary = getImportResultDisplaySummary(effectiveResult);
  const runFailure =
    activeRun?.id === effectiveResult.runId
      ? {
          errorCode: activeRun.errorCode ?? null,
          error: activeRun.error ?? null,
        }
      : null;
  const directTargetLabel =
    activeRun?.id === effectiveResult.runId && activeRun?.params?.directTarget
      ? activeRun.params.directTarget.type === 'sku'
        ? `SKU ${activeRun.params.directTarget.value}`
        : `Base Product ID ${activeRun.params.directTarget.value}`
      : null;

  return (
    <FormSection title='Last import summary' className='p-4'>
      <div className='flex items-center gap-2 mt-1'>
        <span className='text-sm text-gray-300'>Run {effectiveResult.runId} is</span>
        <StatusBadge status={effectiveResult.status} className='font-bold' />
      </div>
      {effectiveResult.summaryMessage ? (
        <p className='mt-1 text-xs text-gray-400'>{effectiveResult.summaryMessage}</p>
      ) : null}
      <div className='mt-2 space-y-1 text-xs text-gray-400'>
        <p>
          Dispatch mode:{' '}
          <span className='font-mono text-gray-200'>{displaySummary.dispatchModeLabel}</span>
        </p>
        <p>
          Queue job: <span className='font-mono text-gray-200'>{displaySummary.queueJobLabel}</span>
        </p>
        {directTargetLabel ? (
          <p>
            Exact target: <span className='font-mono text-cyan-200'>{directTargetLabel}</span>
          </p>
        ) : null}
        <div className='flex flex-wrap items-center gap-x-3 gap-y-1 pt-1'>
          <Link
            href={`/admin/ai-paths/queue?tab=product-imports&query=${encodeURIComponent(effectiveResult.runId)}`}
            className='text-cyan-300 hover:text-cyan-200'
          >
            View in Runtime Queue
          </Link>
          <Link
            href={`/api/v2/integrations/imports/base/runs/${encodeURIComponent(effectiveResult.runId)}?includeItems=true&page=1&pageSize=250`}
            target='_blank'
            rel='noreferrer'
            className='text-gray-300 hover:text-white'
          >
            Open JSON detail
          </Link>
        </div>
      </div>
      {displaySummary.explanation ? (
        <p className='mt-2 text-xs text-amber-300'>{displaySummary.explanation}</p>
      ) : null}
      {directTargetLabel ? (
        <p className='mt-1 text-xs text-cyan-300'>
          Exact target runs always create a new product and attach a Base.com connection to it.
        </p>
      ) : null}
      {runFailure?.errorCode || runFailure?.error ? (
        <div className='mt-3 rounded-md border border-rose-500/30 bg-rose-950/20 p-3'>
          <p className='text-[11px] font-semibold uppercase tracking-wider text-rose-200'>
            Latest failure
          </p>
          <div className='mt-2 space-y-1 text-xs text-gray-300'>
            {runFailure.errorCode ? (
              <p>
                Error code: <span className='font-mono text-rose-200'>{runFailure.errorCode}</span>
              </p>
            ) : null}
            {runFailure.error ? <p>{runFailure.error}</p> : null}
          </div>
        </div>
      ) : null}
      {(effectiveResult.preflight?.issues?.length ?? 0) > 0 ? (
        <div className='mt-3 space-y-1 text-xs text-gray-400'>
          {effectiveResult.preflight?.issues?.map((issue: BaseImportPreflightIssue, index: number) => (
            <p key={`${issue.code}-${index}`}>• {issue.message}</p>
          ))}
        </div>
      ) : null}
      {activeImportRunId ? (
        <Hint className='mt-2 font-mono'>Active run: {activeImportRunId}</Hint>
      ) : null}
    </FormSection>
  );
}
