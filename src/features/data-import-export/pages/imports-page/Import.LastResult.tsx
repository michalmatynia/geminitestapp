'use client';

import React from 'react';
import { FormSection, Hint } from '@/shared/ui/forms-and-actions.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import {
  useImportExportData,
} from '@/features/data-import-export/context/ImportExportContext';
import type { BaseImportPreflightIssue } from '@/shared/contracts/integrations/base-com';
import { getImportResultDisplaySummary } from '@/features/data-import-export/utils/import-run-feedback';

export function ImportLastResultSection(): React.JSX.Element | null {
  const { lastResult, activeImportRunId } = useImportExportData();

  if (!lastResult) return null;

  const displaySummary = getImportResultDisplaySummary(lastResult);

  return (
    <FormSection title='Last import summary' className='p-4'>
      <div className='flex items-center gap-2 mt-1'>
        <span className='text-sm text-gray-300'>Run {lastResult.runId} is</span>
        <StatusBadge status={lastResult.status} className='font-bold' />
      </div>
      {lastResult.summaryMessage ? (
        <p className='mt-1 text-xs text-gray-400'>{lastResult.summaryMessage}</p>
      ) : null}
      <div className='mt-2 space-y-1 text-xs text-gray-400'>
        <p>
          Dispatch mode:{' '}
          <span className='font-mono text-gray-200'>{displaySummary.dispatchModeLabel}</span>
        </p>
        <p>
          Queue job: <span className='font-mono text-gray-200'>{displaySummary.queueJobLabel}</span>
        </p>
      </div>
      {displaySummary.explanation ? (
        <p className='mt-2 text-xs text-amber-300'>{displaySummary.explanation}</p>
      ) : null}
      {(lastResult.preflight?.issues?.length ?? 0) > 0 ? (
        <div className='mt-3 space-y-1 text-xs text-gray-400'>
          {lastResult.preflight?.issues?.map((issue: BaseImportPreflightIssue, index: number) => (
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
