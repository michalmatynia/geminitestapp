import React from 'react';
import {
  FormSection,
  Hint,
  StatusBadge,
} from '@/shared/ui';
import {
  useImportExportData,
} from '@/features/data-import-export/context/ImportExportContext';
import type { BaseImportPreflightIssue } from '@/shared/contracts/integrations';

export function ImportLastResultSection(): React.JSX.Element | null {
  const { lastResult, activeImportRunId } = useImportExportData();

  if (!lastResult) return null;

  return (
    <FormSection title='Last import summary' className='p-4'>
      <div className='flex items-center gap-2 mt-1'>
        <span className='text-sm text-gray-300'>Run {lastResult.runId} is</span>
        <StatusBadge status={lastResult.status} className='font-bold' />
      </div>
      {lastResult.summaryMessage ? (
        <p className='mt-1 text-xs text-gray-400'>{lastResult.summaryMessage}</p>
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
